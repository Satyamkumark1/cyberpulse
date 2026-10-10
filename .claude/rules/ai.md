# RULE — AI / ML

Applies to `apps/ml-service/**` and anything touching prediction.
Read with `ai/ai-strategy.md`, `ai/model-selection.md`, `ai/guardrails.md`.

---

## The shape of this system

No LLM. No generative model. No prompts. No RAG. No external inference API.

Three tabular models — XGBoost risk classifier, XGBoost temporal classifier, unsupervised hotspot engine — plus exact SHAP. Every output is reproducible, attributable and verifiable offline. Introducing a generative component anywhere in the prediction path would destroy all three properties; if it is ever proposed, the requirements in `ai/prompt-library.md` §4 apply in full.

---

## One feature module

`training/features.py` is a **symlink** to `app/engine/features.py`. Not a copy. CI asserts this (TC-UNIT-014). Replacing it reintroduces train/serve skew, which is the failure mode that makes published metrics describe a model other than the one serving.

13 features, fixed order, numeric only, deterministic, documented defaults, no NaN. `assert_schema` runs before every inference; a mismatch aborts rather than scoring a misaligned vector.

**No feature encodes an identity or a demographic attribute.** This is what makes "the system predicts events, not people" structurally true rather than aspirational.

---

## Never fabricate

| Situation | Behaviour |
|---|---|
| Artefact missing | `/health` reports `modelLoaded: false`; `/predict` returns 503 |
| Feature schema mismatch | Abort before inference with a typed error |
| SHAP fails | Return the prediction with `explanationAvailable: false` and an explicit statement |
| No candidate above MEDIUM | "No high-risk location identified" with the full ranked list |
| Clustering finds nothing | H3 fallback with `clusteringFallback: true` in the response |
| Temporal distribution flat | Top bin with LOW confidence and `windowFallback: true` |

Never a default score. Never a cached value. Never the best of a weak field promoted to HIGH.

---

## Output guarantees

| Guarantee | Enforced by |
|---|---|
| `riskScore ∈ [0,1]` | Schema bounds |
| Risk level derived server-side from thresholds | Derivation function, no override |
| Window > 0 and ≤ 4 h | Two-bin construction **and** a database `CHECK` |
| ≥ 5 named factors when explained | `collapse_small` + schema refinement |
| Contributions sum to 100 ± 0.5 | Normalisation + schema refinement |
| Factor names from a closed enum | Zod enum — a raw identifier cannot pass |
| Ranked hotspots non-increasing, ties broken on `h3Index` | Deterministic sort |
| Model version on every prediction | Required literal field |

---

## Explainability

Exact SHAP via TreeExplainer, **top cell only** (all 60 would cost ~4.2 s for information nobody reads). Aggregated into the closed factor set, normalised, each with a textual direction.

LIME and other perturbation methods are rejected: they are unstable across runs, and an officer who re-analyses and sees different reasons stops trusting the system. Stability is a gate (TC-ML-046), asserted across process restarts.

---

## Confidence means separation, not magnitude

```python
if margin >= 0.15 and top >= 0.70: return "HIGH"
if margin >= 0.07:                 return "MEDIUM"
return "LOW"
```

A top score of 0.92 with a second of 0.91 is not confident. Conflating the two would be the most misleading simplification available.

---

## Training discipline

- **Split by complaint, never by row.** Sixty candidate rows per complaint means a row split puts the same complaint on both sides.
- Retain complaints whose true cell was never a candidate as all-negative groups. Dropping them inflates top-k hit rate by excluding the cases the engine cannot solve.
- `max_depth` from the documented grid search (3–6; currently 6, DEC-018). Deeper needs a new search and a decision entry — deep trees memorise a synthetic generator, which the shuffled-label check and the single holdout touch exist to catch.
- Optimise PR-AUC, not ROC-AUC, at 1:59 imbalance. Report both.
- Calibrate with isotonic regression. An uncalibrated score shown as a percentage is a false statement.
- The holdout is touched **once**, by `evaluate.py` only.
- Run the shuffled-label ablation every time. Performance above chance means leakage and voids every other number.

---

## Gates

`evaluate.py` exits non-zero below any of: ROC-AUC 0.85 · PR-AUC 0.45 · precision 0.75 · recall 0.70 · F1 0.72 · ECE 0.10 · top-1 0.45 · top-3 0.72 · top-5 0.85 · temporal exact 0.40 · within ±1 0.75.

**A model below gate is not shipped with an adjusted gate.** The gate is what makes the published number mean anything.

Metrics are written to `model_metrics` and read from there. A hard-coded metric fails TC-INT-011.

---

## Performance

Artefacts loaded once at startup. Vectorised feature construction (a per-cell loop measured ~4× slower). Batch scoring. SHAP on one cell. p95 ≤ 400 ms for 60 candidates; resident memory ≤ 512 MB.

---

## Honesty in what you publish

Every metric is measured on **synthetic data**. It describes the pipeline's ability to recover planted patterns, not real-world accuracy. Labels come from `withdrawals.complaint_id`, a column that would not exist in production without outcome capture. Bias is untestable here.

State all of this. The in-app panel is headed "PROTOTYPE MODEL EVALUATION" with the synthetic-data caption, and `model_card.json` lists the limitations. Overclaiming is the fastest way to lose a technically literate evaluator.

---

## Before you finish

- [ ] `features.py` still a symlink
- [ ] `assert_schema` before inference
- [ ] No fabricated value on any failure path
- [ ] Factor names from the closed enum; sum 100 ± 0.5
- [ ] Window ≤ 4 h
- [ ] Split by complaint; holdout untouched by training
- [ ] Shuffled-label ablation run
- [ ] All gates cleared; `model_metrics` written
- [ ] `CHANGELOG.md` `Model` entry with before/after for every gate
