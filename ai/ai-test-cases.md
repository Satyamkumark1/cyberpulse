# AI TEST CASES — CyberPulse AI

| Field | Value |
|---|---|
| Version | 1.0 |
| Scope | Feature engineering, risk model, hotspot engine, temporal model, explainability, and the ML service contract |
| Format | Per `test-cases/test-case-template.md` |
| Frameworks | pytest (ML service and pipeline) · Vitest (ML client contract) |

---

## Data and Signal

### TC-ML-001 — Planted patterns are statistically detectable
**Req:** FR-01.5, FR-01.9 · **Phase:** P2 · **Priority:** Critical · **Automated**
**Steps:** Generate the corpus with seed 26184; run `signal_check.py`.
**Expected:** All eight patterns clear their thresholds (`ai/evaluation-framework.md` §5). Exit code 0. Removing a planted pattern from the generator causes the corresponding test to fail and the script to exit non-zero.
**Severity:** Critical — without this, everything downstream is measuring noise.

### TC-ML-050 — Metric gates block release
**Req:** FR-17 · **Phase:** P3 · **Priority:** Critical · **Automated**
**Steps:** Run `evaluate.py` on a deliberately under-trained model (20 estimators, depth 2).
**Expected:** Exits non-zero, names each failed gate with actual and required values, and writes nothing to `model_metrics`.
**Severity:** Critical

---

## Feature Engineering

### TC-UNIT-010 — Feature vector shape and order
**Req:** FR-06, FR-06.1 · **Phase:** P3 · **Priority:** Critical · **Automated**
**Expected:** Exactly 13 features, in `FEATURE_ORDER`, dtypes matching `feature_schema.json`.

### TC-UNIT-011 — Every documented feature is computed correctly
**Req:** FR-06.1 · **Phase:** P3 · **Priority:** Critical · **Automated**
**Steps:** For a hand-constructed fixture with known values, assert each of the thirteen features against an independently hand-calculated expectation.
**Expected:** All thirteen match exactly. Haversine distance matches a reference implementation to within 1 metre.

### TC-UNIT-012 — Determinism
**Req:** FR-06.2 · **Phase:** P3 · **Priority:** Critical · **Automated**
**Steps:** Build the same vector 100 times, in different process orders.
**Expected:** All 100 element-wise identical.

### TC-UNIT-013 — Missing input defaults
**Req:** FR-06.3 · **Phase:** P3 · **Priority:** High · **Automated**
**Steps:** Build a vector for a complaint with no transactions, no prior withdrawals, and a cell with no ATMs.
**Expected:** `withdrawal_count = 0`, `atm_density = 0.0`, `historical_hotspot_score` = the documented global prior, `linked_account_count = 1`. No exception. No NaN.
*A NaN reaching XGBoost would be silently absorbed and produce a plausible, meaningless score — which is why NaN absence is asserted explicitly.*

### TC-UNIT-014 — Train and serve share one feature module
**Req:** FR-06.4 · **Phase:** P3 · **Priority:** Critical · **Automated**
**Steps:** Assert `training/features.py` is a symlink resolving to `app/engine/features.py`; compute the same vector through both import paths.
**Expected:** Symlink confirmed; vectors identical. Replacing the symlink with a copy fails the test.

### TC-UNIT-015 — Schema mismatch aborts inference
**Req:** FR-06.5 · **Phase:** P3 · **Priority:** Critical · **Automated**
**Steps:** Modify `feature_schema.json` to reorder two features; call `/predict`.
**Expected:** `FeatureSchemaMismatch` raised before inference; 500 with a typed code; **no score is produced**.

---

## Risk Model

### TC-ML-010 — Score range
**Req:** FR-07 · **Priority:** Critical · **Automated**
**Steps:** Predict for 100 holdout complaints.
**Expected:** Every `riskScore` ∈ [0, 1]. No NaN, no infinity.

### TC-ML-011 — Threshold mapping including boundaries
**Req:** FR-07.1 · **Priority:** Critical · **Automated**
**Test data:** 0.0, 0.399, 0.400, 0.699, 0.700, 0.701, 1.0 with defaults 0.70 / 0.40.
**Expected:** LOW, LOW, MEDIUM, MEDIUM, HIGH, HIGH, HIGH. Lower bound inclusive, as documented.

### TC-ML-012 — Confidence reflects separation
**Req:** FR-07.2 · **Priority:** High · **Automated**
**Test data:** (0.92, 0.91) · (0.92, 0.70) · (0.55, 0.50) · single candidate.
**Expected:** LOW · HIGH · LOW · LOW. A high top score with a close second is **not** HIGH confidence.

### TC-ML-013 — Model version reported
**Req:** FR-07.3 · **Priority:** High · **Automated**
**Expected:** Every prediction carries `CyberPulse-Demo-v1`; the persisted row matches; `/health` agrees.

### TC-ML-014 — Missing artefact fails safely
**Req:** FR-07.5 · **Priority:** Critical · **Automated**
**Steps:** Remove `risk_model.joblib`; start the service; call `/health` then `/predict`.
**Expected:** Service starts without crash-looping. `/health` → `unhealthy`, `modelLoaded: false`. `/predict` → 503. **No score of any kind is returned.**

### TC-ML-015 — Calibration
**Req:** M-30 · **Priority:** High · **Automated**
**Steps:** Compute the 10-bin reliability curve over holdout predictions.
**Expected:** ECE ≤ 0.10. Predicted probabilities in each bin fall within ±0.10 of the observed frequency.

---

## Hotspot Engine

### TC-ML-020 — H3 candidate generation
**Req:** FR-08 · **Priority:** Critical · **Automated**
**Expected:** Between 1 and 60 candidates. All valid resolution-8 indices. Deduplicated. The victim's own cell is always included.

### TC-ML-021 — DBSCAN clustering
**Req:** FR-08.1 · **Priority:** High · **Automated**
**Steps:** Run on a synthetic point set with three known clusters and scattered noise.
**Expected:** Three clusters recovered; noise labelled `-1`; cluster count is stable across repeated runs.

### TC-ML-022 — KDE surface
**Req:** FR-08.2 · **Priority:** Medium · **Automated**
**Expected:** Grid ≤ 20,000 cells; all densities non-negative; the maximum coincides with the densest input region; the emitted surface is ≤ 2,000 weighted points.

### TC-ML-023 — Combined score composition
**Req:** FR-08.3 · **Priority:** Critical · **Automated**
**Steps:** With fixed term values, assert the combined score equals the weighted sum to 6 dp; then vary each term alone and confirm the score moves in the expected direction and magnitude.
**Expected:** Exact match. Model probability contributes 45%.

### TC-ML-024 — Ranked output shape and ordering
**Req:** FR-08.4 · **Priority:** Critical · **Automated**
**Expected:** 1 ≤ length ≤ 20; every entry has name, lat, lon, `h3Index`, score ∈ [0,1], non-negative `likelyAtms`; scores non-increasing.

### TC-ML-025 — Reproducibility including ties
**Req:** FR-08.5 · **Priority:** Critical · **Automated**
**Steps:** Predict the same complaint 10 times; construct a fixture with two cells of identical score.
**Expected:** Identical order and scores to 6 dp across all runs. Ties break on `h3Index`, deterministically.

### TC-ML-026 — Clustering fallback disclosed
**Req:** FR-08 · **Priority:** High · **Automated**
**Steps:** Provide withdrawal data too sparse to form any DBSCAN cluster.
**Expected:** H3 aggregation is used; `clusteringFallback: true` in the response; the UI states the fallback.

---

## Temporal Model

### TC-ML-030 — Window returned
**Req:** FR-09 · **Priority:** Critical · **Automated**
**Expected:** `start` and `end` present as ISO-8601 UTC; `end > start`.

### TC-ML-031 — Bin structure
**Req:** FR-09.1 · **Priority:** High · **Automated**
**Expected:** Exactly 12 bins; probabilities sum to 1.0 ± 1e-6; each bin spans 2 hours; the horizon is 24 hours from the complaint timestamp.

### TC-ML-032 — Width cap, including the widened case
**Req:** FR-09.2 · **Priority:** Critical · **Automated**
**Steps:** Predict across 200 holdout complaints, including cases where an adjacent bin is within 0.05.
**Expected:** Every window > 0 and ≤ 4 hours. The database `CHECK` independently rejects any attempt to persist a wider one.

### TC-ML-033 — Flat distribution degrades honestly
**Req:** FR-09.4 · **Priority:** High · **Automated**
**Steps:** Force a near-uniform bin distribution.
**Expected:** Top bin returned with `windowConfidence: "LOW"` and `windowFallback: true`. The field is **not omitted**.

### TC-ML-034 — Midnight crossing
**Req:** FR-09 · **Priority:** Medium · **Automated**
**Steps:** Complaint at 23:15 IST with the top bin in the following day.
**Expected:** Correct consecutive UTC timestamps; the UI renders across the day boundary without wrapping to a negative duration.

---

## Explainability

### TC-ML-040 — Factors present and ordered
**Req:** FR-10 · **Priority:** Critical · **Automated**
**Expected:** Ordered by descending absolute contribution; each has name, contribution and direction.

### TC-ML-041 — Factors derive from the served model
**Req:** FR-10.1 · **Priority:** Critical · **Automated**
**Steps:** Compute SHAP independently in the test using the loaded artefact; compare against the service's aggregated output.
**Expected:** Aggregated group values match to 3 dp. *This is the test that proves the explanation describes the model actually serving predictions, rather than being computed from something else.*

### TC-ML-042 — Only approved factor names
**Req:** FR-10.2 · **Priority:** Critical · **Automated**
**Steps:** Predict across 200 complaints; collect every factor name; attempt to emit a raw feature identifier through a stubbed service.
**Expected:** Every name is within the closed enum. The raw identifier fails schema validation in the ML client.

### TC-ML-043 — Normalisation
**Req:** FR-10.3 · **Priority:** Critical · **Automated**
**Expected:** For every prediction, Σ|contribution| = 100 ± 0.5.

### TC-ML-044 — Direction correctness
**Req:** FR-10.4 · **Priority:** High · **Automated**
**Steps:** Compare the sign of each aggregated SHAP group with the reported direction.
**Expected:** Positive → INCREASES, negative → REDUCES, for every factor across 200 predictions.

### TC-ML-045 — Minimum five factors, and honest failure
**Req:** FR-10.5 · **Priority:** Critical · **Automated**
**Steps:** Predict across 200 complaints, including cases where one feature dominates; then force a SHAP exception.
**Expected:** Always ≥ 5 factors with the sum still exactly 100 (residual grouped as "Other factors"). Under exception: `factors: []`, `explanationAvailable: false`, prediction still returned, UI states the explanation could not be generated.

### TC-ML-046 — Explanation stability
**Req:** `ai/evaluation-framework.md` §2.4 · **Priority:** Critical · **Automated**
**Steps:** Explain the same prediction 20 times across process restarts.
**Expected:** Identical factor names, contributions to 3 dp, and order, every time.

---

## Service Contract

### TC-ML-060 — Request validation
**Req:** ML-001 · **Priority:** High · **Automated**
**Steps:** Send a missing `complaint`, an empty `candidateCells`, `topK = 0`, `topK = 100`, and a malformed timestamp.
**Expected:** 422 with a field-level message for each. No inference attempted.

### TC-ML-061 — Response conforms to the shared schema
**Req:** ML-001 · **Priority:** Critical · **Automated**
**Steps:** Validate 200 live responses against the generated Zod schema in the web workspace.
**Expected:** All pass, including both refinements.

### TC-ML-062 — Pipeline stages reported
**Req:** ML-001 · **Priority:** Medium · **Automated**
**Expected:** `pipelineStages[]` present with per-stage durations; stage names match those the demo UI displays; durations sum to within 10% of `inferenceMs`.

### TC-ML-063 — Health accuracy
**Req:** ML-003 · **Priority:** High · **Automated**
**Expected:** Reports `modelLoaded`, `modelVersion`, `featureSchemaVersion`, `loadedAt`. Reflects reality when the artefact is removed.

### TC-ML-064 — Inference latency
**Req:** NFR-02 · **Priority:** High · **Automated (pytest-benchmark)**
**Steps:** 100 predictions with 60 candidates on the reference machine.
**Expected:** p95 ≤ 400 ms; p99 ≤ 700 ms; resident memory ≤ 512 MB.

### TC-ML-065 — Stateless concurrency
**Req:** ADR-009 · **Priority:** High · **Automated**
**Steps:** Issue 20 concurrent predictions for different complaints; then the same complaint 20 times concurrently.
**Expected:** All succeed. Results for a given complaint are identical across all 20. No cross-request contamination.

---

## Baselines and Ablations

### TC-ML-070 — Model beats every baseline
**Req:** `ai/evaluation-framework.md` §3 · **Priority:** High · **Automated**
**Expected:** XGBoost top-3 hit rate exceeds random, nearest-cell, historical-frequency and logistic regression. **The margin over logistic regression is reported explicitly** — a narrow margin means the planted patterns are trivially linear, which is a finding to report rather than suppress.

### TC-ML-071 — Shuffled labels collapse to chance
**Req:** `ai/evaluation-framework.md` §4 · **Priority:** Critical · **Automated**
**Steps:** Retrain with labels shuffled within each complaint group; evaluate.
**Expected:** Top-3 hit rate within 0.05 of the random baseline. **Anything above that indicates feature leakage and voids every other metric.**

### TC-ML-072 — Ablations recorded
**Req:** `ai/evaluation-framework.md` §4 · **Priority:** Medium · **Automated**
**Expected:** All five ablations run and are written to `model_card.json` with their deltas.

---

## Coverage Summary

| Area | Cases | Critical | High | Medium |
|---|:--:|:--:|:--:|:--:|
| Data and signal | 2 | 2 | 0 | 0 |
| Feature engineering | 6 | 5 | 1 | 0 |
| Risk model | 6 | 4 | 2 | 0 |
| Hotspot engine | 7 | 4 | 2 | 1 |
| Temporal model | 5 | 2 | 2 | 1 |
| Explainability | 7 | 6 | 1 | 0 |
| Service contract | 6 | 2 | 3 | 1 |
| Baselines and ablations | 3 | 1 | 1 | 1 |
| **Total** | **42** | **26** | **12** | **4** |

Every AI requirement FR-06 … FR-10 and every guardrail in `ai/guardrails.md` maps to at least one case above.
