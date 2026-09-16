# PERFORMANCE PRACTICES — CyberPulse AI

| Field | Value |
|---|---|
| Version | 1.0 |
| Relationship to `architecture/performance-architecture.md` | That document sets the budgets and explains where time goes. This one is the engineer's working guide. |
| Related | `test-cases/performance-tests.md` |

---

## 1. Budgets You Are Working Against

| Path | p95 | Hard fail |
|---|---|---|
| Read API | 300 ms | 600 ms |
| List query | 150 ms | 400 ms |
| `POST /api/predict` warm | 1500 ms | 3000 ms |
| ML inference | 400 ms | 900 ms |
| Dashboard LCP | 2500 ms | 4000 ms |
| Map interactive | 1500 ms | 3000 ms |
| Graph at 200 nodes | 800 ms | 1500 ms |

A CI breach fails the build. Waiving one requires a `project-management/decision-log.md` entry stating the new budget and why — a breach is never silently absorbed.

---

## 2. Database Practices

**Every query on a user path has an index behind its predicate.** Thirty-one indexes exist and each names the query it serves (`architecture/database-design.md` §5). Adding a query without checking its plan is the most common way a list endpoint quietly breaches 150 ms.

```bash
# Required in the PR description for any new query on a table above 10k rows
EXPLAIN (ANALYZE, BUFFERS) SELECT ...;
```

Review rejects a plan containing `Seq Scan` on an indexed predicate.

| Practice | Detail |
|---|---|
| Explicit joins | Drizzle has no lazy loading, so N+1 cannot happen by accident — but a loop issuing queries can. Fetch sets, not items. |
| Prepared statements | The hot list and detail queries are prepared once at module load |
| Mandatory limits | Every query that can return many rows takes one; `pageSize` caps at 100 |
| Statement timeout | 5 s globally; the traversal CTE carries a tighter internal budget |
| Count after scope | `total` is computed with the scope predicate applied, not before |
| Aggregate memoisation | Reports memoised 5 minutes by filter hash |

### 2.1 The one query to watch

The recursive traversal CTE is the most expensive query in the system. It carries three independent protections — depth bound, visited-set cycle guard, `LIMIT 500` — because any one alone is insufficient. Changing it requires a fresh `EXPLAIN ANALYZE` against a 10× corpus and a re-run of TC-PERF-005.

---

## 3. Frontend Practices

### 3.1 Server by default

`'use client'` requires a one-line comment naming the reason. The dashboard's tables, the complaint detail's summary, timeline and account list are all server-rendered, which keeps their data out of the JavaScript bundle entirely.

### 3.2 Dynamic imports for the three heavy libraries

```tsx
const MapCanvas = dynamic(() => import('@/components/map/MapCanvas'), {
  ssr: false, loading: () => <MapSkeleton />,
});
```

MapLibre (~200 KB gz), React Flow and Recharts are never in an initial bundle. The dashboard renders KPI cards and the hotspot rail before the map bundle arrives, which is what keeps LCP inside 2.5 s while still having a map on the page.

### 3.3 Bundle budgets

| Route | First-load JS |
|---|---|
| `/dashboard` | ≤ 180 KB gz |
| `/complaints` | ≤ 140 KB |
| `/complaints/[id]` | ≤ 160 KB |
| `/risk-map` | ≤ 320 KB |
| `/reports` | ≤ 260 KB |

Checked in CI on every build. A new dependency that pushes a route over its budget fails the build rather than being discovered in a Lighthouse report weeks later.

### 3.4 Layout stability

Skeletons match the final layout's row count and height. This is why the skeleton specification in `ux/ui-guidelines.md` §4 is a performance requirement as much as a visual one — a mismatched skeleton is a guaranteed layout shift. Target CLS ≤ 0.05.

### 3.5 Tables and lists

Server-side pagination at 25 rows. Virtualisation above 100. No client-side sorting of a full corpus — sorting is a server round trip against an allow-listed column, which is simultaneously the security control (TC-SEC-013).

---

## 4. Map Practices

| Practice | Why |
|---|---|
| `bbox`-scoped ATM queries | A full-corpus ATM fetch is the easiest way to break the map |
| Cluster above 50 markers in view | Rendering cost and legibility both |
| KDE pre-aggregated server-side to ≤ 2,000 points | The browser should not compute a density surface |
| Layer data fetched on first enable | A layer nobody turns on costs nothing |
| No re-centre on refresh | Avoids a tile re-fetch and a jarring UX in one decision |

---

## 5. Graph Practices

Deterministic layered layout, computed once and memoised by complaint ID. Custom nodes wrapped in `React.memo` with a stable comparator. Above 200 nodes, render the top-weighted subgraph with a truncation notice rather than attempting the full graph.

Determinism is doing double duty here: a memoised layout is cheap, and a stable layout is what makes the graph trustworthy to a user returning to it (`ux/ui-guidelines.md` §8).

---

## 6. ML Service Practices

| Practice | Impact |
|---|---|
| Artefacts loaded once at startup | Per-request load would add ~200 ms and blow the budget |
| Vectorised feature construction | A per-cell Python loop measured ~4× slower |
| Batch scoring in one `predict_proba` | Sixty individual calls would dominate the budget |
| SHAP on the top cell only | Explaining all sixty costs ~4.2 s for information nobody reads |
| Explainer constructed once at startup | Reconstruction per request is wasteful |
| 2 uvicorn workers, 1 thread each | CPU-bound work; threads add contention, not throughput |

The SHAP decision is the single largest performance lever in the system and is worth understanding before anyone proposes "explaining all the candidates".

---

## 7. Cold Start

The dominant real-world risk (RSK-02), and a performance problem that money solves better than code.

| Mitigation | Built |
|---|---|
| Warm-up ping on app load and `/demo` mount | Yes (FR-18.3) |
| Uptime probe every 60 s doubling as a keep-warm | Yes |
| Health reports `degraded`, not `down`, while warming | Yes |
| 8 s timeout producing a typed, retryable error | Yes |
| T−30 rehearsal run in the demo runbook | Yes |
| Always-on paid instance | Recommended — see `ai/cost-optimization.md` §2.1 |

---

## 8. Measuring Before Optimising

```bash
pnpm test:perf              # k6 + Lighthouse against the preview
pnpm build --analyze        # bundle composition
pytest -m benchmark         # ML inference distribution
EXPLAIN (ANALYZE, BUFFERS)  # any query you suspect
```

The rule: bring a measurement to the optimisation discussion. The profile in `architecture/performance-architecture.md` §2 exists because two of this system's design decisions — SHAP on one cell, vectorised features — came out of measurement and would not have been guessed.

---

## 9. Anti-Patterns

| Rejected | Why |
|---|---|
| Caching predictions | The most dangerous stale value in the system |
| Optimistic UI for prediction values | Shows a number the model has not produced |
| Client-side filtering of the corpus | Moves cost to the weakest machine, defeats the sort allow-list |
| Artificial progress animation | Dishonest, and it spends the budget it pretends to fill |
| Prefetching every route on hover | The workflow has a narrow, predictable path |
| Eager map and chart imports | Doubles the dashboard's first-load bundle for below-fold content |
| `SELECT *` | Fetches columns nobody reads, including large `jsonb` |

---

## 10. Performance Review Checklist

- [ ] New query has an `EXPLAIN ANALYZE` in the PR, with no unexpected `Seq Scan`
- [ ] New query has a limit
- [ ] New index names the query it serves
- [ ] New client component has a stated reason
- [ ] New heavy dependency is dynamically imported
- [ ] Route stays within its bundle budget
- [ ] New async region reserves its space with a matching skeleton
- [ ] New ML work does not add a per-request artefact load or a Python loop over candidates
- [ ] Measured, not assumed
