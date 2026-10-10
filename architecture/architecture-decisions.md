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

**Status:** Accepted, amended for ADMIN by ADR-023 · **Date:** 2026-09-14

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

## ADR-021 — Extending the role concept: GUARD and I4C

**Status:** Accepted · **Date:** 2026-09-18

**Context.** ADR-019 established a role model that is asserted, never verified — any caller can select any of LEA/BANK/ADMIN, with authorisation enforced server-side regardless. Product requirements describe two personas with no code mapping today: an ATM Site Guard (operational, positional — see `project-management/decision-log.md` DEC-010, which explicitly rejected storing a specific guard's identity or contact number) and an I4C Intelligence Analyst (`product/personas.md` PER-02, national-scope, no case-management writes).

**Decision.** Extend `ActorRole` with two more values, `GUARD` and `I4C`, in the exact same asserted-not-verified mechanism ADR-019 already uses — no new identity is stored for either. `GUARD` is read-only and identity-free: `hotspots:read`, `metrics:read`, `settings:read`, `health:read` only, with its own landing page (`/guard`) composing positional duty-post data — deliberately excluded from `/risk-map`, since the hotspot drawer behind that route returns complaint-linked data (`fraudType`, `amountPaise`) gated only by `hotspots:read`, and `GUARD` lacks `complaints:read`. `I4C` is a national-scope reader whose capability profile is a strict subset of LEA's, unscoped like LEA/ADMIN in `services/lib/scope.ts`, with no new page needed — every route it can reach already exists.

**Alternatives.** (a) Store a real guard identity and notify a specific device — this is DEC-010's Option 1, already rejected, and remains rejected; nothing here reopens it. (b) Fold "the guard's info" into BANK's existing dashboard instead of a new role — smaller, but the user explicitly wanted the guard side to have its own view. (c) Map I4C onto the existing ADMIN role rather than adding a new one — rejected because I4C's actual needs (PER-02: national read access, no settings/simulation/demo-reset) are a materially different, narrower profile than ADMIN's.

**Trade-offs.** The capability matrix grows from 22×3=66 to 22×5=110 cases. Two pre-existing bugs surfaced and were fixed in the same change because GUARD is the first role whose profile exposes them: `reportService.metrics()` was checking `reports:read` instead of the documented `metrics:read`, and `InvestigationActionPanel`'s UI-only transition/note gating (written only with BANK in mind) would have shown I4C controls that 403 on submit.

**Consequences.** Migration `0005_add_guard_i4c_roles.sql` (additive `ALTER TYPE ... ADD VALUE`, rollback documented as a type rebuild — enum values cannot be dropped in place). `REQUIREMENTS.md` FR-20 updated in the same PR (CLAUDE.md binding instruction #2). `security/authorization.md` and `security/auth-strategy.md` updated to match. `project-management/decision-log.md` DEC-011 states explicitly why this does not reverse DEC-010.

**Reversible.** The capability matrix and page changes are reversible. The migration is not cleanly reversible — see its rollback note.

---

## ADR-022 — CITIZEN role and public report intake

**Status:** Accepted · **Date:** 2026-09-24

**Context.** DEC-013 adds Scam Shield, whose Report Now flow lets a member of the public create a complaint that officers then analyse. Every write in the system is attributed to an `ActorRole`, and every audit event carries one, so a citizen submission needs a role. The citizen must also be able to see the progress of their own report without seeing anything the prediction produced, and without the system storing who they are.

**Decision.** Add `CITIZEN` to `ActorRole`, in the same asserted-not-verified mechanism as ADR-019 and ADR-021. `CITIZEN` is denied all 22 existing capabilities and holds two new ones, `citizenReports:create` and `citizenReports:status`, which no other role holds. `/safety` pages always send `x-cyberpulse-role: CITIZEN`, independent of the role cookie. A submission creates a `DEMO`-origin complaint (ID from a dedicated sequence, `C-90000` to `C-99999`), a `citizen_reports` row holding only a SHA-256 hash of a one-time tracking code, and an audit event, in one transaction. Status lookup takes the complaint ID and the tracking code in a POST body; a wrong code and an unknown ID return byte-identical 404s. The status response schema is strict and carries only `complaintId`, `stage` and `updatedAt`.

**Alternatives.** (a) No role: make the citizen endpoints capability-free like health. Rejected: every service function calls `requireCapability`, and the audit event needs an actor. (b) Look up status by complaint ID alone. Rejected: complaint IDs are sequential, so anyone could read any citizen report's progress. (c) Collect a phone number to send status updates. Rejected: a personal-data column, which the schema forbids.

**Trade-offs.** The capability matrix grows from 110 to 144 cases. A lost tracking code cannot be recovered, by design. With no role cookie the dashboard still resolves to LEA; that declared gap (ADR-019) is unchanged, and this ADR does not claim to close it.

**Consequences.** Migration `0006_add_citizen_reports.sql`. `security/authorization.md`, `security/auth-strategy.md` and `security/threat-model.md` updated. `CITIZEN_REPORT_SUBMITTED` becomes the seventh audited action.

**Reversible.** The capability and page changes are reversible. The enum value is not cleanly reversible — see the migration's rollback note.

---

## ADR-023 — ADMIN needs a demo access code

**Status:** Accepted · **Date:** 2026-10-10 · **Amends:** ADR-019 for the ADMIN role only

**Context.** Under ADR-019 any caller could claim any role, by the header switcher, by writing the `cyberpulse_role` cookie, or by sending `x-cyberpulse-role`. For most roles that only demonstrates the authorisation boundary. ADMIN is different: it holds `settings:write`, `simulation:control` and `demo:reset`, so anyone who could reach a hosted demo could reset its data or change its risk thresholds during an evaluation.

**Decision.** ADMIN alone must be earned. `POST /api/role` with `role: "ADMIN"` requires `accessCode` equal to the `ADMIN_ACCESS_CODE` environment variable (compared in constant time) and otherwise returns 403. On success the cookie value is `ADMIN.<expiresAtMs>.<HMAC-SHA256>`, valid for 8 hours, keyed from the access code, and set `httpOnly`. `resolveRole` grants ADMIN only for a valid, unexpired signature; a plain `ADMIN` cookie, an edited one, an expired one, and the `x-cyberpulse-role` header claiming ADMIN all resolve to LEA (TC-SEC-010's "never escalate to ADMIN on bad input"). Every other role is still asserted, never verified, exactly as ADR-019, ADR-021 and ADR-022 describe, and the header may still claim any of them.

**Alternatives.** (a) A real login with accounts (Auth.js, Neon Auth): an accounts table, a new dependency and every role behind a session, for a prototype with no real data and no personal data allowed in the schema. (b) An access code for every role: closes nothing that matters, because the non-ADMIN roles only demonstrate boundaries, and it slows the live demo. (c) A separate signing secret: a second variable to provision; deriving the key from the code also makes changing the code end every ADMIN session.

**Trade-offs.** One code is shared by everyone who presents, so the audit trail still records a role, not a person. The cookie can be replayed for up to 8 hours by whoever holds it. Guessing is bounded by the 30/min mutation rate limit and the 12-character minimum. The cookie is `httpOnly` now because for ADMIN it is a bearer token; the earlier rule against `httpOnly` applied to a value that granted nothing.

**Consequences.** `ADMIN_ACCESS_CODE` is required at boot in every environment (`.env.example`, CI, `devops/environments.md` §6). E2E specs earn ADMIN through `tests/support/admin.ts`. Updated in the same change: `.claude/rules/security.md`, `security/auth-strategy.md`, `security/threat-model.md`, `architecture/security-architecture.md` §4.1, `architecture/api-design.md` API-091, `test-cases/api-tests.md` TC-API-091, `docs/demo-script.md`.

**Reversible.** Yes: no migration. Reverting the code change restores ADR-019 behaviour.

**Amendment (2026-10-10): the code is shown for judging.** Judges asked to use ADMIN on their own devices, so the role switcher shows the demo code with a **Use demo code** button. **While it is shown, anyone who can open the app can become ADMIN**, and the HMAC key, which derives from the code, can be computed by anyone, so ADMIN expiry is not a security property either. What remains: ADMIN is never granted by the role header or a hand-written cookie, and every ADMIN switch goes through `POST /api/role` and its rate limit. To make ADMIN private again, stop passing `demoCode` to `RoleSwitcher` (three call sites) and rotate `ADMIN_ACCESS_CODE`. Also added: one-click persona buttons replace the dropdown; the ADMIN form can be saved by a browser's password manager; and `keep: true` issues a 7-day ADMIN cookie instead of 8 hours.

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
| 019 | Roles without authentication | Accepted, amended by ADR-023 | — |
| 020 | Single typed error envelope | Accepted | — |
| 021 | GUARD and I4C roles | Accepted | — |
| 022 | CITIZEN role and public report intake | Accepted | — |
| 021 | Extending the role concept: GUARD and I4C | Accepted | — |
| 023 | ADMIN needs a demo access code | Accepted | ADR-019, ADMIN role only |
