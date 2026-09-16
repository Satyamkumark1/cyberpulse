# PHASE 4 — MONEY TRAIL & GEOSPATIAL INTELLIGENCE

| Field | Value |
|---|---|
| Duration | 14 person-days · Week 2 day 7 – Week 3 day 3 |
| Output | The evidence surfaces: money-trail graph, national risk map, transaction ledger |
| Entry | Phase 3 exited — a real prediction renders |
| Features | FEAT-03, FEAT-04, FEAT-10 |

---

## 1. Objectives

1. Make the model's inference auditable by rendering the money trail as a directed graph.
2. Build the national GIS console with three real layers and a hotspot drawer.
3. Deliver the transaction ledger and single-transaction trace.
4. Provide accessible table equivalents for both canvas surfaces — the only way that data exists for some users.
5. Keep both surfaces inside their performance budgets from the first commit rather than optimising later.

---

## 2. Deliverables

| Deliverable | Acceptance |
|---|---|
| Recursive traversal CTE | Depth bound, visited-set cycle guard, `LIMIT 500` |
| `GET /api/transactions/network/:id` | `nodes`, `edges`, `truncated`, `nodeCount` |
| `MoneyTrailGraph` | Three node types, deterministic layered layout |
| Node detail panels | Victim, mule account, ATM — each with the neutrality note |
| Graph accessible tables | Node and edge tables with identical data |
| `MapCanvas` (MapLibre) | Interactive, three toggleable layers, text legend |
| Heatmap layer | KDE surface, pre-aggregated to ≤ 2,000 points |
| Hotspot layer | Ranked markers with numerals |
| ATM layer | `bbox`-scoped, clustered above 50 in view |
| `HotspotDrawer` | Location, score, level, window, ATMs, factors, related complaints |
| Map accessible table | Same hotspot data as a `<table>` |
| Tile and WebGL fallbacks | Bundled outline; table becomes primary |
| `/transactions`, `/transactions/[id]` | Filterable ledger and detail |
| Simulation panel | Start, pause, reset; writes only to `simulation_events` |
| Dashboard map and hotspot rail | Wired to real data |

---

## 3. Implementation Tasks

| # | Task | Owner | Days |
|---|---|---|---|
| T-4.1 | Recursive CTE with depth bound, visited set, row cap | DB | 1.0 |
| T-4.2 | `transactionService.getNetwork` and typed node payloads | Backend | 0.75 |
| T-4.3 | Network endpoint with validation and scope | Backend | 0.5 |
| T-4.4 | React Flow graph with three custom node types | Frontend A | 1.75 |
| T-4.5 | Deterministic layered layout, memoised by complaint | Frontend A | 1.0 |
| T-4.6 | Node detail panels with the neutrality note | Frontend A | 0.75 |
| T-4.7 | Graph node and edge accessible tables | Frontend A | 0.5 |
| T-4.8 | Truncation handling above 200 nodes | Frontend A | 0.5 |
| T-4.9 | MapLibre canvas, dynamic import, skeleton | Frontend B | 1.25 |
| T-4.10 | Heatmap layer from the KDE surface | Frontend B | 0.75 |
| T-4.11 | Hotspot markers with rank numerals | Frontend B | 0.75 |
| T-4.12 | ATM layer: bbox queries and clustering | Frontend B | 1.0 |
| T-4.13 | Layer toggles and text legend | Frontend B | 0.5 |
| T-4.14 | Hotspot drawer with focus trap | Frontend B | 1.0 |
| T-4.15 | Map accessible table | Frontend B | 0.5 |
| T-4.16 | Tile and WebGL fallbacks | Frontend B | 0.5 |
| T-4.17 | `GET /api/hotspots`, `/:h3`, `/api/atms` | Backend | 0.75 |
| T-4.18 | Transaction ledger and detail | Frontend A | 1.0 |
| T-4.19 | Simulation endpoints and panel | Backend | 0.75 |
| T-4.20 | Dashboard map and hotspot rail wiring | Frontend B | 0.5 |

Graph and map are owned by different people from day one — they are the largest genuinely parallel block in the project.

---

## 4. Dependencies

**Inbound:** P3 predictions and ranked hotspots; P2 corpus and indexes (`idx_txn_from_ts`, `idx_txn_to_ts`, `idx_atms_bbox`, `idx_hotspots_score`).
**Outbound:** P5's "Generate Alert" from the hotspot drawer depends on the drawer existing.

---

## 5. Risks

| Risk | Probability | Impact | Mitigation |
|---|---|---|---|
| Traversal query unbounded on a dense chain | Medium | High | Three independent guards, each tested separately |
| Graph layout non-deterministic | Medium | High | Layered layout, memoised; TC-UX-014 asserts 1 px stability across reloads |
| Map performance with all layers | **High** | High | Bbox scoping and clustering designed in, not retrofitted |
| Map bundle breaks the dashboard budget | Medium | Medium | Dynamic import below the critical render; CI budget check |
| Canvas surfaces inaccessible | **High** | High | Accessible tables are deliverables in this phase, not V1 |
| Node payload gains a name field | Low | **Critical** | Shared type has no such field; TC-SEC-021 asserts it |
| Tile provider unavailable during a demo | Low | Medium | Bundled outline fallback built here |

---

## 6. Acceptance Criteria

**AC-P4-01** — The graph renders ≥ 1 victim, ≥ 2 mule and ≥ 1 ATM node for `C-10284`, with directional edges carrying rupee-formatted amounts (AC-004-01, 02).
**AC-P4-02** — Node types are distinguishable by shape, icon and text; determinable under a greyscale filter.
**AC-P4-03** — Each node type's detail panel shows its documented fields; no panel contains a personal-name field (AC-004-03 … 05).
**AC-P4-04** — Traversal is bounded: `depth=10` → 400; a cyclic chain terminates under 1 s with no duplicate nodes (AC-004-06).
**AC-P4-05** — Above 200 nodes, the top-weighted subgraph renders with a truncation notice and the true count.
**AC-P4-06** — Graph layout is identical to within 1 px across navigation and reload.
**AC-P4-07** — The map is an interactive MapLibre canvas; no `<img>` serves as the map surface (AC-010-01).
**AC-P4-08** — Three labelled layer toggles change rendered feature counts; the legend pairs every swatch with text (AC-010-02).
**AC-P4-09** — Clicking a hotspot opens a focus-trapped drawer within 300 ms showing all documented fields (AC-010-03, 04).
**AC-P4-10** — An accessible table renders the same hotspot data as the layer (AC-010-06).
**AC-P4-11** — With tiles unreachable, the bundled outline renders with a notice and data layers still display.
**AC-P4-12** — With WebGL unavailable, the accessible table becomes the primary view with an explanatory message.
**AC-P4-13** — ATM queries are always bbox-scoped; an unbounded query is impossible.
**AC-P4-14** — The transaction ledger filters by channel, amount range, date and risk indicator.
**AC-P4-15** — The simulation writes only to `simulation_events`; start is idempotent; reset clears the panel and the table.
**AC-P4-16** — Map interactive with all layers ≤ 1500 ms; graph render at 200 nodes ≤ 800 ms.

---

## 7. Test Strategy

Two canvas surfaces that assistive technology cannot read, and one query that can run away. Testing concentrates on **bounded traversal**, **determinism**, **accessible equivalence** and **performance under full load** — measured on the preview environment, not locally.

---

## 8. Phase 4 Test Cases

### Graph
TC-UI-007 renders · TC-UI-008 greyscale-distinguishable node types · TC-UI-009 edge semantics · TC-UI-010 victim detail · TC-UI-011 mule detail with neutrality note · TC-UI-012 ATM detail · TC-UX-014 layout determinism · TC-A11Y-011 node and edge table equivalence · TC-SEC-021 no name field in any payload

### Traversal
TC-API-022 subgraph shape · TC-API-023 depth validation · TC-INT-060 cyclic chain terminates · TC-INT-061 depth bound · TC-INT-062 truncation disclosure · TC-INT-063 chain with no withdrawal · TC-PERF-005 traversal latency

### Map
TC-UI-030 interactive, not an image · TC-UI-031 three labelled toggles · TC-UI-032 legend with text · TC-UI-033 no static fallback image · TC-UI-034 drawer opens within 300 ms · TC-UI-035 drawer content matches the API · TC-UI-036 tile fallback · TC-A11Y-009 markers readable in greyscale · TC-A11Y-010 table equivalence · TC-PERF-003 interactive with all layers

### Hotspots and ATMs
TC-API-030 list ordering and bounds · TC-API-031 drawer payload in one response · TC-API-032 bbox required and clamped

### Transactions and simulation
TC-API-020 ledger filters · TC-API-021 detail · TC-API-024 simulation ADMIN-scoped and idempotent · TC-UI-020 stream behaviour

### E2E
TC-E2E-005 map drill-down to complaint · TC-E2E-033 tile failure · TC-E2E-006 graph determinism across navigation

**Total: 32 cases.**

---

## 9. Regression Tests

| From | Re-run | Why |
|---|---|---|
| P3 | All Critical: TC-ML-010 … 046, TC-INT-010, TC-INT-013 | New surfaces must not alter prediction behaviour |
| P3 | TC-E2E-001, TC-E2E-050 | The critical path still works and still follows the response |
| P3 | TC-API-001 … 014 | Complaint and prediction APIs unchanged |
| P3 | TC-UI-082 | Badge present on the new routes |
| P2 | TC-DATA-002, TC-SEC-022 | Corpus unchanged; no new personal-data column |
| P2 | TC-P2-02 | Constraints still enforced |
| Cross | TC-UX-012, TC-UX-013 | New UI copy respects the lexicon and the prohibited-phrase list |

---

## 10. Security Validation

| Check | Case |
|---|---|
| No personal-name field in any node payload | TC-SEC-021 |
| Traversal depth and node caps enforced server-side | TC-SEC-026 |
| Bbox parameters validated and clamped | TC-API-032 |
| Graph and map scoped for BANK | TC-SEC-012 |
| Simulation endpoints ADMIN-only | TC-API-024 |
| Simulation cannot write to `transactions` | TC-API-024 |
| New UI copy passes the terminology scan | TC-UX-013 |
| No new outbound host without a CSP entry | TC-SEC-041 |

The simulation isolation check matters more than it appears: a simulation that could write to `transactions` would contaminate the analysable corpus and silently change every subsequent prediction.

---

## 11. Performance Validation

| Check | Target | Case |
|---|---|---|
| Map interactive, all layers, 520 ATMs | ≤ 1500 ms | TC-PERF-003 |
| Basemap paint | ≤ 600 ms | TC-PERF-003 |
| Graph render at 200 nodes | ≤ 800 ms | TC-PERF-004 |
| Traversal depth 4 p95 | ≤ 300 ms | TC-PERF-005 |
| Table render at 100 rows | ≤ 400 ms | TC-PERF-013 |
| `/risk-map` bundle | ≤ 320 KB gz | TC-PERF-014 |
| Dashboard bundle with the map dynamically imported | ≤ 180 KB gz | TC-PERF-014 |

`EXPLAIN ANALYZE` evidence is required in the PR for the traversal CTE and for the bbox ATM query — the two queries in this phase that can degrade non-linearly.

---

## 12. Exit Criteria

- [ ] AC-P4-01 … AC-P4-16 pass
- [ ] All 32 phase test cases pass
- [ ] P3 Critical regression green
- [ ] Both accessible table equivalents implemented and verified
- [ ] Map and graph performance budgets met **on the preview environment**
- [ ] Traversal proven bounded against the cyclic fixture
- [ ] Tile and WebGL fallbacks demonstrated
- [ ] Bundle budgets met for all routes
- [ ] Zero unresolved Critical or High defects

### The demonstrable gate

An officer analyses `C-10284`, opens the money trail, reads the layering structure, cross-references it against the factor list, then opens the risk map, finds the predicted hotspot, and sees the same intelligence from a geographic view. The reasoning is now auditable from two directions.
