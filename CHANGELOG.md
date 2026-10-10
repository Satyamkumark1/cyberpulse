# CHANGELOG — CyberPulse AI

All notable changes to this project are recorded here.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Versioning follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Change-management rules — what must accompany each kind of change — are defined in `engineering/release-process.md` §5 and `project-management/decision-log.md`.

---

## [Unreleased]

### Model — evaluation scores ties fairly; TC-ML-071 now blocks release

The model is unchanged (same `risk_model.joblib` and `temporal_model.joblib` hashes) and so is every gated metric; only `model_card.json` and `bundle_manifest.json` were re-promoted (bundle `CyberPulse-Demo-v1-ac16dc3311c7`).

The shuffled-label ablation read 0.1215 against random 0.0633 — above TC-ML-071's 0.05 tolerance — and it was not leakage. Isotonic calibration of a no-signal model ties 98% of a complaint's cells, and `rank_metrics`' `h3_index` tie-break then fills the top 3 in a fixed order; ranking by `h3_index` alone scores exactly 0.1215. Baselines and ablations now use `tie_averaged_top3` (expected top-3 over random orderings of tied scores), so a scorer that separates nothing lands on the random baseline. The served composite has no ties at the rank-3 cut, so the gated served metrics are identical under either method. The label shuffle also now draws one generator across complaints instead of reseeding per group, which had applied the same permutation to every equal-sized complaint.

| Top-3 hit rate | Before | After |
|---|---|---|
| Shuffled labels | 0.1215 (fails TC-ML-071) | 0.0621 (passes) |
| Classifier, no feature removed | 0.8598 (deterministic tie-break) | 0.8491 |
| Remove spatial | 0.8598 | 0.8620 |
| Remove temporal | 0.8505 | 0.8515 |
| Remove network | 0.8692 | 0.8593 |
| Remove historical hotspot | 0.5514 | 0.5686 |
| Historical frequency baseline | 0.8785 | 0.8785 |
| Logistic regression baseline | 0.8692 | 0.8692 |

New in `model_card.json`: `comparisonWithHistory` — paired bootstrap (2,000 resamples of the 107 holdout complaints). Served ranker 0.8598 [0.7850, 0.9252]; historical frequency 0.8785 [0.8107, 0.9369]; difference −0.0187 [−0.0538, 0.0140]. On the 7 complaints whose true cell is outside history's top 3, the served ranker finds 1 (0.1429). The served ranker does not beat ranking by past withdrawals: the generator chooses the cash-out ATM from the victim's region and hot-ATM weighting, not from the mule chain, so spatial and network features carry no location signal (removing either raises the score slightly).

`evaluate.py` now fails, writing nothing, when the shuffled-label ablation exceeds random by more than 0.05.

### Model — retrained on point-in-time historical features

The committed artefacts were trained before `generate_training_data.py` stopped reading withdrawals that happened after a complaint was filed. Scored on the leak-free dataset they failed two release gates, so they were retrained (`signal_check.py` passed first). Seed 26184, same hyperparameters, same feature schema `fs-1`.

| Gate | Required | Old model, leak-free data | Retrained |
|---|---|---|---|
| ROC-AUC | ≥ 0.85 | 0.9594 | 0.9784 |
| PR-AUC | ≥ 0.45 | 0.4608 | 0.6928 |
| Precision | ≥ 0.75 | 1.0000 | 0.8000 |
| Recall | ≥ 0.70 | **0.0583 FAIL** | 0.8155 |
| F1 | ≥ 0.72 | **0.1101 FAIL** | 0.8077 |
| ECE | ≤ 0.10 | 0.0164 | 0.0030 |
| Top-1 hit rate | ≥ 0.45 | 0.5981 | 0.8131 |
| Top-3 hit rate | ≥ 0.72 | 0.8131 | 0.8411 |
| Top-5 hit rate | ≥ 0.85 | 0.8692 | 0.8692 |
| MRR | ≥ 0.58 | 0.7179 | 0.8405 |
| Temporal exact | ≥ 0.40 | 0.7093 | 0.6628 |
| Temporal within ±1 | ≥ 0.75 | 1.0000 | 1.0000 |

Baselines on top-3 hit rate: historical frequency 0.8785 and logistic regression 0.8692 both exceed XGBoost's 0.8411. Shuffled-label ablation 0.1215 against random 0.0633.

### Fixed — setup and test tooling that did not run

- `pnpm test:e2e` had no config; the four near-identical `playwright.*.config.ts` are now one `playwright.config.ts` with `map`, `demo`, `roles` and `safety` projects (`test:safety` added; `E2E_BASE_URL` replaces the per-suite variables). 36 tests in 6 files.
- `make setup` builds the two Python venvs (scripts, ML service), runs every Python step with the right one, takes `DATABASE_URL` from `apps/web/.env.local`, and always trains and evaluates (the "Phase 3 not yet built" branch is gone). README setup writes local values to that file; `.env.example` stays the deployment list.
- `apps/ml-service/ruff.toml` anchors first-party imports, so ruff reports the same from the repo root (CI, `make lint`) as from the service folder.
- Dependencies: `h3` moved to training requirements (the served app never indexes cells; `pandas`/`scipy` stay, `shap` needs them); `pytest-asyncio` and `@testing-library/react` removed (unused); `pip-audit` now covers training and scripts requirements; `@cyberpulse/config` loses a `main` pointing at no file and the unused Prettier preset.
- `devops/infrastructure.md`: one worker on Render's free tier, CI uses a Postgres service container (no Neon branch per PR).

### Changed — one copy of each duplicated helper

- `lib/apiFetch.ts` (`apiFetch`, `ApiError`, `jsonInit`) is the single client-side reader of the error envelope, typed from `@cyberpulse/shared/zod/error`. It replaces 16 hand-rolled `fetch` + error-parsing blocks and the separate `CitizenApiError`; citizen pages still render by code, never server text (ADR-020). `RoleSwitcher` keeps its own fire-and-forget call.
- `components/common/badges.ts` holds the severity / status / priority pill classes four pages had copied (they had already drifted). `RISK_COLORS` lives once in `components/map/types.ts`. `SettingsPanel` uses the shared `HealthResponse` type.
- Training: `train_risk_model(..., feature_cols)` also serves evaluate.py's baselines and ablations; temporal bin count and width come from `app/engine/temporal.py`; seed and feature-schema version from their single definitions. All 12 evaluation gates reproduce exactly.

### Removed — dead code, unused files, the web Docker image

- Web: `UnauthorizedError`, `logger.withRequest`, `reportService.filterOptions` (no callers). The rate limiter's hand-built 429 now goes through `toErrorResponse(new RateLimitedError())`, the single serialiser.
- ML: `InferenceFailed`, `ModelNotLoaded` (never raised; `engineering/error-handling.md` updated), `tests/manual_predict_smoke.py` (never collected, and it reintroduced the future-withdrawal leak), the unused generated schemas `health.py`, `prediction.py`, `predict_request.py` (`generate-pydantic.sh` now emits only the ML-service contracts), a duplicate import, `verify_manifest`. `clip_score` is now applied to the raw model probability, as coding-standards §3.3 required. Ruff is clean across `apps/ml-service`, `training/` included.
- Untracked `graphify-out/` (local absolute paths) and the regenerable `training/data/dataset.csv` (4.4 MB).
- `docker/Dockerfile.web`, the compose `web` service, its CI build and `output: "standalone"` — DEC-015; CR-06 reworded.
- Kept on purpose: `riskLevel.ts` and `isEligibleForExposure` (TC-UNIT-020/022/023), `kde_surface` (ADR-012, TC-ML-022 — implemented but not yet called by `/predict`).

### Fixed — values shown that the model did not produce

- Alert and investigation detail pages multiplied an already-percentage factor contribution by 100 ("7780.0%") and passed the confidence level through a number formatter ("NaN%"). Both now render through `FactorBar` and the level text. Covered by `tests/demo/prediction-detail.spec.ts`, which compares the page to the API response.
- `estimatedExposurePaise` was computed before the transaction wrote the new prediction, so the complaint was missing from its own cell's total and every first prediction stored ₹0. It is now computed inside the transaction and written with the row (`services/predictionService.int.test.ts`).
- Hotspot detail (API-031) now returns the latest prediction's `predictionRef` and exposure, so the drawer's Generate Alert (AC-010-05) can appear; the drawer no longer substitutes ₹0 for an absent exposure.
- The ML service reported the literal `CyberPulse-Demo-v1` on every prediction; it now reports the loaded `model_card.json` version (`tests/test_predict_version.py`).
- The investigation action panel takes `canTransition`/`canNote` from the capability matrix (`hasCapability`) instead of restating role rules.

### Fixed — predictions failed in a UTC database session

Postgres prints a whole-hour offset as `+00`, and drizzle passes `timestamptz` text through untouched. Pydantic rejects `+00`, so against Neon every `/predict` returned an ML 422; it only worked locally because that database ran in IST (`+05:30`). `packages/db/client.ts` now completes the offset to `+00:00`, keeping microseconds. Covered by `services/timestamps.int.test.ts`.

### Added — Deployment

- `render.yaml` for the ML service (Docker, Singapore, one worker, `/health` check), as `devops/infrastructure.md` already described. Built and run locally under a 512 MB cap: `modelLoaded: true`, 184 MB resident.
- Model artefacts (`*.joblib`, ~2 MB) are now committed instead of ignored, so an image built from the repo carries the model.

### Added — Phase 9 (Scam Shield, FEAT-17) — DEC-013, ADR-022

- Public `/safety` section in English and Hindi (`?lang=hi`): **Scam Check** (six scenarios × four statements, matched reasons with cited public advisories, never a score), **Verify Before You Pay** (`.bank.in` links, `1600xx` callers, `@valid` UPI handles — pure functions, nothing leaves the browser), **Report Now** (1930 first, then fraud type, amount and city only) and **status tracking** by complaint ID + one-time tracking code.
- `POST /api/citizen/reports` (API-100) and `POST /api/citizen/reports/status` (API-101) via `citizenReportService`. A report is a `DEMO`-origin complaint (`C-90000`…`C-99999`), a `citizen_reports` row holding only a SHA-256 hash of the code, and a `CITIZEN_REPORT_SUBMITTED` audit event, in one transaction. Status returns a stage only, under a strict schema; wrong code ≡ unknown ID.
- `CITIZEN` role: denied all 22 officer capabilities; sole holder of `citizenReports:create`/`:status`. Matrix 24 × 6 = 144 cases. A CITIZEN cookie on the dashboard shows an officer-only gate instead of 403 pages.
- Migration `0006_add_citizen_reports` (additive: enum value, sequence, table).
- `RATE_LIMITS.citizenReport` = 5/min per IP; `CITIZEN_AMOUNT_MIN_PAISE`/`MAX_PAISE` in shared constants.
- Demo reset now also clears `DEMO`-origin complaints and every prediction, investigation and alert that depends on them, whatever their own origin; responses and the confirmation gain `complaintsCleared`.
- `no_hardcode_check.sh` scans for Hindi equivalents of the prohibited claims and terms.
- Fixed: `Sidebar` said "Not an official MHA/I4C system", which the prohibited-claims scan rejects — `make verify` failed on it before this change. Now "Not an MHA/I4C system."
- Tests: 88 unit (29 role-matrix, 59 Scam Shield), 35 integration against the real database, 12 E2E at phone size including the full citizen → officer → alert → citizen chain against the real model.

### Added — Phase 7 (Demo Mode) — in progress

- The "RUN DEMO SCENARIO" control now runs **ten** complaints concurrently instead of one (`DEMO_COMPLAINT_IDS`, replacing the single `DEMO_COMPLAINT_ID` — DEC-012), each firing its own real `POST /api/predict` the moment it reaches the analysis step, not staggered behind the others. All six steps render all ten rows; the run advances once every row has *settled* (success or failure) and freezes only if *all ten* fail, so one complaint's failure degrades only that row. `RATE_LIMITS.predict` raised 20→30/min to cover the new per-run cost. `FR-19.1` rewritten, new `FR-19.4`/`AC-014-06` cover partial-failure independence; `tests/demo/scenario.spec.ts` rewritten for ten concurrent calls, row isolation and the partial/total-failure paths.
- `GUARD` and `I4C` added to `ActorRole` (migration `0005_add_guard_i4c_roles`, additive `ALTER TYPE ... ADD VALUE`) — the "Prototype role" selector now offers five roles, all still asserted-not-verified (ADR-019/ADR-021), none storing any identity. `GUARD` is read-only and identity-free — `hotspots:read`/`metrics:read`/`settings:read`/`health:read` only — with its own landing page, `/guard`, a duty-post roster composed from `hotspotService.list` and a new `guardPostService.listCoverageForCells` (set query, not one call per cell). Deliberately excluded from `/risk-map`: the hotspot drawer behind that route returns complaint-linked `fraudType`/`amountPaise` gated only by `hotspots:read`, which GUARD holds but `complaints:read` (which it lacks) was implicitly relying on to keep that data appropriately scoped. `I4C` (maps to the I4C Intelligence Analyst persona, `product/personas.md` PER-02) is a read-only, national-scope subset of LEA's profile with no case-management writes — needs no new page, since every route it can reach already exists and renders identically regardless of role.
- Fixed: `reportService.metrics()` was checking the `reports:read` capability instead of the documented `metrics:read` — harmless while every role's values for the two were identical, but `GUARD` is the first role where they diverge.
- Fixed: `InvestigationActionPanel`'s transition/note UI gating was written with only `BANK` in mind (`role !== "BANK"`); `I4C` would have seen a transition/note control that 403s on submit. Extended to `role !== "BANK" && role !== "I4C"` / `role !== "I4C"`, matching the capability matrix.
- `Sidebar` is role-aware for the first time — `GUARD` gets a small nav (Duty Coverage + Settings); the other four roles are unchanged, including `I4C`, whose nav is byte-identical to `LEA`'s.
- Decision log `DEC-011` records why this does not reverse `DEC-010` (no guard identity is stored; GUARD extends the existing no-auth role-switcher, not a new authenticated login).

- `/demo` — the guided six-step walkthrough (complaint → money trail → AI analysis → hotspot prediction → explanation → alert) over the fixed `DEMO_COMPLAINT_IDS` corpus, step state carried in the URL query string, a pre-warm `GET /api/health` on mount, and honest degradation (no score, ranking or window renders while the ML service is unreachable).
- Steps 3–6 issue one real `POST /api/predict` per demo complaint and reuse the complaint detail page's own `usePrediction` hook and `PredictionSummary`/`PredictionFactors` components — there is no second, demo-only prediction path (TC-INT-012).
- `resolveOrigin` (`services/lib/auth.ts`) reads `x-cyberpulse-origin` so a request from `/demo` tags what it writes `origin = 'DEMO'`; wired into `POST /api/predict` and `POST /api/alerts` (and, transitively, the investigation an alert upserts).
- `demoService.reset` / `GET,POST /api/demo/reset` — scoped to `origin = 'DEMO'`, idempotent, previews exact counts before the destructive call (`DemoResetControl`'s confirmation), and leaves a demo-origin investigation in place if a surviving non-demo alert still references it.
- Dashboard "Run Demo Scenario" control — navigates to `/demo?step=1&auto=1`, starting the run; does not duplicate the prediction call.
- One-click scenario (FR-19.1, AC-014-01) — `auto=1` in the query string plays the walkthrough through without a click per step. `components/demo/autoAdvance.ts` owns the decision as a pure function, so it is unit-tested without a DOM: presentation steps advance after a 3 s dwell, **step 3 advances only when the real prediction resolves** (no clock on the model step, AC-P7-04), and a failed prediction stops the run on the degraded panel with the remaining steps still navigable (TC-E2E-023). The run ends at step 5 — step 6 dispatches an alert, and sending one stays a human decision, so the scenario *enables* alert generation rather than performing it. The control doubles as the pause an auto-advancing region requires (WCAG 2.2.2); any manual step control also ends the run. Auto-advance navigates with `replace`, so the browser Back button leaves the run instead of walking backwards through it.
- Fixed: step 3 issued **two** `POST /api/predict` calls, not the one AC-P7-03 requires and the code comment claimed. The `prediction.isIdle` guard is a value captured at render, so React StrictMode's second effect invocation against the same instance still read it as idle. A `useRef` latch now bounds the call to once per mount, with `isIdle` still bounding it to once per run. Pre-dated the one-click scenario and reproduced on plain manual navigation to `/demo?step=3`.
- Fixed `mlClient.callPredict`: a connection failure that persisted through the one retry escaped as a raw `TypeError` (serialised as `INTERNAL_ERROR`/500) instead of the documented `MlUnavailableError` — the demo's degraded-mode path depends on this classification (AC-P7-08).
- `pipelineStages` added to the `PredictionResponse` contract (`packages/shared/schemas/prediction.schema.json`, regenerated Zod and Pydantic) as an optional, non-persisted field — present only on a freshly-computed prediction. Step 3 renders the model's own measured per-stage durations once the response arrives (AC-P7-04); no simulated ticks, no timer.
- Verified against the real stack (local ML service + Postgres, not mocks): all six steps, a genuine `POST /api/predict` and `POST /api/alerts` call, `origin = 'DEMO'` confirmed on the resulting `predictions`/`alerts`/`investigations` rows, and `demoService.reset` clearing exactly those rows while 500 seed complaints stayed untouched.

- `guard_posts` — staffed duty positions at ATMs (`GRD-00001` … , one per ATM per shift; day shifts everywhere, a night post additionally at historical-hotspot ATMs), generated from seed `26184`, 1068 rows across 520 ATMs. **A post is a position, not a person:** the table has nowhere to put a name or a phone number, which is what keeps the corpus inside FR-01.7 and `pii_scan.py` and the schema inside TC-SEC-022. Who stands at a post is the operating bank's record. Migration `0002_add_guard_posts` is additive with a documented rollback; `architecture/database-design.md` §4.5a updated.
- `guardPostService.listForCell` / `GET /api/guard-posts?h3Index=` — the duty posts covering one predicted hotspot cell. Reuses the `hotspots:read` capability rather than adding one: this is coverage *of a hotspot cell* and the role permissions are identical, so the 66-case matrix is unchanged. The alert modal shows it as **Site Coverage**, and renders nothing at all when a cell has no posts or the lookup fails — coverage is context, never a precondition for sending the alert.
- Alert modal recipients now read as destinations — "Local Police — Cyber Crime Cell", "Bank Cyber Cell — Fraud Desk", "I4C — Cybercrime Coordination Centre" — each with a one-line description of what that recipient does with it. The `recipient_kind` enum values are **unchanged**: `recipients` is a scope predicate in `alertService` (`'BANK' = ANY(recipients)`), not a label, so renaming the values would mean a migration plus a re-derived authorisation matrix.
- Fixed: the alert modal displayed every SHAP contribution multiplied by 100 — the model's `70` rendered as `7000.0%`. `contribution` is already a percentage (`explain.py` normalises the set to sum to 100 ± 0.5; the schema bounds it to [-100, 100]), so the extra `* 100` was fabricating the number on screen — CLAUDE.md's first rule and a `RULE-deployment.md` rollback trigger. `FactorBar`, used by the prediction panel and hotspot drawer, was always correct; the modal was the only caller. Covered by an integrity test that substitutes contributions into the intercepted `/api/predict` response and asserts the rendered values follow it, plus an absence assertion for any percentage of four digits or more.

- `atms.locality` (migration `0003_add_atm_locality`, additive and nullable, rollback documented) — the zone inside the city, which the generator has always had on each ATM but never wrote out. `hotspotService` now names a candidate cell `"T Nagar, Chennai"` instead of `"Chennai"`, so the five ranked hotspots in one city are distinguishable from one another instead of rendering five identical lines. Falls back to the city where a cell holds no ATM to take a locality from — never to an invented place name.

- Fixed: `packages/db/client.ts` created its postgres.js pool with `max: 10` and no `idle_timeout`, so the client held every connection it ever opened until the process exited. A production build instantiates the module once and is unaffected, but `next dev` re-instantiates it on each hot reload while the previous pool's connections stay open — a long editing session walked the local server to `max_connections` (observed: 96 idle of 100), after which every query failed with "remaining connection slots are reserved" and the UI honestly reported the prediction service as unavailable. The symptom points at the ML service; the cause is the web app's pool. Now `{ max: 10, idle_timeout: 20 }`; a full E2E suite leaves 8 connections instead of climbing.

- Run summary on step 6 — the whole chain in one place, so the run can be read without stepping back through it: complaint, money trail counts, model version and the measured pipeline stages, predicted hotspot, explanation, and whether an alert was dispatched. It renders through the *same* components the individual steps use (`PredictionSummary`, `PredictionFactors`, `PipelineStages`), so it cannot drift from what it recaps, and its six stage titles derive from `STEPS` so they always read as the stepper does. Absent values render `—`, never `0`. When the prediction never arrived, stages 3–6 say "Prediction service unavailable" and show no number of any shape — asserted by absence of percentage, currency and time-range patterns, not by absence of particular wrong values.
- The scenario now ends on step 6 rather than step 5. Arriving there dispatches nothing — an alert is sent only by pressing Generate Alert — so the run finishes on the summary instead of one click short of it, which is what FR-19.1's "enable alert generation" actually asks for. Dwell trimmed to 2500 ms so four dwelling steps stay inside AC-014-01's 15 s.
- Fixed: the dispatched-alert confirmation was lost when leaving step 6 and returning, because it lived in `AlertStep`'s own state and the component unmounted. Lifted to the walkthrough, where the summary also reads it.

- `ATM_SITE` recipient (migration `0004_add_atm_site_recipient`, additive `ALTER TYPE`) — the alert now also addresses the staffed duty post at the predicted ATM, selected by default, and shown with a readable label and a one-line explanation in both the alert modal and the alert detail page. It addresses a **post, never a person**: no guard identity or contact number exists anywhere in this schema (DEC-010). Enum values cannot be dropped in place, so the migration documents the type-rebuild cost of reverting; a web rollback alone needs nothing, since an older build simply never writes the value.
- **Authorisation change:** BANK scope widens from `'BANK' = ANY(recipients)` to `recipients && ARRAY['BANK','ATM_SITE']`, because the bank operates the ATM site and performs the cascade — an alert it cannot see is an alert nobody can action. The rule existed as **five separate copies** (three in `alertService`, two in `services/lib/scope.ts`); it is now defined once as `BANK_VISIBLE_RECIPIENTS`/`bankRecipientPredicate` in `services/lib/scope.ts` and consumed everywhere, so the alert, complaint and transaction scopes cannot drift apart. Covered by a new `alertService.int.test.ts` (7 cases): BANK sees a BANK alert and an ATM_SITE-only alert, gets an indistinguishable 404 for LEA-only and I4C-only, and `total` is scoped by the same predicate rather than post-filtered. Verified by reverting the widening — two of the seven fail. `security/authorization.md` §3 updated.
- Fixed: the integration suite ran its files in parallel against one shared database, so any test creating `origin = 'DEMO'` rows — which the testing convention tells every test to do — raced `demoService`'s reset tests, which count and delete exactly those rows. `fileParallelism: false` removes the class.

**Known gaps, not yet done:** analytics events (`demo_started` etc. — no analytics client exists anywhere in the app yet, not demo-specific debt — so TC-UI-070's event assertion remains unmet while its behavioural assertions are covered); deployment verification, keep-warm/observability, and the four recovery drills (all require a live deployment this environment doesn't have).

### Added — Phase 6 (Reporting, QA, Security & Performance)

- `/reports` — six server-aggregated Recharts visualisations (complaints over time, suspicious transactions, alert severity, predicted hotspots, top districts, fraud type mix) with server-side date/city/state/fraud-type filters, a 365-day range cap, per-chart empty states, and a `sr-only` accessible table equivalent for every chart.
- `PROTOTYPE MODEL EVALUATION` panel reading `model_metrics`, showing "Model evaluation not yet run" on an empty table rather than zeros.
- `/settings` — read-only System Mode/Data Mode/model version, ADMIN-editable HIGH/MEDIUM display thresholds (validated client, server and by a database `CHECK`, audited on write), notification-preference toggles, and a system health panel with colour+icon+text status.
- `deriveRiskLevel` (`services/lib/riskLevel.ts`) — the pure score→level mapping FR-22 requires, keeping a threshold change display-only and the stored `riskScore` untouched (TC-UNIT-022, TC-UNIT-023).
- Integration coverage for `reportService` and `settingsService` against a live database, including the range-cap boundary, BANK out-of-scope aggregation, and the ADMIN-only/audited settings write.

### Added — Phase 5 (Actionable Intelligence)

- Alert dispatch and acknowledgement APIs with server-derived severity and exposure, recipient validation, BANK scoping, and a 10-per-minute role rate limit.
- Transactional alert-to-investigation propagation and append-only audit events; acknowledgement uses a conditional update so concurrent or repeated requests preserve its original timestamp.
- Six-state investigation lifecycle with optimistic concurrency, required closure/backward-transition notes, scoped BANK notes, and consolidated alert, prediction, money-trail, note, and audit timeline views.

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
