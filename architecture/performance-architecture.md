# PERFORMANCE ARCHITECTURE — CyberPulse AI

| Field | Value |
|---|---|
| Version | 1.0 |
| Targets | NFR-01 … NFR-05, NFR-19, NFR-20 |
| Measurement | k6 (API), Lighthouse (page), Playwright timing (interaction), pytest-benchmark (ML) |
| Related | `engineering/performance.md` (practices), `test-cases/performance-tests.md` (cases) |

---

## 1. Budgets

| ID | Path | p95 budget | Hard fail |
|---|---|---|---|
| NFR-01 | Read APIs (list, detail) | 300 ms | 600 ms |
| NFR-19 | Database query behind a list endpoint | 150 ms | 400 ms |
| NFR-02 | `POST /api/predict` end-to-end, warm | 1500 ms | 3000 ms |
| — | ML `/predict` inference | 400 ms | 900 ms |
| NFR-03 | Dashboard LCP | 2500 ms | 4000 ms |
| NFR-04 | Map interactive with all layers | 1500 ms | 3000 ms |
| NFR-05 | Graph render at 200 nodes | 800 ms | 1500 ms |
| NFR-20 | ML service resident memory | 512 MB | 768 MB |

**Budget allocation for the prediction path** (from `architecture/system-design.md` §4.1) leaves 500 ms of deliberate headroom against NFR-02. That headroom is the difference between a demonstration that works on venue wifi and one that does not.

---

## 2. Where Time Actually Goes

Measured against the seed corpus on the reference machine (4-core, 16 GB, local Postgres).

| Stage | Typical | p95 | Dominated by |
|---|---|---|---|
| Route validation + authorisation | 2 ms | 5 ms | Zod parse |
| Complaint + chain assembly | 45 ms | 120 ms | Three indexed queries |
| Candidate cell generation | 20 ms | 45 ms | k-ring + historical cell lookup |
| ML round trip | 280 ms | 400 ms | Feature build (60 vectors) + 60 scores + 1 SHAP |
| — of which feature build | 90 ms | 130 ms | pandas construction |
| — of which scoring | 40 ms | 60 ms | XGBoost batch predict |
| — of which SHAP | 70 ms | 110 ms | TreeExplainer, single row |
| — of which ranking + temporal | 50 ms | 80 ms | Combined score + 12-bin classify |
| Persistence transaction | 25 ms | 60 ms | Two inserts, one commit |
| Serialisation + render | 90 ms | 200 ms | JSON + React reconciliation |

The two facts worth acting on: **feature building for sixty candidates costs more than scoring them**, and **SHAP on one row costs as much as scoring sixty**. Both shaped design decisions — vectorised feature construction, and explaining only the top-ranked cell.

---

## 3. Frontend Performance Strategy

### 3.1 Rendering model

Server Components by default. `'use client'` is permitted only for interactivity, a browser API, or a client-only library, and requires a comment stating which.

| Surface | Model | Reason |
|---|---|---|
| Complaint / transaction / alert / investigation lists | Server | Data-heavy, low interactivity; keeps table rows out of the JS bundle |
| Complaint detail (summary, timeline, accounts) | Server | Same |
| Prediction panel | Client | Triggers a mutation, holds in-flight state |
| Map | Client, dynamically imported | WebGL, ~200 KB gzipped |
| Graph | Client, dynamically imported | Canvas + layout |
| Charts | Client, dynamically imported | Recharts is not tree-shakeable enough to include eagerly |
| Modals, drawers, toasts | Client | Interaction |

### 3.2 Bundle budget

| Route | First-load JS budget |
|---|---|
| `/dashboard` | ≤ 180 KB gzipped |
| `/complaints` | ≤ 140 KB |
| `/complaints/[id]` | ≤ 160 KB |
| `/risk-map` | ≤ 320 KB (map included) |
| `/reports` | ≤ 260 KB (charts included) |

Enforced by a CI bundle-size check that fails the build on regression. The dashboard renders a map, so the map is dynamically imported *below the fold of the critical render* — the KPI cards and hotspot rail paint before the map bundle arrives.

### 3.3 Layout stability

Every async region reserves its final dimensions. Skeletons match the real layout's row count and height, which is why the skeleton specification in `ux/ui-guidelines.md` §4 is a performance requirement and not only an aesthetic one. Target CLS ≤ 0.05.

### 3.4 Table performance

Server-side pagination at 25 rows; virtualisation above 100 rows; no client-side sorting or filtering of a full corpus — sorting is a server round trip with an allow-listed column, which is simultaneously the security control.

---

## 4. Map Performance

| Technique | Detail |
|---|---|
| Viewport-scoped ATM loading | `GET /api/atms?bbox=` — never a full-corpus fetch |
| Marker clustering | ATM markers cluster above 50 in view; cluster count rendered as text |
| Heatmap point cap | KDE surface pre-aggregated server-side to at most 2,000 weighted points |
| Layer lazy-init | A layer's data is fetched on first enable, not on mount |
| Deterministic hotspot layer | At most 20 markers; no clustering needed |
| No re-centre on refresh | Avoids both a jarring UX and a full tile re-fetch |

Measured target: basemap paint ≤ 600 ms, all layers interactive ≤ 1500 ms (NFR-04).

---

## 5. Graph Performance

| Technique | Detail |
|---|---|
| Bounded traversal | Depth ≤ 6, visited set, `LIMIT 500` — the query cannot run away |
| Node cap | 200 rendered; beyond that the top-weighted subgraph plus a truncation notice |
| Deterministic layered layout | Computed once, memoised by complaint ID; no force simulation |
| Memoised custom nodes | `React.memo` with a stable comparator on node data |
| No animation on initial layout | The settle animation runs only on explicit re-layout |

Determinism serves performance and UX at once: a memoised layout is both cheap and stable, and stability is what makes the graph trustworthy (`ux/ui-guidelines.md` §8).

---

## 6. Database Performance

| Practice | Detail |
|---|---|
| Index-per-predicate | Thirty-one indexes, each justified by a named query (`architecture/database-design.md` §5) |
| No N+1 | Drizzle explicit joins; lazy loading is unavailable by construction |
| Connection pooling | Neon pooled endpoint; serverless driver over HTTP in the Vercel runtime |
| Prepared statements | Drizzle prepared queries for the hot list and detail paths |
| Query timeout | 5 s statement timeout; the graph CTE carries its own tighter budget |
| `EXPLAIN ANALYZE` evidence | Required in the PR for any new index or any query on a table above 10,000 rows |
| Report memoisation | 5-minute server-side memo keyed by a filter hash |

### 6.1 Hot queries

| Query | Index used | Target |
|---|---|---|
| Complaint list, filtered by state + fraud type | `idx_complaints_filters` | ≤ 40 ms |
| Complaint detail with chain | `idx_txn_complaint`, `idx_accounts_account_id` | ≤ 60 ms |
| Historical hotspot score per cell | `idx_wd_h3_ts` | ≤ 25 ms |
| Graph traversal, depth 4 | `idx_txn_from_ts` | ≤ 120 ms |
| Hotspot list for the map | `idx_hotspots_score` | ≤ 30 ms |
| Dashboard KPI counts | `idx_complaints_status`, `idx_txn_risk`, `idx_alerts_severity` | ≤ 50 ms combined |

---

## 7. ML Service Performance

| Technique | Detail |
|---|---|
| Artefacts loaded at startup | Per-request load would add ~200 ms and breach the budget (FR-07.4) |
| Vectorised feature construction | One DataFrame for all candidates, not a Python loop per cell |
| Batch scoring | A single `predict_proba` call over the full candidate matrix |
| SHAP on the top cell only | Sixty explanations would cost ~4 s for information nobody reads |
| Explainer constructed once | `TreeExplainer` at startup, reused per request |
| Uvicorn workers | 2 workers, 1 thread each; the workload is CPU-bound, so threads add contention rather than throughput |
| Memory ceiling | Model artefacts ~40 MB; steady-state resident ~280 MB against a 512 MB budget |

### 7.1 Cold start

The dominant real-world risk (RSK-02). Mitigations, all built rather than planned:

1. A warm-up ping fires on application load and on `/demo` mount (FR-18.3).
2. `/api/health` reports `degraded` rather than `down` during the documented warm-up window, so the UI shows progress instead of failure.
3. The 8-second timeout is longer than a typical warm start and shorter than a user's patience, and it produces a typed, retryable error rather than a hang.
4. The demonstration protocol in `docs/demo-script.md` includes an explicit warm-up step before evaluators arrive.

---

## 8. Measurement Plan

| Layer | Tool | Frequency | Gate |
|---|---|---|---|
| API latency | k6, 20 VUs, 5 min | Every CI run on main | p95 within budget |
| Page metrics | Lighthouse CI | Every CI run on main | LCP, CLS, TBT within budget |
| Interaction timing | Playwright `performance.measure` | Every CI run | Map and graph budgets |
| ML inference | pytest-benchmark | Every ML change | p95 ≤ 400 ms |
| Bundle size | `next build` analysis | Every CI run | Per-route budgets |
| Query plans | `EXPLAIN ANALYZE` in review | Per PR touching queries | No sequential scan on an indexed predicate |

A budget breach fails CI. Waiving one requires an entry in `project-management/decision-log.md` stating the new budget and its justification — a breach is never silently absorbed.

---

## 9. Anti-Patterns Explicitly Rejected

| Rejected | Why |
|---|---|
| Client-side filtering of the full corpus | Moves the cost to the weakest machine and defeats the sort allow-list |
| Optimistic UI for predictions | Showing a value before the model produced it is exactly the failure mode NFR-15 exists to prevent |
| Caching prediction responses | A stale prediction is the most dangerous stale value in the system |
| Artificial progress animation | Progress ticks reflect real pipeline stages; padding them to look substantial is dishonest and wastes the budget |
| Prefetching every route on hover | Bandwidth and memory cost for a workflow with a narrow, predictable path |
| Eager map and chart imports | Would double the dashboard's first-load bundle for content below the initial viewport |
