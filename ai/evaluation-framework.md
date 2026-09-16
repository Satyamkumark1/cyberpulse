# EVALUATION FRAMEWORK — CyberPulse AI

| Field | Value |
|---|---|
| Version | 1.0 |
| Model | `CyberPulse-Demo-v1` · feature schema `fs-1` |
| **Framing** | Every number produced by this framework is measured on **synthetic data**. It describes the pipeline's ability to recover planted patterns. It is not a claim about real-world accuracy. |
| Published as | "PROTOTYPE MODEL EVALUATION" in `/reports` |

---

## 1. Splitting

**Grouped by complaint, never by row.** With approximately sixty candidate rows per complaint, a row-level split would place the same complaint on both sides and produce metrics that mean nothing.

| Split | Share | Purpose |
|---|---|---|
| Train | 60% of complaints | Model fitting |
| Calibration | 15% | Isotonic calibration |
| Holdout | 25% | Reported metrics — touched once, at the end |

Split assignment is deterministic from seed `26184`, so the holdout is identical across machines and runs.

**The holdout is used once.** Tuning against it and then reporting on it is the most common way an evaluation becomes fiction. `train.py` has no access to the holdout indices; only `evaluate.py` does.

---

## 2. Metrics and Gates

Gates are release-blocking. `evaluate.py` exits non-zero if any fails, which blocks the training pipeline (`diagrams/data-flow.md` D-13).

### 2.1 Classification

| Metric | Gate | Why this metric |
|---|---|---|
| ROC-AUC | ≥ 0.850 | Familiar to evaluators; optimistic under 1:59 imbalance, so reported but not tuned against |
| PR-AUC | ≥ 0.450 | The honest signal at this imbalance; what training optimises |
| Precision @ threshold | ≥ 0.750 | A false HIGH sends a team to the wrong locality |
| Recall @ threshold | ≥ 0.700 | A missed cash-out is the whole failure the product exists to prevent |
| F1 @ threshold | ≥ 0.720 | Balance |
| Calibration ECE (10 bins) | ≤ 0.100 | The UI shows the score as a percentage; an uncalibrated percentage is a false statement |

### 2.2 Ranking — the metrics that actually matter

| Metric | Gate | Interpretation |
|---|---|---|
| Top-1 hit rate | ≥ 0.450 | The first location an officer would deploy to |
| Top-3 hit rate | ≥ 0.720 | Realistic operational envelope for a small unit |
| Top-5 hit rate | ≥ 0.850 | Upper bound of practical coverage |
| MRR | ≥ 0.580 | Rank quality across the whole list |

Hit rate is computed **per complaint**, over all complaints in the holdout — including those whose true cell was never generated as a candidate. Excluding them would inflate every number and is the most tempting available cheat.

### 2.3 Temporal

| Metric | Gate |
|---|---|
| Exact bin match | ≥ 0.400 |
| Within ±1 bin | ≥ 0.750 |
| Mean absolute error (hours) | ≤ 3.0 |
| Window width ≤ 4 h | 1.000 (hard constraint) |

### 2.4 Explanation

| Metric | Gate |
|---|---|
| Predictions returning ≥ 5 factors | 1.000 |
| Contributions summing to 100 ± 0.5 | 1.000 |
| Factor names within the closed enum | 1.000 |
| Explanation stability across repeated runs | 1.000 (identical to 3 dp) |

Stability is a gate because an officer who re-analyses a complaint and sees different reasons will stop trusting the system — which is exactly why LIME was rejected in favour of exact SHAP.

### 2.5 Operational

| Metric | Gate |
|---|---|
| Inference p95 for 60 candidates | ≤ 400 ms |
| Resident memory | ≤ 512 MB |
| Artefact size | ≤ 60 MB |

---

## 3. Baselines

A model is only as good as what it beats. Four baselines, computed on the same holdout.

| Baseline | Method | Expected top-3 | Purpose |
|---|---|---|---|
| Random | Uniform over candidates | ~0.05 | Floor |
| Nearest cell | Rank by distance from victim | ~0.30 | Is geography alone sufficient? |
| Historical frequency | Rank by prior withdrawal count | ~0.40 | Is history alone sufficient? |
| Logistic regression | Same features, linear | ~0.60 | Is the pattern non-linear at all? |
| **XGBoost** | Full pipeline | **≥ 0.72** | The model under evaluation |

**The logistic baseline is the important one.** If XGBoost fails to beat it by a meaningful margin, the planted patterns are trivially linear and the evaluation is measuring the generator rather than the model. That finding would be worth reporting rather than hiding.

---

## 4. Ablations

Run on every training pass; results recorded in `model_card.json`.

| Ablation | Question |
|---|---|
| Remove spatial features | How much comes from geography? |
| Remove temporal features | How much from timing? |
| Remove network features | How much from layering structure? |
| Remove historical hotspot | Is the model just memorising known hotspots? |
| Shuffle labels | Does performance collapse to baseline? (sanity check for leakage) |

The shuffled-label ablation is a leakage detector. If a model trained on shuffled labels performs above chance, something in the feature pipeline is leaking the answer, and every other number is void.

---

## 5. Signal Check (pre-training gate)

`scripts/evaluation/signal_check.py` verifies that each of the eight planted patterns is statistically detectable **before** training is permitted.

| Pattern | Test | Threshold |
|---|---|---|
| Time-of-day | χ² of withdrawal hour vs uniform | p < 0.01 |
| Day-of-week | χ² vs uniform | p < 0.01 |
| Withdrawal density | Gini across cells | ≥ 0.40 |
| Transaction velocity | Mann-Whitney, fraud chains vs baseline | p < 0.01 |
| Linked-account behaviour | Mean depth difference | ≥ 1.0 hop |
| Distance | KS test, actual cash-out distance vs random cell | p < 0.01 |
| Historical hotspot | Rank correlation, historical vs actual | ρ ≥ 0.30 |
| Amount behaviour | KS test across fraud types | p < 0.01 |

A failure exits non-zero and blocks training. This gate exists because RSK-01 — a generator producing no learnable signal — would otherwise be discovered after a day of unexplained model failure rather than in ten seconds.

---

## 6. Evaluation Pipeline

```
train.py      → fit on train split, calibrate on calibration split
              → write artefacts + feature_schema.json
evaluate.py   → load holdout (first and only access)
              → classification metrics
              → ranking metrics (per complaint, including unreachable cases)
              → temporal metrics
              → explanation checks over every holdout prediction
              → baselines + ablations
              → calibration curve + ECE
              → gate check → exit non-zero on any failure
              → INSERT INTO model_metrics
              → write model_card.json
```

Metrics reach the application only through `model_metrics`. A hard-coded metric value in application code fails TC-INT-011.

---

## 7. Model Card

`model_card.json`, produced by every training run and shipped in the image:

```json
{
  "modelVersion": "CyberPulse-Demo-v1",
  "featureSchemaVersion": "fs-1",
  "trainedAt": "2026-09-14T04:00:00Z",
  "datasetSeed": 26184,
  "intendedUse": "Decision support for cyber-fraud investigators: ranking candidate cash-withdrawal locations and time windows for a filed complaint.",
  "outOfScope": [
    "Any determination about an individual",
    "Autonomous enforcement action",
    "Deployment on real data without retraining, bias evaluation and outcome capture"
  ],
  "trainingData": "Synthetic corpus, seed 26184, generated by scripts/generate-data/generator.py",
  "limitations": [
    "Metrics describe recovery of planted synthetic patterns, not real-world accuracy",
    "Labels derive from withdrawals.complaint_id, which would not exist in production without outcome capture",
    "No bias or differential-impact evaluation is possible on synthetic data",
    "Candidate generation bounds achievable recall",
    "24-hour horizon and H3 resolution 8 are fixed assumptions"
  ],
  "metrics": { "...": "populated by evaluate.py" },
  "baselines": { "...": "populated by evaluate.py" },
  "ablations": { "...": "populated by evaluate.py" }
}
```

---

## 8. What This Framework Cannot Tell You

The most important section in this document.

**Real-world accuracy.** Every metric measures recovery of patterns that a generator deliberately planted. A model that scores 0.87 ROC-AUC here has demonstrated that the pipeline works end to end. It has demonstrated nothing about whether cash-out locations in the real world are predictable from these signals, because that question requires real data with real outcomes.

**Bias and differential impact.** Whether the model would concentrate attention on particular localities in a way that reflects *reporting* patterns rather than *offending* patterns is untestable here — the generator's geography is a design choice, so any disparity found would be a property of the generator, not a finding. This is the most serious open question in the project (`security/security-checklist.md` G-7), and it should be answered before any real deployment, not after.

**Generalisation across regions.** The corpus covers seven metro clusters with the same generative process. Real regional variation is not represented.

**Robustness to adversarial adaptation.** If such a system were deployed and became known, cash-out behaviour would adapt. Nothing here measures resistance to that, and the honest expectation is that performance would degrade.

**Operational value.** Whether a top-3 hit rate of 0.72 changes recovery outcomes depends on response capacity, timing and factors entirely outside the model.

---

## 9. Reporting Standard

Whenever these metrics appear — in the application, in a deck, in a conversation with an evaluator — they carry: the model version, the dataset seed, the split, and the sentence *"measured on a held-out split of synthetic data; does not represent operational performance."*

The application enforces this: the metrics panel heading is fixed to "PROTOTYPE MODEL EVALUATION" and its caption is asserted character-for-character by TC-UX-011.
