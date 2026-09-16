# PERFORMANCE TEST CASES — CyberPulse AI

| Field | Value |
|---|---|
| Version | 1.0 |
| Count | 16 |
| Tools | k6 (API) · Lighthouse CI (page) · Playwright timing (interaction) · pytest-benchmark (ML) |
| Environment | **Preview deployment only** — local measurements flatter every budget |
| Budgets | `architecture/performance-architecture.md` §1 |

---

## API Latency

### TC-PERF-001 — Read API p95
**Req** NFR-01 · **P6** · **High** · **k6** · **Automated**
**Setup:** 20 virtual users, 5 minutes, mixed reads across complaints, transactions, hotspots and alerts at 25-row pages.
**Expected:** p95 ≤ 300 ms, p99 ≤ 600 ms, error rate 0. Latency does not drift upward by more than 20% across the run.

### TC-PERF-002 — Prediction p95, warm
**Req** NFR-02 · **Critical** · **k6**
**Setup:** Service pre-warmed. 10 VUs issuing predictions across distinct complaints for 3 minutes, staying inside the 20/min/role limit.
**Expected:** p95 ≤ 1500 ms, p99 ≤ 3000 ms. Zero fabricated results. 429s appear only above the documented limit.

### TC-PERF-011 — List query p95 at the database
**Req** NFR-19 · **High**
**Steps:** Instrument `db_query_duration_ms` during TC-PERF-001.
**Expected:** p95 ≤ 150 ms. `EXPLAIN ANALYZE` on each list query shows an index scan, never a sequential scan on an indexed predicate.

### TC-PERF-005 — Graph traversal under depth and cycles
**Req** FR-04.3 · **High**
**Setup:** Depth 4 on typical chains; depth 6 on the deepest; the cyclic fixture.
**Expected:** Depth 4 p95 ≤ 300 ms. Depth 6 within the time budget. Cyclic fixture returns in < 1 s with no duplicates.

---

## Page and Interaction

### TC-PERF-010 — Dashboard LCP
**Req** NFR-03 · **High** · **Lighthouse CI**
**Expected:** LCP ≤ 2.5 s, CLS ≤ 0.05, TBT ≤ 300 ms on desktop broadband throttling. The KPI row paints before the map bundle arrives.

### TC-PERF-003 — Map interactive with all layers
**Req** NFR-04 · **High** · **Playwright timing**
**Setup:** `/risk-map` with all three layers enabled, 520 ATMs and 20 hotspots in view.
**Expected:** Basemap paint ≤ 600 ms; all layers interactive ≤ 1500 ms. ATM markers cluster above 50 in view. The ATM request carries a `bbox`.

### TC-PERF-004 — Graph render at 200 nodes
**Req** NFR-05 · **High** · **Playwright timing**
**Expected:** ≤ 800 ms from data arrival to painted layout. Above 200 nodes, the top-weighted subgraph renders with a truncation notice rather than degrading.

### TC-PERF-013 — Table render at 100 rows
**Medium**
**Expected:** ≤ 400 ms. Above 100 rows, virtualisation engages and scroll stays at 60 fps.

### TC-PERF-014 — Bundle budgets per route
**High** · **CI build check**
**Expected:** `/dashboard` ≤ 180 KB gz, `/complaints` ≤ 140 KB, `/complaints/[id]` ≤ 160 KB, `/risk-map` ≤ 320 KB, `/reports` ≤ 260 KB. Map, graph and chart libraries absent from the initial dashboard bundle.

---

## ML Service

### TC-PERF-006 — Inference latency and artefact loading
**Req** NFR-02, FR-07.4 · **High** · **pytest-benchmark**
**Setup:** 100 predictions with 60 candidates on the reference machine.
**Expected:** p95 ≤ 400 ms, p99 ≤ 700 ms. Artefacts loaded once at startup — asserted by observing zero artefact loads during the run.

### TC-PERF-012 — ML memory ceiling
**Req** NFR-20 · **Medium**
**Expected:** Resident memory ≤ 512 MB under sustained load; no monotonic growth over 1,000 predictions, which would indicate a leak.

### TC-PERF-015 — Stage breakdown matches the documented profile
**Medium**
**Expected:** Feature build ≈ 90 ms, scoring ≈ 40 ms, SHAP ≈ 70 ms, ranking plus temporal ≈ 50 ms. A material deviation indicates a regression in a specific stage and is diagnosable from `/metrics`.

### TC-PERF-007 — Cold start behaviour
**Req** FR-18.3 · **Critical**
**Setup:** Allow the service to spin down; open `/demo`.
**Expected:** A warm-up request fires on mount. Health reports `degraded`, not `down`, during warm-up. The user sees progress, never a blank state or a fabricated value. First prediction succeeds within 30 s.

---

## Load and Endurance

### TC-PERF-020 — Concurrent read load
**High** · **k6**
**Setup:** 20 VUs browsing lists for 5 minutes.
**Expected:** p95 ≤ 300 ms, zero errors, no connection-pool exhaustion.

### TC-PERF-021 — Concurrent prediction load
**Critical** · **k6**
**Setup:** 20 concurrent predictions.
**Expected:** p95 ≤ 1500 ms warm. Zero fabricated results. 429s only above the rate limit. No cross-request contamination — the same complaint predicted concurrently yields identical results.

### TC-PERF-022 — Sustained mixed load
**Medium** · **k6**
**Setup:** 5 rps mixed for 15 minutes.
**Expected:** No latency drift above 20%. No memory growth. No connection exhaustion. Error rate 0.

---

## Reporting

Every run produces a k6 summary, a Lighthouse report and a Playwright timing artefact, attached to the CI run. A budget breach fails the build; waiving one requires a `project-management/decision-log.md` entry stating the new budget and its justification.

---

## Summary

| Group | Cases | Critical | High | Medium |
|---|:--:|:--:|:--:|:--:|
| API latency | 4 | 1 | 3 | 0 |
| Page and interaction | 5 | 0 | 4 | 1 |
| ML service | 4 | 1 | 1 | 2 |
| Load and endurance | 3 | 1 | 1 | 1 |
| **Total** | **16** | **3** | **9** | **4** |

**Measurement discipline:** all figures come from the preview environment. Local runs are useful for catching a gross regression and useless for certifying a budget, because local is faster than production in compute, network and cold start — the three dimensions the budgets exist to constrain.
