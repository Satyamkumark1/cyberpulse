# ARCHITECTURE DECISION RECORDS — CyberPulse AI

| Field | Value |
|---|---|
| Version | 1.0 |
| Format | ID · Title · Status · Context · Problem · Decision · Alternatives · Trade-offs · Consequences · Date |
| Status values | Proposed · Accepted · Superseded · Deprecated |

---

## ADR-001 — Next.js App Router as the web framework

**Status:** Accepted · **Date:** 2026-09-14

**Context.** The product needs data-heavy tables, an interactive map and graph, and an HTTP API. The team is small and the delivery window is three weeks.

**Problem.** Should the frontend and API be separate deployables, or one?

**Decision.** One Next.js application using the App Router. Server Components render data-heavy surfaces; route handlers provide the API; both call the same service layer.

**Alternatives.** (a) React SPA + separate Node/Express API — two deployables, duplicated types, more CORS and auth plumbing. (b) Remix — comparable, less familiar to the team. (c) Server-rendered Python (the ML service also serving UI) — would couple the model runtime to the UI runtime and make the web layer's tooling worse.

**Trade-offs.** Gains a single deployable, no client-server type duplication, and less JavaScript shipped for tables. Costs some framework coupling and requires discipline about the Server/Client Component boundary.

**Consequences.** Server Components call services directly with no HTTP hop; Client Components go through route handlers; both converge on one service layer so authorisation cannot diverge (`architecture/high-level-architecture.md` §3).

---

## ADR-002 — TypeScript strict with Zod as the runtime contract

**Status:** Accepted · **Date:** 2026-09-14

**Context.** The highest-severity failure mode is a UI value disagreeing with a model output (RSK-03).

**Problem.** How do we make that class of divergence structurally impossible rather than review-dependent?

**Decision.** One JSON Schema per contract in `packages/shared`, generating both Zod validators (web) and Pydantic models (ML service). Strict TypeScript throughout.

**Alternatives.** (a) Hand-written types on each side — drift is a matter of time. (b) OpenAPI-first with generated clients — heavier tooling for three contracts. (c) tRPC — excellent within TypeScript, but the ML service is Python.

**Trade-offs.** Adds a generation step to the build. Buys a compile-time failure on both sides for any contract change.

**Consequences.** Renaming a field breaks the TypeScript build and the Python type check in the same commit. The two `refine` clauses on `PredictionResponse` turn AC-009-01 and AC-009-02 into runtime guarantees.

---

## ADR-003 — Neon PostgreSQL

**Status:** Accepted · **Date:** 2026-09-14

**Decision.** Neon serverless PostgreSQL, with local Postgres in Docker for development.

**Alternatives.** Supabase (bundles auth and storage the prototype does not use, and the team has noted a preference to avoid it for hackathon builds); PlanetScale (MySQL — loses arrays, enums and recursive CTE ergonomics); SQLite (no concurrent write story, no array types).

**Trade-offs.** Free-tier connection limits and cold starts, against zero operations, database branching per PR, and full Postgres semantics.

**Consequences.** Per-PR Neon branches make destructive E2E tests safe. Connection pooling is mandatory. PostGIS availability is not assumed (see ADR-005).

---

## ADR-004 — Drizzle ORM

**Status:** Accepted · **Date:** 2026-09-14

**Decision.** Drizzle with drizzle-kit migrations.

**Alternatives.** Prisma (heavier runtime, an extra engine process, and lazy relations that hide N+1 queries); Kysely (excellent query builder, weaker migration story); raw SQL with a thin mapper (maximum control, maximum boilerplate, and every query becomes a review surface for injection).

**Trade-offs.** A smaller ecosystem than Prisma, in exchange for SQL-shaped queries that are readable in review and a schema that is genuinely the source of truth.

**Consequences.** Joins are explicit, so N+1 queries are visible rather than emergent. Migrations are reviewable SQL committed to the repository.

---

## ADR-005 — H3 indexing rather than a hard PostGIS dependency

**Status:** Accepted · **Date:** 2026-09-14

**Context.** The system needs cell aggregation, density calculation, distance and neighbour lookup. PostGIS may not be available on the target database tier (ASM-07).

**Decision.** Store H3 indexes as text columns (resolution 8 for hotspot cells, 9 for ATM density). Use `h3-js` and `h3-py` for indexing, Turf.js for client-side geometry. PostGIS is optional and, where present, purely an optimisation.

**Alternatives.** (a) Require PostGIS — a deployment dependency the free tier may not satisfy. (b) Geohash — rectangular cells with non-uniform neighbour distances, which distorts the density feature. (c) Raw lat/lon with application-side maths only — no aggregation story at all.

**Trade-offs.** Loses true spatial joins and GiST indexing. Gains portability, uniform hexagonal neighbours, and `GROUP BY h3_index` as the entire aggregation strategy.

**Consequences.** Hotspot aggregation is a B-tree grouping. Distance and k-ring computation happens in application code, which is a documented scaling limit (`architecture/scalability.md` L4).

---

## ADR-006 — MapLibre GL JS

**Status:** Accepted · **Date:** 2026-09-14

**Decision.** MapLibre GL JS as the map renderer, with Leaflet documented as a fallback that is not implemented in v1.0.

**Alternatives.** Leaflet (raster, simpler, but poorer performance with a heatmap plus hundreds of markers); Mapbox GL (requires an access token and has licence constraints); Google Maps (licence and cost).

**Trade-offs.** A larger bundle (~200 KB gzipped, dynamically imported) and a WebGL requirement, against GPU rendering, vector tiles and no licence key.

**Consequences.** A WebGL fallback path is mandatory — the accessible table becomes the primary view when WebGL is unavailable, which also satisfies AR-04. `style-src 'unsafe-inline'` is required in the CSP and is recorded as an accepted deviation.

---

## ADR-007 — React Flow for the money-trail graph

**Status:** Accepted · **Date:** 2026-09-14

**Decision.** React Flow (`@xyflow/react`) with three custom node types and a deterministic layered layout.

**Alternatives.** D3 force layout (non-deterministic — the same complaint would render differently each time, destroying spatial memory); Cytoscape.js (powerful, heavier, non-React); a hand-rolled SVG graph (weeks of interaction work).

**Trade-offs.** Framework coupling, against custom React nodes, built-in pan/zoom, and a controlled layout.

**Consequences.** Layout must be deterministic and memoised by complaint ID (TC-UX-014). Determinism is simultaneously a performance and a trust property.

---

## ADR-008 — Recharts for charts

**Status:** Accepted · **Date:** 2026-09-14

**Decision.** Recharts for the six report visualisations.

**Alternatives.** Chart.js (canvas — no DOM to make accessible); Victory (heavier); visx (more control, much more code); D3 directly (unjustified for six standard charts).

**Trade-offs.** Limited exotic chart types and imperfect tree-shaking, against declarative React composition and SVG output that can be labelled for assistive technology.

**Consequences.** Charts are dynamically imported to protect the bundle budget. Each chart ships an accessible table equivalent (AR-04, TC-A11Y-020).

---

## ADR-009 — FastAPI as a separate ML service

**Status:** Accepted · **Date:** 2026-09-14

**Context.** XGBoost, SHAP, scikit-learn and pandas are Python. The web application is TypeScript.

**Decision.** A separate FastAPI service holding all model code, with **no database credentials**.

**Alternatives.** (a) ONNX export and inference in Node — loses SHAP, which is a hard requirement. (b) A Python subprocess from Node — fragile, no independent health or scaling. (c) A managed inference endpoint — cost, latency, and loss of reproducibility.

**Trade-offs.** A second deployable, a network hop and a cold-start risk, against the right runtime for the workload, independent deployability and clean testability.

**Consequences.** The service is stateless and cannot write state — a compromise yields wrong predictions, detectable by response validation, but not data loss (`architecture/security-architecture.md` §2). Cold start becomes the primary demonstration risk and is mitigated explicitly.

---

## ADR-010 — XGBoost as the primary model family

**Status:** Accepted · **Date:** 2026-09-14

**Decision.** XGBoost for the risk classifier and the temporal classifier. LightGBM documented as a drop-in alternative if training time or accuracy demands it.

**Alternatives.** Logistic regression (interpretable but too weak for the planted interactions); random forest (comparable accuracy, weaker calibration, larger artefacts); a neural network (worse on tabular data at this scale, slower, and far harder to explain — explicitly rejected by the source specification).

**Trade-offs.** Requires hyperparameter care to avoid overfitting a synthetic corpus, against strong tabular performance, fast inference and exact SHAP via TreeExplainer.

**Consequences.** Exact tree SHAP is available, which is what makes the explainability requirement achievable at all. Artefacts are small enough to bake into the container image.

---

## ADR-011 — SHAP TreeExplainer, aggregated to named factors

**Status:** Accepted · **Date:** 2026-09-14

**Decision.** Exact SHAP values for the top-ranked cell only, aggregated from thirteen raw features into a closed set of officer-readable factor names, normalised to 100%.

**Alternatives.** LIME (approximate, unstable across runs — unacceptable when an officer may re-run and see a different explanation); permutation importance (global, not per-prediction); raw feature importances (global and misleading as a per-case explanation); exposing raw feature names (meaningless to the user).

**Trade-offs.** Explaining only the top cell means alternatives are ranked but not individually explained. Aggregation loses per-feature granularity. Both are correct for the audience.

**Consequences.** `RiskFactor.name` is a closed enum, so a raw feature identifier cannot reach the UI (FR-10.2). `collapse_small` keeps at least five factors while the sum stays exactly 100.

---

## ADR-012 — DBSCAN plus KDE for spatial discovery

**Status:** Accepted · **Date:** 2026-09-14

**Decision.** DBSCAN (eps 800 m, min_samples 5) over historical withdrawal coordinates for cluster discovery; KDE for the heatmap surface.

**Alternatives.** K-means (requires a pre-set cluster count, which is exactly what is unknown); hierarchical clustering (poor scaling); pure H3 aggregation (no notion of cluster shape).

**Trade-offs.** DBSCAN is sensitive to `eps`, and both parameters are tuned against synthetic data. A documented fallback to H3 aggregation exists when no cluster forms, flagged in the response as `clusteringFallback: true`.

**Consequences.** Both parameters are configuration, not literals. The fallback path is surfaced honestly rather than hidden.

---

## ADR-013 — Rank candidate cells rather than regress coordinates

**Status:** Accepted · **Date:** 2026-09-14 (records ASM-05)

**Context.** "Predict the withdrawal location" can be framed as regression on latitude and longitude, or as ranking over discrete candidate cells.

**Decision.** Binary classification over (complaint × candidate cell) pairs, ranked by predicted probability. Label: did the actual withdrawal occur in this cell within the 24-hour horizon?

**Alternatives.** (a) Lat/lon regression — produces a point with no probability, no alternatives and no natural accuracy metric. (b) Multiclass over a fixed cell vocabulary — cannot generalise to an unseen cell. (c) Point-process models — better theory, far more complexity, and much harder to explain.

**Trade-offs.** Requires candidate generation and produces one row per candidate at training time. Yields calibrated probabilities, a top-k list, clean hit-rate metrics that judges immediately understand, and per-candidate SHAP.

**Consequences.** Top-1/top-3/top-5 hit rate become the headline model metrics. The UI's ranked list follows directly from the formulation rather than being a presentation invention.

---

## ADR-014 — The AI layer is built in Phase 3, not Phase 5

**Status:** Accepted · **Date:** 2026-09-14

**Context.** The documentation template places the AI/intelligence layer at Phase 5, after core and advanced features. The source build specification requires the core prediction path to work before secondary surfaces are polished.

**Problem.** Building the UI against imagined model responses risks discovering late that the model cannot produce them.

**Decision.** Deliver the intelligence layer in Phase 3, immediately after the data foundation. The Phase 3 exit gate is a complete vertical slice: complaint → features → model → hotspot → window → SHAP → rendered explanation.

**Alternatives.** Follow the template ordering — conventional, and wrong for a product whose entire surface exists to present model output.

**Trade-offs.** UI work starts later and against a real contract. Accepted deliberately.

**Consequences.** Phase names in `ROADMAP.md` and `implementation/` deviate from the generic template, and the deviation is stated wherever the phases are listed.

---

## ADR-015 — shadcn/ui on Radix primitives

**Status:** Accepted · **Date:** 2026-09-14

**Decision.** shadcn/ui components copied into the repository and restyled to the government palette.

**Alternatives.** Material UI (strong visual identity that fights the required design language); Ant Design (same, plus bundle size); Radix unstyled directly (more work); a hand-rolled system (weeks, and worse accessibility).

**Trade-offs.** Components are owned in-repo, so upstream fixes are not automatic. Gains full restyling freedom and accessible primitives.

**Consequences.** Focus management, keyboard handling and ARIA roles come from Radix, which removes an entire class of accessibility defects.

---

## ADR-016 — Testing stack

**Status:** Accepted · **Date:** 2026-09-14

**Decision.** Vitest + React Testing Library (TS unit/component), Playwright (E2E and accessibility via axe-core), pytest + httpx (Python), k6 (load), Lighthouse CI (page metrics).

**Alternatives.** Jest (slower with ESM and TypeScript); Cypress (weaker multi-context support, needed for the concurrency tests); Locust instead of k6 (adds a second Python surface to maintain).

**Trade-offs.** Five tools to configure, each best-in-class for its layer.

**Consequences.** Accessibility and performance run in the same pipeline as functional tests, so a regression in either fails the build rather than being discovered at review.

---

## ADR-017 — Vercel + Render/Railway + Neon

**Status:** Accepted · **Date:** 2026-09-14

**Decision.** Vercel for the web application, a container host for the ML service, Neon for the database.

**Alternatives.** All-in-one on a single VPS (more control, more operations, and manual TLS during a hackathon); AWS (correct at scale, disproportionate here); Docker Compose on a laptop only (no shareable URL for evaluators).

**Trade-offs.** Free-tier cold starts and connection limits, against zero operations and per-PR preview environments.

**Consequences.** Cold start becomes the top deployment risk and is mitigated by warm-up. Docker Compose parity is mandatory as the venue-failure fallback.

---

## ADR-018 — Integer paise and UTC storage

**Status:** Accepted · **Date:** 2026-09-14

**Decision.** All monetary values stored as `bigint` paise; all timestamps stored as `timestamptz` in UTC. Formatting to rupees and IST occurs only at the presentation edge.

**Alternatives.** Floating-point rupees (accumulating rounding error — unacceptable when the figure is an exposure estimate); `numeric` (correct but invites inconsistent decimal handling across the TS/Python boundary); local-time storage (ambiguity and arithmetic bugs).

**Trade-offs.** Requires disciplined conversion at boundaries.

**Consequences.** The exposure sum is exact. Time-window arithmetic is unambiguous. Two unit tests (TC-UNIT-030, TC-UNIT-031) guard the boundary.

---

## ADR-019 — Role concept without authentication

**Status:** Accepted · **Date:** 2026-09-14

**Context.** The source specification permits role switching in the prototype (§29). Real identity management is out of scope.

**Decision.** Three roles (LEA, BANK, ADMIN), switchable from the header, with **authorisation enforced server-side** in the service layer. The switch is labelled a prototype affordance in the UI and documented as not a security control in four places.

**Alternatives.** (a) No roles at all — would fail to demonstrate that boundaries exist. (b) Full authentication — days of work for a prototype with no real data. (c) Hardcoded single role — same loss as (a).

**Trade-offs.** Anyone can select any role. Accepted because no real data exists and because the alternative — hiding UI without server enforcement — would teach reviewers the wrong lesson about how the system works.

**Consequences.** A BANK-role request to `POST /api/investigations` genuinely returns 403 (TC-SEC-011). The limitation is declared identically in `architecture/security-architecture.md` §10 and `security/security-checklist.md`. Replacement with a real identity provider is V1 scope and is gated by the data-classification check in `architecture/integrations.md` §3.1.

---

## ADR-020 — A single typed error envelope

**Status:** Accepted · **Date:** 2026-09-14

**Decision.** One error shape across every endpoint, produced by one function, with a closed set of codes and a `requestId` for correlation.

**Alternatives.** Per-endpoint error shapes (every client re-implements handling); RFC 7807 problem+json (fine, but heavier than needed and less ergonomic with Zod); plain text errors (unparseable).

**Trade-offs.** Slightly less expressive than a bespoke shape per endpoint.

**Consequences.** The client's error handling is one mapping. Internal detail cannot leak because only one function serialises errors and it never includes the original (NFR-13, TC-SEC-004).

---

## Decision Index

| ADR | Title | Status | Supersedes |
|---|---|---|---|
| 001 | Next.js App Router | Accepted | — |
| 002 | TypeScript strict + Zod shared contracts | Accepted | — |
| 003 | Neon PostgreSQL | Accepted | — |
| 004 | Drizzle ORM | Accepted | — |
| 005 | H3 rather than hard PostGIS | Accepted | — |
| 006 | MapLibre GL JS | Accepted | — |
| 007 | React Flow | Accepted | — |
| 008 | Recharts | Accepted | — |
| 009 | FastAPI separate ML service | Accepted | — |
| 010 | XGBoost primary | Accepted | — |
| 011 | SHAP TreeExplainer, aggregated | Accepted | — |
| 012 | DBSCAN + KDE | Accepted | — |
| 013 | Candidate-cell ranking | Accepted | — |
| 014 | AI layer at Phase 3 | Accepted | — |
| 015 | shadcn/ui on Radix | Accepted | — |
| 016 | Testing stack | Accepted | — |
| 017 | Vercel + container host + Neon | Accepted | — |
| 018 | Integer paise, UTC | Accepted | — |
| 019 | Roles without authentication | Accepted | — |
| 020 | Single typed error envelope | Accepted | — |
