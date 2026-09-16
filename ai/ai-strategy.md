# AI STRATEGY — CyberPulse AI

| Field | Value |
|---|---|
| Version | 1.0 |
| Model version | `CyberPulse-Demo-v1` |
| Feature schema | `fs-1` |
| Related | `ai/model-selection.md`, `ai/evaluation-framework.md`, `ai/guardrails.md`, `docs/ml-pipeline.md` |

---

## 1. The AI Position

**There is no large language model anywhere in this system.** No generative model, no RAG pipeline, no prompt, no external inference API. This is a deliberate and load-bearing decision, not an omission.

The product's output is intelligence an officer may act on. Three properties are non-negotiable for that: the same input must produce the same output; the reasoning must be attributable to specific inputs; and the whole thing must be verifiable offline against a held-out set. A generative model satisfies none of the three well, and a tree ensemble satisfies all three exactly.

What the system has instead is a three-model tabular pipeline with exact per-prediction attributions.

---

## 2. AI Use Cases

| # | Use case | Approach | Output | Feature |
|---|---|---|---|---|
| AI-1 | Score the likelihood that a given cell is the cash-out location | XGBoost binary classifier over (complaint × candidate cell) pairs | Calibrated probability | FEAT-06 |
| AI-2 | Discover candidate cash-out cells | H3 k-ring generation + DBSCAN over historical withdrawals + KDE surface | Ranked candidate set | FEAT-07 |
| AI-3 | Predict the withdrawal time window | Multiclass classifier over twelve 2-hour bins | Bounded window + confidence | FEAT-08 |
| AI-4 | Explain each prediction | SHAP TreeExplainer, aggregated to named factors | ≥ 5 factors summing to 100% | FEAT-09 |

Everything else in the product is deterministic software. Risk-level thresholds, exposure computation, severity derivation, ranking blend weights and confidence rules are all explicit formulas, not learned. That boundary is intentional: a learned threshold would be one more thing that cannot be explained to an officer.

---

## 3. Problem Formulation

The single most consequential modelling decision (ADR-013).

**Rejected:** regress the withdrawal's latitude and longitude. Produces a point with no probability, no alternatives, and no natural accuracy metric an evaluator would recognise.

**Adopted:** binary classification over (complaint × candidate cell) pairs.

```
For complaint C, candidate cells H₁…Hₙ from k-ring and historical discovery:
  x_i     = features(C, H_i)
  y_i     = 1 if the actual withdrawal for C occurred in H_i within 24 h, else 0
  p_i     = P(y_i = 1 | x_i)
  ranking = sort by combined_score(p_i, priors) descending
```

This formulation gives, directly and without invention: calibrated probabilities, a top-k list, top-1/top-3/top-5 hit rate as the natural metric, per-candidate SHAP, and a UI that shows alternatives because the model actually produced them.

**Label definition.** `withdrawals.complaint_id` is the ground truth. It exists in the synthetic corpus and would be the hardest thing to obtain in production — a limitation stated plainly in `ai/evaluation-framework.md` §8 rather than buried.

---

## 4. Pipeline

```
Complaint ─┐
Chain txns ─┼─▶ features.py ─▶ 13-dim vector per candidate cell
Accounts   ─┤        │
Candidates ─┘        ├─▶ risk_model ─▶ p_i for every candidate
                     │        │
                     │        ├─▶ combined_score ─▶ ranked hotspots
                     │        │
                     │        └─▶ TreeExplainer (top cell) ─▶ named factors
                     │
                     └─▶ temporal_model ─▶ 12 bins ─▶ bounded window
```

One feature module serves training and inference. `training/features.py` is a **symlink** to `app/engine/features.py`, so train/serve skew is not a discipline problem — the two paths are the same file.

---

## 5. Features

Thirteen, in fixed order, all numeric. Full definitions in `FEATURE_SPECIFICATIONS.md` FEAT-05.

| Group | Features | What it captures |
|---|---|---|
| Behavioural | `txn_amount_total`, `txn_velocity_1h`, `recency_hours`, `withdrawal_count` | How fast and how much the money is moving |
| Network | `linked_account_count`, `linked_depth`, `prior_suspicious_flags` | Layering structure |
| Account | `account_age_days_min` | Freshly opened accounts behave differently |
| Spatial | `distance_km`, `atm_density`, `historical_hotspot_score` | Geography of the candidate cell |
| Temporal | `hour_of_day`, `day_of_week` | Cash-out timing rhythms |

No feature encodes an identity, a demographic attribute, or anything about a person. Every feature is a property of the money, the network or the geography. This is what makes it defensible to say the system predicts events rather than profiling people (`security/compliance.md` §3).

---

## 6. Why Not Deep Learning

| Consideration | Tree ensemble | Neural network |
|---|---|---|
| Tabular performance at 10⁴–10⁵ rows | Strong | Typically weaker |
| Training time | Seconds to minutes | Longer, more tuning |
| Explainability | Exact SHAP via TreeExplainer | Approximate methods only |
| Reproducibility | Deterministic with a fixed seed | Harder to pin exactly |
| Artefact size | ~40 MB, bakeable into an image | Larger |
| Inference latency | ~40 ms for 60 candidates | Higher |
| Defensibility to a non-technical reviewer | "It weighs these thirteen signals" | Considerably harder |

The source specification explicitly directs against overcomplicating with deep learning, and the technical case agrees with it. The last row is not a soft consideration — if an officer cannot be told what the model looked at, the product does not work regardless of its accuracy.

---

## 7. Explainability Strategy

Exactness matters here. LIME and other perturbation methods are approximate and **unstable across runs** — an officer who re-analyses a complaint and sees different reasons will, correctly, stop trusting the system. TreeExplainer gives exact Shapley values for tree ensembles, so the same input always yields the same explanation.

Raw features are aggregated into a closed set of officer-readable factor names, normalised so contributions sum to exactly 100%, each carrying a textual direction. `RiskFactor.name` is a **closed enum in the shared schema**, so a raw identifier such as `txn_velocity_1h` cannot reach the UI even by accident.

SHAP is computed for the top-ranked cell only. Sixty explanations would cost roughly 4 seconds for information nobody reads.

When SHAP fails, the prediction still returns with `explanationAvailable: false` and an explicit statement that the explanation could not be generated. A prediction is never described as explained when it is not.

---

## 8. Uncertainty

Three separate signals, because they mean different things.

| Signal | Meaning | Derivation |
|---|---|---|
| `riskScore` | How likely is this cell | Model probability |
| `confidence` | How clearly does the top cell separate from the second | Margin rule (`architecture/low-level-design.md` §4.4) |
| `windowConfidence` | How peaked is the temporal distribution | Bin probability spread |

Confidence is about **separation, not magnitude**. A top score of 0.92 with a second of 0.91 is not a confident prediction, and the rule says so. Conflating the two would be the most misleading simplification available, which is why the two fields are separate all the way from the model to the screen.

---

## 9. Model Governance

| Control | Implementation |
|---|---|
| Versioning | `CyberPulse-Demo-v1`, reported on every prediction, in Settings, and stored on every prediction row |
| Feature schema versioning | `fs-1`, asserted before every inference; a mismatch aborts rather than scoring a misaligned vector |
| Artefact provenance | Baked into the container image; version is a property of the image tag |
| Metric publication | Written to `model_metrics` by `evaluate.py`, read by `/reports`, never hard-coded |
| Release gate | `evaluate.py` exits non-zero below any gate; the release is blocked |
| Change record | Every `model_version` change requires a `Model` entry in `CHANGELOG.md` with before/after values for every gate |
| Reproducibility | Seed 26184 plus a pinned dependency set reproduces training exactly |

---

## 10. Honest Limitations

| Limitation | Consequence | Stated in |
|---|---|---|
| Trained on synthetic data | Metrics describe the ability to recover *planted* patterns, not real cash-out behaviour | `ai/evaluation-framework.md` §8 |
| Labels come from a column that would not exist in production | The supervised formulation depends on outcome capture that is a V2 integration | `architecture/integrations.md` §4.5 |
| No bias evaluation is possible | Differential geographic impact is unknown | `security/security-checklist.md` G-7 |
| Candidate generation bounds what can be predicted | A cash-out outside the candidate set cannot be ranked at all | This document |
| 24-hour horizon is an assumption | Real distributions may be longer-tailed | ASM-03 |
| H3 resolution 8 fixes the spatial granularity | Too coarse for a specific ATM, too fine for a district | ASM-01 |

The second row is the one an expert evaluator will press on, and it deserves a direct answer: this prototype demonstrates that the pipeline works and that the outputs are explainable and actionable. It does not and cannot demonstrate real-world accuracy, because the labels that would establish that do not exist outside a deployment with outcome capture. Claiming otherwise would be the single fastest way to lose a technically literate reviewer.

---

## 11. Evolution Path

| Version | Change |
|---|---|
| v1.0 | Synthetic training, planted patterns, published prototype metrics |
| V1 | Model card; calibration monitoring; per-region threshold tuning |
| V2 | Retrain on captured outcomes; online features; continuous re-scoring |
| V3 | Cross-case syndicate clustering as a distinct model; drift monitoring with scheduled revalidation |
| V4 | Federated learning across state cyber cells so models improve without centralising sensitive data |

The step that changes everything is V2's outcome capture. Until then, every metric this system publishes is a statement about synthetic data, and every screen that publishes one says so.
