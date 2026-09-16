# AI TEST CASES — INDEX

| Field | Value |
|---|---|
| Version | 1.0 |
| **Canonical catalogue** | **`ai/ai-test-cases.md`** — 42 cases, full detail |
| **Integrity catalogue** | **`ai/hallucination-testing.md`** — 12 fabrication cases |
| This file | Index, coverage argument against the required AI test categories, and CI wiring |

Maintained in one place so two catalogues cannot drift. This document gives the pointer and the coverage argument.

---

## 1. Required AI Test Categories → Coverage

The documentation standard lists thirteen AI test categories, written for generative systems. Several do not apply to a tree-ensemble pipeline; each is recorded with its reason rather than dropped, and where a category has a real analogue here, the analogue is tested.

| Required category | Applies? | Covered by |
|---|---|---|
| Prompt correctness | **No** — no prompts exist (`ai/prompt-library.md`) | TC-AI-002 asserts none are introduced |
| Structured outputs | Yes | TC-ML-061 — every response validated against the shared schema, including both refinements |
| Retrieval accuracy | **Reframed** — retrieval is candidate generation, not vector search | TC-ML-020, TC-ML-070 (recall ceiling measured and published) |
| Groundedness | **Reframed** — every input is a database row with a primary key | TC-INT-013 (response equals persisted row) |
| Hallucination | **Reframed as fabrication** — a displayed value the model never produced | TC-FAB-001 … 012 |
| Prompt injection | **No** — no LLM in any path | TC-AI-001 asserts no provider SDK is present |
| Adversarial inputs | Yes | TC-SEC-018, TC-INT-025 — malformed ML responses rejected, never persisted |
| Model failure | Yes | TC-ML-014 — missing artefact fails health and returns 503, never a fabricated score |
| Timeout handling | Yes | TC-INT-022 — 8 s timeout, typed error, no retry |
| Fallback handling | Yes | TC-ML-026 (clustering fallback), TC-ML-033 (temporal fallback), TC-ML-045 (explanation failure) |
| Cost controls | **Reframed** — no per-token cost; bounded compute instead | TC-PERF-006, TC-PERF-021, candidate cap at 60 |
| Latency | Yes | TC-ML-064, TC-PERF-002 |
| Output consistency | Yes | TC-ML-025 (ranking reproducibility), TC-ML-046 (explanation stability across restarts) |

Three categories are genuinely not applicable. Four are reframed because the underlying risk is real here in a different form — and in two of those cases the reframed version is more demanding than the original: fabrication testing asserts the *absence of number-shaped content* in degraded mode, and consistency testing asserts identical explanations across process restarts.

---

## 2. Measurable Quality Thresholds

Every gate is release-blocking; `evaluate.py` exits non-zero below any of them.

| Metric | Gate | Case |
|---|---|---|
| ROC-AUC | ≥ 0.850 | TC-ML-050 |
| PR-AUC | ≥ 0.450 | TC-ML-050 |
| Precision @ threshold | ≥ 0.750 | TC-ML-050 |
| Recall @ threshold | ≥ 0.700 | TC-ML-050 |
| F1 @ threshold | ≥ 0.720 | TC-ML-050 |
| Calibration ECE | ≤ 0.100 | TC-ML-015 |
| Top-1 hit rate | ≥ 0.450 | TC-ML-050 |
| Top-3 hit rate | ≥ 0.720 | TC-ML-050 |
| Top-5 hit rate | ≥ 0.850 | TC-ML-050 |
| Temporal exact bin | ≥ 0.400 | TC-ML-050 |
| Temporal within ±1 | ≥ 0.750 | TC-ML-050 |
| Explanation completeness | 1.000 | TC-ML-045 |
| Explanation stability | 1.000 | TC-ML-046 |
| Inference p95 | ≤ 400 ms | TC-ML-064 |

---

## 3. Evaluation-Integrity Cases

Two cases exist to check that the evaluation itself is honest, and they are the ones a technically literate reviewer would look for.

**TC-ML-071 — shuffled labels collapse to chance.** Retraining with labels shuffled within each complaint group must produce a top-3 hit rate within 0.05 of random. Anything above that indicates feature leakage and voids every other metric.

**TC-ML-070 — the margin over a logistic baseline is reported.** If the gradient-boosted model barely beats logistic regression, the planted patterns are trivially linear and the evaluation is measuring the generator rather than the model. That is a finding to publish, not to suppress.

---

## 4. CI Wiring

| Stage | Cases | Blocks |
|---|---|---|
| Pre-training gate | `signal_check.py` (TC-DATA-009) | Training |
| Pre-seed gate | `pii_scan.py` (TC-SEC-020) | Seeding |
| Python unit | TC-UNIT-010 … 015, TC-ML-001 | Merge |
| Contract | TC-ML-060 … 065 | Merge |
| Evaluation | TC-ML-050, TC-ML-070 … 072 | Release |
| Integration | TC-INT-025, TC-SEC-018 | Merge |
| E2E | TC-FAB-002, 004, 008 | Merge |

None of the four gates accepts a skip flag in CI.

---

## 5. Counts

| Catalogue | Cases | Critical | High | Medium |
|---|:--:|:--:|:--:|:--:|
| `ai/ai-test-cases.md` | 42 | 26 | 12 | 4 |
| `ai/hallucination-testing.md` | 12 | 9 | 3 | 0 |
| **Total** | **54** | **35** | **15** | **4** |

Full detail — preconditions, test data, steps, expected results — in the two canonical catalogues.
