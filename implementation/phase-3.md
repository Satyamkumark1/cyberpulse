# PHASE 3 — CORE INTELLIGENCE & COMPLAINT WORKFLOW

| Field | Value |
|---|---|
| Duration | 20 person-days · Week 2, days 1–6 |
| Output | **The vertical slice**: complaint → features → model → hotspot → window → SHAP → rendered explanation |
| Entry | Phase 2 exited; corpus passes `signal_check` |
| Features | FEAT-01, FEAT-02, FEAT-05, FEAT-06, FEAT-07, FEAT-08, FEAT-09, part of FEAT-15 |

> This is the phase that decides whether the project has a product. Everything before it is preparation; everything after it is presentation. ADR-014 records why the AI layer is delivered here rather than at the conventional Phase 5.

---

## 1. Objectives

1. Build the feature engineering module — one file, shared by training and serving — so train/serve skew is structurally impossible.
2. Train, calibrate and evaluate the risk and temporal models against release-blocking gates.
3. Build the hotspot engine: H3 candidate generation, DBSCAN clustering, KDE, and the combined ranking.
4. Produce exact SHAP explanations aggregated into officer-readable factors.
5. Serve all of it through `/predict` behind a validated contract.
6. Build the complaint registry and detail, wired to real inference.
7. Establish the role concept with server-side enforcement, and the prototype labelling.

---

## 2. Deliverables

| Deliverable | Acceptance |
|---|---|
| `app/engine/features.py` + symlink from `training/` | 13 features, fixed order, deterministic, documented defaults |
| `feature_schema.json` | Order, dtypes, defaults, version `fs-1` |
| `training/generate_training_data.py` | Complaint × candidate pairs, grouped by complaint |
| `training/train.py` | XGBoost risk + temporal models, isotonic calibration |
| `training/evaluate.py` | All metrics, baselines, ablations; exits non-zero below any gate |
| `risk_model.joblib`, `temporal_model.joblib`, `model_card.json` | Baked into the ML image |
| `engine/hotspot.py` | H3 k-ring + historical, DBSCAN, KDE, combined score |
| `engine/temporal.py` | 12-bin classifier, ≤ 4-hour window construction |
| `engine/explain.py` | TreeExplainer, factor aggregation, normalisation, collapse |
| `POST /predict` (ML) | Full contract with `pipelineStages[]` |
| `POST /api/predict` (web) | Validated, authorised, rate-limited, transactionally persisted |
| `/complaints` | Server-paginated, filterable, sortable |
| `/complaints/[id]` | Summary, timeline, linked accounts, prediction panel |
| Prediction panel | Risk, level, confidence, hotspot, window, factors, alternatives |
| Role concept | LEA / BANK / ADMIN enforced in the service layer |
| Prototype labelling | Badge and disclaimer on every route |
| `model_metrics` row | Written by `evaluate.py` |

---

## 3. Implementation Tasks

| # | Task | Owner | Days |
|---|---|---|---|
| T-3.1 | `features.py` — 13 features, defaults, determinism, `assert_schema` | ML | 2.0 |
| T-3.2 | Symlink `training/features.py`; CI check | ML | 0.25 |
| T-3.3 | Training-data construction, grouped by complaint | ML | 1.0 |
| T-3.4 | Train risk model; hyperparameter search; calibration | ML | 1.5 |
| T-3.5 | Train temporal model; window construction | ML | 1.0 |
| T-3.6 | Hotspot engine: k-ring, historical, DBSCAN, KDE, combined score | ML | 2.0 |
| T-3.7 | SHAP explainer, factor map, normalisation, `collapse_small` | ML | 1.25 |
| T-3.8 | `evaluate.py`: metrics, baselines, ablations, gates, `model_card.json` | ML | 1.5 |
| T-3.9 | FastAPI `/predict` with Pydantic validation and stage reporting | Backend | 1.0 |
| T-3.10 | `mlClient` with timeout, single retry, response validation | Backend | 0.75 |
| T-3.11 | `predictionService`: assembly, candidates, transaction, persistence | Backend | 1.5 |
| T-3.12 | `POST /api/predict` handler with authorisation and rate limit | Backend | 0.5 |
| T-3.13 | `complaintService` with scope predicate | Backend | 1.0 |
| T-3.14 | `/complaints` registry with filters, sort allow-list, pagination | Frontend | 1.5 |
| T-3.15 | `/complaints/[id]` detail: summary, timeline, accounts | Frontend | 1.25 |
| T-3.16 | Prediction panel: states, factors, alternatives, live region | Frontend | 1.75 |
| T-3.17 | Role resolution, capability guard, scope predicate | Backend | 0.75 |
| T-3.18 | Prototype badge, disclaimer, terminology audit | Frontend | 0.5 |
| T-3.19 | Integrity scaffolding: `no_hardcode_check.sh` in CI | QA | 0.5 |

---

## 4. Dependencies

**Inbound:** P2 corpus, schema, contract generation, health.
**Outbound:** P4 needs a prediction to visualise; P5 needs a prediction to alert on.

**Internal order — strict:** `features.py` → training data → train → evaluate (gates) → `/predict` → `mlClient` → `predictionService` → UI. The complaint registry (T-3.13, T-3.14) proceeds in parallel from day one, since it does not depend on the model.

---

## 5. Risks

| Risk | Probability | Impact | Mitigation |
|---|---|---|---|
| **Model fails its metric gates** | Medium | **Critical** | Baselines computed first; if logistic regression cannot beat random, the corpus is wrong, not the model. Tune before touching the UI. |
| Train/serve skew | Low | **Critical** | Symlinked module; CI asserts it is a symlink |
| Calibration poor, percentages misleading | Medium | High | Isotonic calibration on a dedicated split; ECE ≤ 0.10 gate |
| SHAP too slow | Medium | Medium | Top cell only — measured at ~70 ms versus ~4.2 s for all candidates |
| Candidate generation misses the true cell | Medium | High | Historical cells added regardless of distance; recall ceiling measured and published |
| UI built against an imagined contract | Medium | High | Shared schema generated before UI work begins |
| Hard-coded values during UI development | **High** | **Critical** | `no_hardcode_check.sh` added in this phase, not later |
| Prediction latency exceeds budget | Medium | High | Vectorised features, batch scoring, 500 ms headroom in the budget |

The eighth row is rated High probability deliberately. Stubbing a value while building a component is the natural way to work, and the guard has to exist before the temptation does.

---

## 6. Acceptance Criteria

**AC-P3-01** — The feature vector contains exactly 13 features in the documented order with documented dtypes, and is deterministic (AC-005-01, 02).
**AC-P3-02** — Missing inputs resolve to documented defaults with no NaN and no exception (AC-005-03).
**AC-P3-03** — `training/features.py` is a symlink to `app/engine/features.py`.
**AC-P3-04** — `evaluate.py` clears every gate: ROC-AUC ≥ 0.85, PR-AUC ≥ 0.45, precision ≥ 0.75, recall ≥ 0.70, F1 ≥ 0.72, ECE ≤ 0.10, top-1 ≥ 0.45, top-3 ≥ 0.72, top-5 ≥ 0.85, temporal exact ≥ 0.40, within ±1 ≥ 0.75.
**AC-P3-05** — XGBoost beats logistic regression on top-3 hit rate, and the margin is reported.
**AC-P3-06** — A shuffled-label retrain collapses to within 0.05 of random.
**AC-P3-07** — Ranked hotspots are ordered, bounded 1–20, reproducible including ties (AC-007-01, 02).
**AC-P3-08** — Every window is > 0 and ≤ 4 hours, with the explanatory note present (AC-008-01 … 03).
**AC-P3-09** — Every prediction returns ≥ 5 named factors summing to 100 ± 0.5, with directions, from the closed enum (AC-009-01 … 04).
**AC-P3-10** — SHAP failure returns the prediction with `explanationAvailable: false` and an explicit UI statement.
**AC-P3-11** — A missing artefact fails health and returns 503; no score is fabricated (AC-006-04).
**AC-P3-12** — The response returned to the client equals the persisted row (NFR-26).
**AC-P3-13** — Prediction and its factors commit or roll back together.
**AC-P3-14** — The complaint registry paginates, filters, sorts on allow-listed columns, and renders all four states.
**AC-P3-15** — BANK receives 403 on `POST /api/predict`; out-of-scope objects return 404.
**AC-P3-16** — Every route displays the synthetic-data badge and the disclaimer.
**AC-P3-17** — `no_hardcode_check.sh` reports zero matches in `apps/web`.
**AC-P3-18** — `POST /api/predict` p95 ≤ 1500 ms warm; ML inference p95 ≤ 400 ms.

---

## 7. Test Strategy

Three bands carry this phase. **Model correctness** — determinism, boundaries, reproducibility, exactness of explanations. **Integrity** — that the number on screen is the number the model produced. **Contract** — that a malformed ML response is rejected rather than persisted.

Evaluation integrity is tested explicitly: a model that scores well on a leaking feature set would pass every other test in this phase.

---

## 8. Phase 3 Test Cases

### Feature engineering
TC-UNIT-010 shape and order · TC-UNIT-011 every feature against a hand calculation · TC-UNIT-012 determinism over 100 builds · TC-UNIT-013 defaults with no NaN · TC-UNIT-014 symlink integrity · TC-UNIT-015 schema mismatch aborts before inference

### Risk model
TC-ML-010 score range · TC-ML-011 threshold boundaries inclusive at 0.400 and 0.700 · TC-ML-012 confidence reflects separation, not magnitude · TC-ML-013 version reported · TC-ML-014 missing artefact fails safely · TC-ML-015 calibration ECE ≤ 0.10

### Hotspot engine
TC-ML-020 candidate generation · TC-ML-021 DBSCAN recovers known clusters · TC-ML-022 KDE bounds · TC-ML-023 combined score composition to 6 dp · TC-ML-024 ranked output shape and ordering · TC-ML-025 reproducibility including tie-break · TC-ML-026 clustering fallback disclosed

### Temporal
TC-ML-030 window returned · TC-ML-031 12 bins summing to 1.0 · TC-ML-032 width cap including the widened case · TC-ML-033 flat distribution degrades honestly · TC-ML-034 midnight crossing

### Explainability
TC-ML-040 ordered factors · TC-ML-041 factors match an independently computed SHAP · TC-ML-042 closed enum only · TC-ML-043 sum 100 ± 0.5 · TC-ML-044 direction sign correctness · TC-ML-045 minimum five, and honest failure · TC-ML-046 stability across process restarts

### Evaluation integrity
TC-ML-050 gates block release · TC-ML-070 margin over logistic reported · TC-ML-071 shuffled labels collapse to chance · TC-ML-072 ablations recorded

### Service contract
TC-ML-060 request validation · TC-ML-061 response conforms to the shared schema · TC-ML-062 stage reporting · TC-ML-063 health accuracy · TC-ML-064 inference p95 · TC-ML-065 stateless concurrency

### Integration and integrity
TC-INT-010 no hard-coded values · TC-INT-013 response equals persisted row · TC-INT-020 ML down → 503, nothing persisted · TC-INT-022 timeout at 8 s, no retry · TC-INT-024 persistence atomicity · TC-INT-025 six malformed responses rejected · TC-INT-027 complaint with no transactions

### API and UI
TC-API-001 … 007 complaints · TC-API-010 … 014 prediction · TC-UI-001 … 006 registry and detail · TC-UI-013 window note · TC-UI-014 … 019 prediction panel · TC-UI-082 badge

### Security
TC-SEC-010 role fallback · TC-SEC-011 capability matrix · TC-SEC-012 scope indistinguishability · TC-SEC-013 sort allow-list · TC-SEC-019 artefact read-only

### E2E
TC-E2E-001 complaint to rendered prediction · TC-E2E-002 persists and survives reload · TC-E2E-050 UI follows a substituted response · TC-E2E-052 no prediction caching · TC-E2E-053 explanation absence stated

**Total: 74 cases.**

---

## 9. Regression Tests

| From | Re-run | Why |
|---|---|---|
| P2 | TC-DATA-001 … 009 | Training must not have mutated the corpus |
| P2 | TC-SEC-020, TC-SEC-022 | No personal data introduced by new tables or columns |
| P2 | TC-INT-080, TC-API-080 | Health must now include a loaded model |
| P2 | TC-P2-02 | New constraints (window width) enforced |
| P2 | TC-P2-05 | Contract codegen still breaks both builds |
| P1 | TC-DOC-015, TC-DOC-021 | Schema or shared values changed during the phase |

---

## 10. Security Validation

| Check | Case |
|---|---|
| BANK cannot predict | TC-API-011, TC-SEC-011 |
| Unknown role falls back to LEA, never ADMIN | TC-SEC-010 |
| Out-of-scope returns 404, byte-identical to absent | TC-SEC-012 |
| Sort parameter cannot inject an ordering clause | TC-SEC-013 |
| Prediction endpoint rate limited, nothing written on 429 | TC-SEC-031 |
| Error bodies disclose nothing | TC-SEC-004 |
| Model artefact directory read-only; version matches the image | TC-SEC-019 |
| Compromised ML response rejected, not persisted | TC-SEC-018 |
| No hard-coded model values | TC-INT-010 |

---

## 11. Performance Validation

| Check | Target | Case |
|---|---|---|
| ML inference p95, 60 candidates | ≤ 400 ms | TC-ML-064 |
| Stage breakdown matches the profile | features ≈ 90 ms, SHAP ≈ 70 ms | TC-PERF-015 |
| `POST /api/predict` p95 warm | ≤ 1500 ms | TC-PERF-002 |
| Complaint list query p95 | ≤ 150 ms | TC-PERF-011 |
| ML resident memory | ≤ 512 MB | TC-PERF-012 |
| Artefacts loaded once at startup | 0 loads during a run | TC-PERF-006 |

---

## 12. Exit Criteria

- [ ] AC-P3-01 … AC-P3-18 pass
- [ ] All 74 phase test cases pass
- [ ] **All model gates cleared** by `evaluate.py`, exit code 0
- [ ] **TC-ML-071 passes** — shuffled labels collapse to chance, proving no feature leakage
- [ ] `model_metrics` row written; `model_card.json` produced
- [ ] `no_hardcode_check.sh` clean
- [ ] P2 regression green
- [ ] Zero unresolved Critical or High defects
- [ ] `CHANGELOG.md` carries a `Model` entry with every gate value

### The demonstrable gate

A developer, on a clean clone, runs `make setup`, opens `/complaints/C-10284`, clicks **Analyze Complaint**, and sees a real risk score, a ranked hotspot, a bounded window and at least five named factors — all produced by the model, all matching the persisted row.

If that works, the project has a product. If it does not, no later phase will create one.
