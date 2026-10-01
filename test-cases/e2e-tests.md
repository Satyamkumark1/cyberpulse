# END-TO-END TEST CASES — CyberPulse AI

| Field | Value |
|---|---|
| Version | 1.0 |
| Count | 45 |
| Tool | Playwright against the preview deployment |
| Practice | `engineering/e2e-testing.md` |

**Assertion policy:** rendered values are compared against the **intercepted API response**, never against expected constants. Every journey test is therefore also a fabrication test.

---

## Core Journey — TC-E2E-001 … 005

### TC-E2E-001 — Complaint to rendered prediction
**Req** FR-03.4 · **FEAT-02** · **P3** · **Critical**
**Steps:** Open `/complaints`; open `C-10284`; click Analyze; intercept the response; compare every displayed figure.
**Expected:** Exactly one `POST /api/predict`. Displayed percentage equals `round(riskScore × 100, 1)`. Level, confidence, location name, window and factor count all match the response.

### TC-E2E-002 — Prediction persists and survives reload
**Req** FR-03.5 · **Critical**
**Expected:** After reload, the same prediction renders from `latestPrediction` without a new inference call.

### TC-E2E-003 — Persist failure leaves no phantom prediction
**High**
**Steps:** Inject a failure in the factor insert; analyse; reload.
**Expected:** Error shown. After reload, no prediction is displayed and none exists in the database.

### TC-E2E-004 — Critical path is five interactions
**Req** BR-02 · **Critical**
**Expected:** Row click, Analyze, Generate Alert, select recipient, Send. Five interactions, no intermediate navigation.

### TC-E2E-005 — Re-analysis path
**Medium**
**Expected:** An analysed complaint shows the previous prediction with its timestamp and a Re-analyse action; re-analysing issues one new call and renders the new values.

---

## Alerts and Investigations — TC-E2E-010 … 014

### TC-E2E-010 — Alert from the hotspot drawer
**Req** FR-12.2 · **Critical**
**Expected:** Modal opens pre-filled with that hotspot's data, matching `GET /api/hotspots/:h3`.

### TC-E2E-011 — Alert propagates to three surfaces
**Req** FR-14.1 · **Critical**
**Expected:** Appears on the dashboard panel, `/alerts` and the investigation timeline within one refresh cycle, without a full page reload.

### TC-E2E-012 — Dispatch advances the investigation
**Req** FR-15.6 · **High**
**Expected:** Status becomes `Alert Sent`; the timeline shows an automatic transition entry.

### TC-E2E-013 — Supervisor review path
**Req** FR-10 · **High**
**Expected:** From the investigation route, both the factor breakdown and the money-trail graph are reachable without leaving the route.

### TC-E2E-014 — Bank acknowledgement round trip
**Req** FR-14.4 · **High**
**Expected:** As BANK, the alert is visible and acknowledgeable; as LEA, the acknowledgement and its timestamp are then visible.

---

## Demonstration — TC-E2E-020 … 024

### TC-E2E-020 — Six-step guided flow
**Req** FR-18 · **Critical**
**Expected:** Steps in order: complaint, graph, analysis, hotspot, explanation, alert. Step indicator accurate at each stage.

### TC-E2E-021 — Reset restores a known state
**Req** FR-18.1 · **Critical**
**Expected:** Confirmation names exact counts. Only demo-origin records cleared. Seed counts unchanged. Second reset idempotent.

### TC-E2E-022 — One-click scenario
**Req** FR-19.1 · **Critical**
**Expected:** Loads `C-10284`, shows processing, issues exactly one real prediction call, renders results, highlights the hotspot, shows the explanation and the graph, enables alert generation. Completes within 15 s.

### TC-E2E-023 — Degraded demo is honest
**Req** FR-19.3 · **Critical**
**Expected:** With ML stopped, a notice containing "prediction service unavailable" renders. No score, hotspot ranking or window appears. Remaining steps stay navigable.

### TC-E2E-024 — Demo does not disturb the corpus
**High**
**Expected:** After a full run and reset, all sixteen tables' seed counts are unchanged and `C-10284` is unmodified.

---

## Resilience — TC-E2E-030 … 034

### TC-E2E-030 — No unhandled error on any core route
**Req** NFR-06 · **Critical**
**Expected:** All twelve routes plus `/demo` render without triggering an error boundary, with the ML service both up and down.

### TC-E2E-031 — Independent surface degradation
**High**
**Expected:** With `/api/reports/metrics` failing, six charts still render and only the metrics panel shows an error.

### TC-E2E-032 — Rate-limit experience
**High**
**Expected:** The 11th alert attempt shows a countdown, the modal stays open, and no alert is created.

### TC-E2E-033 — Tile failure
**Medium**
**Expected:** Bundled outline renders with a notice; hotspot and ATM layers still display.

### TC-E2E-034 — Offline and recovery
**Medium**
**Expected:** Going offline shows an offline notice; restoring connectivity recovers without a reload.

---

## Cross-Browser and Viewport — TC-E2E-040 … 042

### TC-E2E-040 — Edge parity
**Req** NFR-18 · **High**
**Expected:** The core journey passes identically on Chromium and Edge.

### TC-E2E-041 — 1280 px reflow
**Req** CR-05 · **Medium**
**Expected:** Sidebar collapses; no horizontal page scrollbar; tables scroll within their container; all primary actions reachable.

### TC-E2E-042 — 2560 px layout
**Low**
**Expected:** Content max-width 1680 px, centred; no stretched columns.

---

## Integrity in the Browser — TC-E2E-050 … 054

### TC-E2E-050 — UI follows a substituted response
**Req** NFR-15 · **Critical**
**Steps:** Intercept `/api/predict` and rewrite to `riskScore: 0.312`, `riskLevel: "LOW"`, a different hotspot name.
**Expected:** The UI displays 31.2%, LOW and the substituted name. Any divergence means a value originates outside the response.

### TC-E2E-051 — Wireframe placeholders absent from the bundle
**High**
**Expected:** None of the illustrative figures used in `ux/wireframes.md` appear in the production bundle outside test fixtures.

### TC-E2E-052 — No prediction caching
**Critical**
**Expected:** Analysing A, then B, then A again with data changed in between produces three inference calls and a changed second result for A.

### TC-E2E-053 — Explanation absence is stated, not simulated
**Critical**
**Expected:** With SHAP forced to fail, the score renders and the factor region states the explanation could not be generated. No placeholder factor names appear.

### TC-E2E-054 — Metrics reflect the database
**High**
**Expected:** Changing a stored metric changes the displayed value; truncating the table shows "Model evaluation not yet run".

---

## Accessibility Journeys — TC-E2E-060 … 062

### TC-E2E-060 — Keyboard-only critical path
**Req** NFR-09 · **High**
**Expected:** The full five-interaction path completes by keyboard, focus always visible, focus returning to the trigger on modal close.

### TC-E2E-061 — axe clean on eight routes
**Req** NFR-08 · **Critical**
**Expected:** Zero `critical` or `serious` violations.

### TC-E2E-062 — Greyscale risk determinability
**Req** AR-02 · **Critical**
**Expected:** Under a greyscale filter, every risk indication remains determinable from text or icon.

---

## Scam Shield (FEAT-17) — TC-SAFE-030 … 039

Phone viewport (Pixel 7). `tests/safety/safety.spec.ts`, the `safety` project in `playwright.config.ts` (`pnpm --filter web test:safety`). TC-SAFE-033 needs the ML service; every row the suite writes is `DEMO`-origin and the suite ends with a demo reset.

| ID | Case | Req | Priority |
|---|---|---|---|
| TC-SAFE-030 | Scam Check: no verdict before the first tick; one tick → "Be careful"; two → "Stop" with the count and the matched reason; no `%` anywhere | FR-26 | Critical |
| TC-SAFE-031 | Verify: link, number and UPI results as documented; editing hides the stale result; zero `/api/*` requests | FR-27 | High |
| TC-SAFE-032 | Report Now shows the ID and code from the intercepted response, focus on the result heading; status page renders the stage from an intercepted response; a wrong code shows the not-found message and no stage | FR-28, FR-29 | Critical |
| TC-SAFE-033 | Full chain: citizen report → LEA queue → real prediction → alert → citizen sees "Alert sent to bank and police" | FR-28.1, FR-29 | Critical |
| TC-SAFE-034 | Status page contains no percentage, rupee amount, time range, "hotspot" or "window" | FR-29 | Critical |
| TC-SAFE-035 | Badge, disclaimer and report notice on all five routes in both languages | FR-30, FR-25 | Critical |
| TC-SAFE-036 | axe clean at critical and serious on five routes, both languages — **manual** until `@axe-core/playwright` is adopted (a dependency decision not taken in P9) | NFR-08 | High |
| TC-SAFE-037 | Report Now by keyboard with focus moved to each step heading; an invalid submit focuses the first invalid field | NFR-08 | High |
| TC-SAFE-038 | The Hindi link sets `lang=hi`; `main[lang=hi]`; Hindi heading | FR-30 | Medium |
| TC-SAFE-039 | A CITIZEN role cookie on `/dashboard` shows the officer gate, not an error | FR-20.4 | Medium |

---

## Summary

| Group | Cases | Critical | High | Medium | Low |
|---|:--:|:--:|:--:|:--:|:--:|
| Core journey | 5 | 3 | 1 | 1 | 0 |
| Alerts and investigations | 5 | 2 | 3 | 0 | 0 |
| Demonstration | 5 | 4 | 1 | 0 | 0 |
| Resilience | 5 | 1 | 2 | 2 | 0 |
| Cross-browser and viewport | 3 | 0 | 1 | 1 | 1 |
| Integrity in the browser | 5 | 3 | 2 | 0 | 0 |
| Accessibility journeys | 3 | 2 | 1 | 0 | 0 |
| Supplementary flows | 4 | 0 | 2 | 2 | 0 |
| Scam Shield (FEAT-17) | 10 | 5 | 3 | 2 | 0 |
| **Total** | **45** | **20** | **16** | **8** | **1** |
