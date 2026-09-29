# INTEGRATION TEST CASES — CyberPulse AI

| Field | Value |
|---|---|
| Version | 1.0 |
| Count | 70 |
| Environment | Route handler → service → **real PostgreSQL**; ML real or contract-stubbed |
| Practice | `engineering/integration-testing.md` |

---

## Integrity — TC-INT-010 … 013

The four cases that protect this product's defining failure mode.

### TC-INT-010 — No hard-coded hotspot or risk value in the web application
**Req** FR-08.6, NFR-15 · **Feature** FEAT-07 · **Phase** P3 · **Critical** · **Automated**
**Steps:** Run `scripts/evaluation/no_hardcode_check.sh` over `apps/web`, excluding `__tests__`, `*.fixture.ts` and the i18n label map. Then add `const riskScore = 0.917` to a component and re-run.
**Expected:** Clean run reports zero matches. The seeded violation is detected and the script exits non-zero.
**Severity if failed:** Critical

### TC-INT-011 — Model metrics come from the database
**Req** FR-17.2 · **Feature** FEAT-13 · **Phase** P6 · **Critical** · **Automated**
**Steps:** Update `model_metrics.roc_auc` directly to 0.123; call `GET /api/reports/metrics`. Then truncate the table and call again.
**Expected:** First call returns 0.123. Second returns `{ "available": false }` — never zeros.

### TC-INT-012 — Demo mode uses the production prediction path
**Req** FR-19.2 · **Feature** FEAT-14 · **Phase** P7 · **Critical** · **Automated**
**Steps:** Static check that the demo route imports the same prediction hook as the complaint detail page; run the demo scenario counting `/api/predict` calls.
**Expected:** Exactly one call. No demo-only prediction module exists in the source tree.

### TC-INT-013 — The response equals the persisted row
**Req** NFR-26 · **Phase** P3 · **Critical** · **Automated**
**Steps:** `POST /api/predict` for `C-10284`; read `predictions` and `risk_factors` directly; compare every field.
**Expected:** `riskScore`, `riskLevel`, `confidence`, window bounds, `likelyAtms`, `estimatedExposurePaise` equal. `rankedHotspots` jsonb round-trips identically. Factor count and contributions match to 3 dp.

---

## Prediction Path — TC-INT-020 … 029

### TC-INT-020 — ML unavailable produces a typed 503 and persists nothing
**Req** NFR-07 · **Critical** · **Automated**
**Steps:** Stop the ML service; `POST /api/predict`; count rows before and after.
**Expected:** 503 `ML_UNAVAILABLE`. Zero rows written to `predictions` or `risk_factors`. `/api/health` reports `mlService.status: "down"` and overall `degraded`.

### TC-INT-021 — Database loss is retried then surfaced
**Req** NFR-21 · **High** · **Automated**
**Steps:** Sever the connection mid-request; observe retry attempts and the eventual response.
**Expected:** Three retries at 100 / 400 / 1600 ms, then 503. Health reports `unhealthy`. No partial write.

### TC-INT-022 — Timeout at 8 s, with no retry
**Req** NFR-22 · **Critical** · **Automated**
**Steps:** Stub the ML service to respond after 12 s; measure elapsed time and count upstream calls.
**Expected:** 504 `TIMEOUT` at ~8 s. Exactly one upstream call — a timeout is never retried.

### TC-INT-023 — Connection error is retried exactly once
**High** · **Automated**
**Expected:** A connection refusal triggers one retry. A 4xx from the ML service triggers none.

### TC-INT-024 — Prediction persistence is atomic
**Req** FR-10.6 · **Critical** · **Automated**
**Steps:** Inject a failure in the `risk_factors` insert.
**Expected:** Rollback. Zero `predictions` rows. A prediction without its factors cannot exist.

### TC-INT-025 — Malformed ML response is rejected before persistence
**Critical** · **Automated**
**Steps:** Stub six malformed shapes (score 1.5; three factors; sum 140; nine-hour window; raw feature name; wrong model version).
**Expected:** Each fails shared-schema validation in the ML client; 500 returned; nothing persisted.

### TC-INT-026 — Re-analysis creates a new prediction, not an update
**Medium** · **Automated**
**Expected:** `forceRefresh: true` inserts a second row; the first is retained; the detail view shows the most recent by `created_at`.

### TC-INT-027 — Complaint with no transactions still predicts
**Req** FR-06.3 · **High** · **Automated**
**Test data:** `C-10281`
**Expected:** 201 with `confidence: "LOW"`. Chain-derived features took documented defaults. No exception.

### TC-INT-028 — Concurrent predictions for one complaint
**High** · **Automated**
**Steps:** Ten concurrent `POST /api/predict` for the same complaint.
**Expected:** All succeed or are rate-limited. Identical `riskScore` across all successes. No deadlock.

### TC-INT-029 — Prediction respects the configured threshold
**Medium** · **Automated**
**Expected:** Changing `settings.threshold_high` changes the `riskLevel` on a new prediction; existing stored scores are unchanged.

---

## Layering — TC-INT-030 … 031

### TC-INT-030 — No component imports the data layer or the auth module
**Req** NFR-29 · **High** · **Automated**
**Expected:** ESLint `no-restricted-imports` reports zero violations. A seeded violation fails the build.

### TC-INT-031 — Route handlers delegate to services
**Req** NFR-30 · **High** · **Automated**
**Expected:** No route handler imports `@cyberpulse/db`. Every handler's body is validate → resolve role → authorise → delegate → respond.

---

## Alerts and Audit — TC-INT-040 … 049

### TC-INT-040 — Alert dispatch is atomic across three writes
**Req** FR-14.3 · **Critical** · **Automated**
**Steps:** Inject a failure at each of the alert insert, investigation upsert and audit insert in turn.
**Expected:** In all three cases, zero rows in all three tables. 500 returned.

### TC-INT-041 — Alert creates or advances the investigation
**Req** FR-15.6 · **High** · **Automated**
**Expected:** No prior investigation → one created in `ALERT_SENT`. Existing in `UNDER_REVIEW` → advanced to `ALERT_SENT` with an audit event recording the automatic transition.

### TC-INT-042 — Concurrent alerts on one prediction
**Medium** · **Automated**
**Expected:** Both persist with distinct `alert_id`, each attributed to its author role. Exactly one investigation exists (unique constraint holds).

### TC-INT-043 — Acknowledgement is idempotent
**Req** FR-14.4 · **High** · **Automated**
**Expected:** First PATCH sets `acknowledged_at`; second returns 200 and leaves it unchanged; two audit events are written, one per request.

### TC-INT-044 — Server-derived fields rejected from the client
**Req** FR-14.2 · **Critical** · **Automated**
**Expected:** Supplying `severity`, `exposurePaise`, `locationName` or window bounds returns 400. Nothing written.

### TC-INT-045 — Rate limit writes nothing
**Req** FR-14.5 · **High** · **Automated**
**Expected:** The 11th alert in a minute returns 429 with `Retry-After`; row count unchanged; a 429 is never audited as a dispatch.

---

## Investigations — TC-INT-050 … 055

### TC-INT-050 — Invalid transitions rejected, state unchanged
**Req** FR-15.2 · **Critical** · **Automated**
**Expected:** Every invalid pair returns 409 `INVALID_TRANSITION`; the stored status is unchanged; no audit event is written.

### TC-INT-051 — Optimistic concurrency
**High** · **Automated**
**Expected:** Two concurrent PATCHes with the same `expectedUpdatedAt` produce one 200 and one 409 `CONFLICT`.

### TC-INT-052 — One investigation per complaint
**High** · **Automated**
**Expected:** A second create returns 409; the database unique constraint is the backstop and is exercised.

### TC-INT-053 — Empty note rejected at both layers
**Req** FR-15.3 · **Medium** · **Automated**
**Expected:** Whitespace-only body returns 400. A direct insert bypassing validation is refused by the `CHECK` constraint.

### TC-INT-054 — Resolve requires a closure note
**Medium** · **Automated**
**Expected:** Transition to `RESOLVED` without a note returns 400; with a note, 200.

### TC-INT-055 — Backward transition limited to one step
**Medium** · **Automated**
**Expected:** `MONITORING → ALERT_SENT` with a note succeeds; `MONITORING → ANALYZING` returns 409.

---

## Graph Traversal — TC-INT-060 … 063

### TC-INT-060 — Cyclic chain terminates
**Req** FR-04.3 · **Critical** · **Automated**
**Expected:** Returns within 1 s; no duplicate node IDs; the visited set prevents looping.

### TC-INT-061 — Depth bound enforced
**High** · **Automated**
**Expected:** `depth=10` returns 400 naming the field; `depth=4` returns within 300 ms p95.

### TC-INT-062 — Node cap and truncation disclosure
**High** · **Automated**
**Expected:** Above 200 nodes, `truncated: true` with the true `nodeCount`; the top-weighted subgraph is returned.

### TC-INT-063 — Chain with no withdrawal
**Medium** · **Automated**
**Expected:** Terminal node rendered as "No withdrawal observed"; no ATM node fabricated.

---

## Demo Reset — TC-INT-070 … 072

### TC-INT-070 — Reset is scoped to demo origin
**Req** FR-18.2 · **Critical** · **Automated**
**Steps:** Record counts for all sixteen tables; create demo and user-origin alerts and investigations; reset.
**Expected:** Only `origin = 'DEMO'` rows removed. Seed counts unchanged. User-origin records survive.

### TC-INT-071 — Reset is idempotent
**High** · **Automated**
**Expected:** Second call succeeds, returns zero counts, changes nothing.

### TC-INT-072 — Reset is ADMIN-scoped
**High** · **Automated**
**Expected:** LEA and BANK receive 403; nothing is deleted.

---

## Health and Settings — TC-INT-080 … 083

### TC-INT-080 — Health composes all three components
**Req** FR-23 · **High** · **Automated**
**Expected:** Each component reports status and latency. Stopping ML changes `mlService.status` to `down` and overall to `degraded` within one poll. Health never throws.

### TC-INT-081 — Health distinguishes warming from down
**Medium** · **Automated**
**Expected:** During the documented warm-up window, `mlService.status` is `degraded`, not `down`.

### TC-INT-082 — Threshold constraint enforced by the database
**Req** FR-22 · **High** · **Automated**
**Expected:** `thresholdHigh <= thresholdMedium` returns 400; a direct update bypassing validation is refused by the `CHECK`.

### TC-INT-083 — Settings write is ADMIN-only and audited
**High** · **Automated**
**Expected:** LEA and BANK receive 403. An ADMIN write produces one audit event.

---

## Scam Shield (FEAT-17) — TC-SAFE-010 … 021

Real database, no mocks of it. Files: `services/citizenReportService.int.test.ts`, `services/demoService.int.test.ts`, `services/lib/auth.test.ts` (matrix).

| ID | Case | Req | Priority |
|---|---|---|---|
| TC-SAFE-010 | Submit persists a `DEMO` complaint (`C-9####`, seeded city's state, valid H3 cell), a `citizen_reports` row whose hash is SHA-256 of the returned code, and a `CITIZEN_REPORT_SUBMITTED` audit event; the response equals what was persisted | FR-28.1, FR-28.3, FR-29.2 | Critical |
| TC-SAFE-011 | Each of nine server-derived fields → 400 naming the field | FR-28.2 | Critical |
| TC-SAFE-012 | Unknown key, amount 0, 99, fractional, above ₹10 crore, unknown fraud type → 400; 100 paise → 201 | FR-28 | High |
| TC-SAFE-013 | A city outside the seeded list → 400; nothing written | FR-28 | High |
| TC-SAFE-014 | Audit write fails inside the transaction → no complaint row survives | FR-28.3 | Critical |
| TC-SAFE-015 | Sixth report in a minute from one IP → 429; nothing written | FR-28.4 | High |
| TC-SAFE-016 | Status is RECEIVED for a new report (code in any case, no dashes); ALERT_SENT once its investigation is | FR-29 | High |
| TC-SAFE-017 | Wrong code and unknown ID → byte-identical 404 bodies; a seeded complaint is not trackable | FR-29.1 | Critical |
| TC-SAFE-018 | Status response keys are exactly `complaintId`, `stage`, `updatedAt` | FR-29 | Critical |
| TC-SAFE-019 | CITIZEN → 403 on all 22 officer capabilities; every other role → 403 on both citizen capabilities (matrix 24 × 6 = 144) | FR-20.4 | Critical |
| TC-SAFE-020 | Reset deletes a citizen complaint with the USER-origin prediction, investigation and alert made on it; counts previewed and returned; seed complaints and predictions unchanged | FR-30.1 | Critical |
| TC-SAFE-021 | Schema introspection finds no personal-data column (TC-SEC-022 re-run with `citizen_reports`) | FR-28 | Critical |

---

## Summary

| Group | Cases | Critical | High | Medium |
|---|:--:|:--:|:--:|:--:|
| Integrity | 4 | 4 | 0 | 0 |
| Prediction path | 10 | 4 | 4 | 2 |
| Layering | 2 | 0 | 2 | 0 |
| Alerts and audit | 6 | 2 | 3 | 1 |
| Investigations | 6 | 1 | 2 | 3 |
| Graph traversal | 4 | 1 | 2 | 1 |
| Demo reset | 3 | 1 | 2 | 0 |
| Health and settings | 4 | 0 | 3 | 1 |
| Authorisation (66 generated from the matrix, counted once) | 19 | 8 | 11 | 0 |
| Scam Shield (FEAT-17) | 12 | 8 | 4 | 0 |
| **Total** | **70** | **29** | **33** | **8** |
