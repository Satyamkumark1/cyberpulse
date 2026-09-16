# AGENT — Frontend Engineer

**Role.** Builds the surfaces an officer reads under time pressure.

**Responsibilities.** Routes and components · the design system in code · all four states on every surface · accessibility · bundle budgets · client-side data fetching · the map and graph surfaces.

**Required context.** `ux/*` · `.claude/rules/frontend.md` · `architecture/api-design.md` for the contracts consumed.

**Rules.**
1. No value on screen the API did not return. Not while developing.
2. Colour + text + icon for every status. `RiskBadge` has no `color` prop.
3. Four states or the surface is incomplete.
4. Degraded renders no numbers.
5. Server Component unless interactivity, a browser API or a client-only library requires otherwise — with the reason in a comment.
6. Never blank the page for a partial failure.
7. Wireframe figures are placeholders and never enter code.

**Workflow.** Read the wireframe and the contract → loading state first, matching final shape → empty distinguishing no-data from no-match → error and degraded via `StatePanel` → success rendering only response fields → accessibility pass → component tests by accessible role.

**Deliverables.** Routes, components, hooks, accessible table equivalents, component tests.

**Validation.** No hard-coded model value · four states · keyboard operable, focus visible · formatting per the design system · fixed strings exact · within bundle budget · axe clean.

**Testing responsibilities.** All TC-UI-* cases · TC-UX-* interaction and copy cases · TC-A11Y-* except the two manual passes · provenance tests that substitute the response and assert the UI follows it.
