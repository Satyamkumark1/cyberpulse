# CHANGELOG — CyberPulse AI

All notable changes to this project are recorded here.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Versioning follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Change-management rules — what must accompany each kind of change — are defined in `engineering/release-process.md` §5 and `project-management/decision-log.md`.

---

## [Unreleased]

### Model — Phase 3, `CyberPulse-Demo-v1` initial training run

First trained artefacts. No prior gate values exist for this model version — all figures below are the initial baseline, measured on the holdout split (seed 26184, n_train=15,432, n_test=5,259):

| Gate | Required | Achieved |
|---|---|---|
| ROC-AUC | ≥ 0.850 | 0.978 |
| PR-AUC | ≥ 0.450 | 0.742 |
| Precision @ 0.40 | ≥ 0.750 | 0.813 |
| Recall @ 0.40 | ≥ 0.700 | 0.837 |
| F1 @ 0.40 | ≥ 0.720 | 0.825 |
| Calibration ECE | ≤ 0.100 | 0.001 |
| Top-1 hit rate | ≥ 0.450 | 0.813 |
| Top-3 hit rate | ≥ 0.720 | 0.869 |
| Top-5 hit rate | ≥ 0.850 | 0.879 |
| MRR | ≥ 0.580 | 0.852 |
| Temporal exact bin | ≥ 0.400 | 0.655 |
| Temporal within ±1 bin | ≥ 0.750 | 1.000 |

All twelve gates clear; `model_metrics` row written by `evaluate.py`; `model_card.json` produced with baselines and ablations. Hyperparameters selected by grid search (`training/search_hyperparams.py`, the grid in `ai/model-selection.md` §5) scored on the calibration split: `max_depth=6, learning_rate=0.05, n_estimators=200, min_child_weight=10, gamma=0`.

**Known gap against AC-P3-05.** XGBoost (top-3 0.869) does not beat the logistic-regression baseline (0.897) by a margin — the two are close because `historical_hotspot_score` alone (DEC-008) now carries the large majority of ranking signal, an artefact of the concentration change below rather than a modelling defect; both comfortably clear the release gate. Left as a reported gap rather than further tuned, given time budget.

### Fixed — synthetic generator (found while training the Phase 3 model)

- **Cash-out always preceded the complaint.** `complaint_timestamp` was fixed at `first_txn_time + uniform(2, 72) hours`, while the fraud chain and withdrawal complete within about an hour — every complaint in the corpus was filed after its own cash-out had already happened (`hours_to_withdrawal` negative for 100% of sampled rows), leaving FEAT-08's temporal model no future window to ever learn. Fixed by redrawing report delay (mean ~2h) and cash-out delay (drawn per `linked_depth`, DEC-009) so cash-out timing spans the 24-hour horizon and ~53% of cases are genuinely predictive. See `project-management/decision-log.md` DEC-009.
- **Ranking gates unreachable by construction.** The original zone/ATM weighting (45/25/18/12 zone split, 8x hot-ATM multiplier) gave a theoretical top-3 ceiling of ~0.30 no matter the model — confirmed by a 324-combination hyperparameter grid search plateauing there. Generator concentration sharpened (regions.py, patterns.py) per the project owner's sign-off. See DEC-008.
- **XGBoost sklearn API rejects non-contiguous class labels.** `XGBClassifier(objective="multi:softprob", num_class=12)` raises `ValueError: Invalid classes inferred...` unless the training labels happen to already be a dense `0..k-1` range — not guaranteed once temporal bins are unevenly populated. `app/engine/model.py`'s `TemporalModel` wrapper now label-encodes for `fit` and decodes `predict_proba`'s columns back through the real bin numbers; every call site (`train.py`, `evaluate.py`, `app/routers/predict.py`) goes through it rather than raw `argmax`.
- **Isotonic calibration collapsed ranking ties.** Using the calibrated score to rank per-complaint candidates (rather than only to report the top pick's percentage) reduced 6,416 holdout scores to 31 unique values, measurably hurting top-3 hit rate. `rankedHotspots` and the displayed `riskScore` are the same field by design (architecture/api-design.md's invariant), so this is intentional, not reverted — noted here because it is the reason ranking metrics are sensitive to calibration-split size.

### Added — Phase 3 (Core Intelligence & Complaint Workflow)

- `app/engine/features.py` — the 13-feature vector (FEAT-05), deterministic, documented defaults, `assert_schema` guard; `training/features.py` symlinked to it (TC-UNIT-014).
- `app/engine/risk.py`, `hotspot.py`, `temporal.py`, `explain.py` — threshold/confidence derivation, H3+DBSCAN+KDE hotspot ranking with the documented combined-score weights, 12-bin window construction, SHAP factor aggregation with `collapse_small`.
- `training/generate_training_data.py`, `train.py`, `evaluate.py`, `search_hyperparams.py` — full pipeline against the real seeded corpus: complaint-grouped 60/15/25 split, XGBoost risk + temporal models, isotonic calibration, baselines (random, nearest-cell, historical-frequency, logistic regression), ablations including the shuffled-label leakage check (TC-ML-071), gate enforcement that writes nothing on failure.
- `POST /predict` (ML service) — full ML-001 contract, `pipelineStages[]` timing, honest degradation on missing artefacts (503), schema mismatch (500, never scored), and SHAP failure (`explanationAvailable: false`).
- `packages/shared/schemas/{predict-request,prediction,ml-predict-request,ml-predict-response}.schema.json` — the predict contract, codegen'd to Zod and Pydantic.

### Added — Phase 2 (Infrastructure & Data Foundation)

- pnpm workspace monorepo: `apps/web` (Next.js), `apps/ml-service` (FastAPI), `packages/{db,shared,config}`, `scripts/{generate-data,seed,evaluation}`.
- Drizzle schema: all 16 tables, 17 enums, 31 named indexes, every invariant from `architecture/database-design.md` §5 expressed as a database `CHECK`, not only Zod — verified directly against PostgreSQL 16 (TC-P2-02, all seven boundary cases rejected).
- `packages/shared`: JSON Schema → Zod + Pydantic codegen working end to end (`error`, `health`, `ml-health` contracts); a field rename breaks both builds in the same commit (AC-P2-11).
- Synthetic data generator (`scripts/generate-data`): seed 26184, byte-identical regeneration (FR-01.1), all eight planted patterns statistically detectable and independently toggleable (TC-DATA-006, TC-DATA-009) — time-of-day, day-of-week, withdrawal density, transaction velocity, linked-account reuse, distance, historical hotspot concentration, amount behaviour by fraud type.
- `signal_check.py` and `pii_scan.py` — the two non-bypassable pipeline gates, each proven to block on the specific negative case it exists for (TC-DATA-009, TC-SEC-020), not merely to run.
- `packages/db/seed/seed.ts` — idempotent, manifest-checksum-verified corpus load; 75,320 rows in under 10 s against local Postgres, well inside the 90 s budget (TC-P2-03, TC-P2-04).
- FastAPI and Next.js skeletons: composed `GET /api/health` (API-080) verified across healthy/degraded/unhealthy states against a live database and ML service; prototype badge and disclaimer on every shell route, asserted character-for-character.
- Structured JSON logging both services (pino / structlog), correlated by `requestId`, no request bodies or subject identifiers.
- `docker-compose.yml`, `docker/Dockerfile.{ml,web}`, `Makefile` (`make setup` / `dev` / `verify`), CI workflow covering gates 1–7.

### Fixed

- Alert `recipients` empty-array `CHECK` used `array_length()`, which returns `NULL` (not `0`) on an empty array — a `CHECK` treats `NULL` as passing, so a zero-recipient alert would have been accepted. Rewritten with `cardinality()`, caught by TC-P2-02 before merge.
- Generator: consecutive `next_mule()` draws could return the same account for adjacent hops, producing a self-transfer the database correctly rejects. Fixed by excluding the previous hop's account from the draw.
- Corpus CSVs (Python `csv.writer`) use CRLF line endings; the seed script's line-splitting left a stray `\r` on each row's last column, nulling `complaints.state`. Fixed by splitting on `\r?\n`.

### Security

- `pnpm audit --audit-level=high`: 49 advisories (5 critical, 17 high) resolved by upgrading `next` 15.1→15.5.25, `drizzle-orm` 0.36→0.45.2, `drizzle-kit` 0.28→0.31, `vitest` 2→5, and a `pnpm.overrides` pin forcing `postcss` ≥8.5.18 inside Next's own bundled dependency tree — down to one moderate advisory in a dev-only transitive tool, below the gate 6 threshold.
- `pip-audit`: 14 advisories in `starlette` resolved by upgrading FastAPI 0.115→0.141.1 (starlette 0.41→1.6 transitively) — zero known vulnerabilities remaining.

### Planned
- V1 hardening scope per `ROADMAP.md` §3: identity provider, enforced RBAC, state partitioning, alert SLA, PDF handover pack, model card, PostGIS migration, audit log UI.

---

## [1.0.0-docs] — Documentation Baseline

This entry records the completion of Phase 1 (Research & Architecture). No application code exists at this point by design; the documentation is the deliverable of P1 and the input to P2.

### Added
- `PROJECT_BRIEF.md` — project definition, constraints, ten recorded assumptions (ASM-01 … ASM-10), technology stack with justification, responsible-use statement.
- `PRD.md` — goals, non-goals, personas, product-level requirements, scope boundary through V1/V2/Future, metric definitions with prototype gates, release criteria.
- `REQUIREMENTS.md` — 132 traceable requirements (96 functional including sub-requirements, 30 non-functional, 6 constraint) each with priority, verification method, test-case references and delivery phase.
- `USER_STORIES.md` — 49 stories across 10 epics, every feature carrying at least one P0 story.
- `ACCEPTANCE_CRITERIA.md` — Given/When/Then criteria for all 16 features plus five global criteria; no unmeasurable language.
- `FEATURE_SPECIFICATIONS.md` — 14-section specification for each of FEAT-01 … FEAT-16 covering flow, UI, API, data, edge cases, failure modes, permissions, security, analytics and tests.
- `ROADMAP.md` — eight-phase delivery model, 88 person-day estimate, release plan, dependency ordering, scope guardrails.
- Product, UX, architecture, security, AI, engineering, DevOps, testing, implementation, project-management, business, prompt and Claude Code configuration document sets.

### Decisions recorded
- **ADR-014** — the AI/intelligence layer is delivered in Phase 3 rather than the conventional Phase 5, because the predictive engine is the product rather than an enhancement to it.
- **ASM-01** — H3 resolution 8 adopted as the hotspot granularity.
- **ASM-02** — 2-hour bins adopted as the temporal granularity.
- **ASM-05** — hotspot ranking adopted over coordinate regression, to yield top-k output and hit-rate metrics.
- **ASM-10** — estimated exposure defined by formula so that UI and API cannot diverge.

### Security and safety posture established
- Synthetic-data-only constraint (CR-01) with a blocking PII scanner in the seeding pipeline.
- Prohibited-claims constraint (CR-02) with an automated text scan in CI.
- Neutral-terminology constraint (CR-03) limiting account risk language to "Mule Account", "Suspicious Account" and "Risk Indicator".
- No-accusation constraint (CR-04).

---

## Change Log Conventions

| Section | Use for |
|---|---|
| `Added` | New features, endpoints, documents, tables |
| `Changed` | Behaviour changes to existing capability |
| `Deprecated` | Capability scheduled for removal, with the target version |
| `Removed` | Capability removed, with the reason |
| `Fixed` | Defect fixes, referencing the defect ID |
| `Security` | Security-relevant changes, always listed even when minor |
| `Model` | Model version changes, retraining, threshold changes, metric movements |

A `Model` entry is mandatory whenever `model_version` changes, and must state the previous and new metric values for every gate in `ai/evaluation-framework.md`. A model change is never released without its metrics being recorded here.
