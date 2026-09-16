# FRONTEND TEST CASES — CyberPulse AI

| Field | Value |
|---|---|
| Version | 1.0 |
| Count | 34 component and UI cases |
| Tools | Vitest + React Testing Library |
| Query policy | Accessible role and name first; `data-testid` only where no accessible handle exists |

---

## Complaint Registry — TC-UI-001 … 002

### TC-UI-001 — List renders a page with correct affordances
**Req** FR-02 · **FEAT-01** · **P3** · **High** · **Automated**
**Expected:** 25 rows. Sortable headers are buttons carrying `aria-sort`. Each row is a link. Pagination reports page and total pages.

### TC-UI-002 — Loading, empty and error states
**Req** FR-02.5 · **High**
**Expected:** Loading renders 25 row skeletons matching final row height. Empty renders "No complaints match these filters" plus a clear-filters action. Error renders a retryable banner **above** the table with previous rows retained.

---

## Complaint Detail — TC-UI-003 … 006, TC-UI-013

### TC-UI-003 — Detail layout
**Req** FR-03 · **High**
**Expected:** Two columns at ≥ 1440 px. Left: summary, timeline, linked accounts. Right: prediction panel. One `<h1>` matching the page title.

### TC-UI-004 — Summary block content
**Req** FR-03.1 · **High**
**Expected:** Complaint ID, fraud type, `₹3,80,000`, timestamp in IST, city, district, state, status.

### TC-UI-005 — Timeline ordering and content
**Req** FR-03.2 · **High**
**Expected:** Ascending timestamp. Each entry shows both account IDs, amount, channel and a risk-indicator text badge.

### TC-UI-006 — Linked accounts
**Req** FR-03.3 · **Medium**
**Expected:** Account ID, type, risk score to two decimals, status. No personal-name field rendered.

### TC-UI-013 — Window explanatory note
**Req** FR-09.3 · **High**
**Expected:** The exact string "Predicted window based on temporal patterns in related transactions and withdrawals." is present and programmatically associated with the window element via `aria-describedby`.

---

## Prediction Panel — TC-UI-014 … 019

### TC-UI-014 — Empty state before analysis
**Medium**
**Expected:** "No prediction yet" with an explanation of what analysis does. The Analyze button is enabled.

### TC-UI-015 — In-flight state
**High**
**Expected:** Skeleton confined to the prediction column. Button disabled. Rest of the page interactive.

### TC-UI-016 — Rendered values equal the response
**Req** NFR-15 · **Critical**
**Steps:** Render with a fixture response of `riskScore: 0.312`.
**Expected:** `31.2%` displayed. Re-rendering with 0.917 shows `91.7%`. No constant appears in the component.

### TC-UI-017 — Factor list
**Req** FR-10.4 · **High**
**Expected:** Collapsed by default with `aria-expanded="false"`. Expanded: each factor shows name, percentage, a bar, and direction as words. Negative contributions draw from the right.

### TC-UI-018 — Ranked alternatives
**Medium**
**Expected:** Collapsed by default. Expanded, renders exactly the response's entries in the response's order. No re-sorting, filtering or padding.

### TC-UI-019 — Degraded panel
**Req** NFR-07 · **Critical**
**Expected:** Contains "prediction service unavailable" and a retry control. Contains no percentage, no currency and no time range.

---

## Simulation Panel — TC-UI-020

### TC-UI-020 — Stream behaviour
**Req** FR-24 · **Medium**
**Expected:** Appends at the configured interval, capped at 50 visible rows. Pause halts within one interval. Reset clears the panel.

---

## Money-Trail Graph — TC-UI-007 … 012

### TC-UI-007 — Graph renders
**Req** FR-05 · **High**
**Expected:** ≥ 1 victim, ≥ 2 mule, ≥ 1 ATM node for `C-10284`. Legend present with text labels.

### TC-UI-008 — Node types distinguishable without colour
**Req** FR-05.1, AR-02 · **Critical**
**Expected:** Each type has a distinct shape, icon and text label. Under a greyscale filter, type remains determinable from the accessible name.

### TC-UI-009 — Edge semantics
**Req** FR-05.2 · **High**
**Expected:** Every edge has a direction marker and a rupee-formatted amount label.

### TC-UI-010 — Victim node detail
**Req** FR-05.3 · **Medium**
**Expected:** Complaint ID and amount.

### TC-UI-011 — Mule account node detail and neutrality note
**Req** FR-05.4, CR-04 · **High**
**Expected:** Account ID, risk score, transaction count, linked-account count. The exact string "Risk indicator. Not a finding about any person." is present. No name field.

### TC-UI-012 — ATM node detail
**Req** FR-05.5 · **Medium**
**Expected:** ATM ID, bank name, city, withdrawal list with amounts and timestamps.

---

## Map — TC-UI-030 … 036

### TC-UI-030 — Map is interactive, not an image
**Req** FR-11, FR-11.3 · **Critical**
**Expected:** A MapLibre canvas is in the DOM. Zoom and pan change reported centre or zoom. No `<img>` serves as the map surface.

### TC-UI-031 — Three labelled layer toggles
**Req** FR-11.1 · **High**
**Expected:** Switches labelled Risk Heatmap, Predicted Hotspots, ATM Locations. Toggling changes rendered feature counts.

### TC-UI-032 — Legend with text
**Req** FR-11.2 · **High**
**Expected:** HIGH, MEDIUM, LOW each with a swatch **and** a text label.

### TC-UI-033 — No static fallback image
**Req** FR-11.3 · **Medium**
**Expected:** Static scan finds no map image asset in the bundle.

### TC-UI-034 — Drawer opens on marker click
**Req** FR-12 · **High**
**Expected:** Opens within 300 ms, focus trapped, `Esc` closes, focus returns to the marker.

### TC-UI-035 — Drawer content
**Req** FR-12.1 · **High**
**Expected:** Location, score as a percentage, level as text, window, nearby ATM count and list, top factors, related complaint IDs — all from `GET /api/hotspots/:h3`.

### TC-UI-036 — Tile fallback
**Medium**
**Expected:** With tiles unreachable, the bundled India outline renders with a visible notice; data layers still render.

---

## Alerts — TC-UI-040 … 042

### TC-UI-040 — Modal opens pre-filled
**Req** FR-13 · **High**
**Expected:** Title exactly "HIGH-RISK WITHDRAWAL ALERT". Location, window, score, exposure and top factors populated from the prediction.

### TC-UI-041 — Intelligence fields are text, not inputs
**Req** FR-13.3 · **High**
**Expected:** No `input`, `textarea` or `select` inside the intelligence block. Only the recipients fieldset and the notes textarea are controls.

### TC-UI-042 — Recipient validation is visible
**Req** FR-13.2 · **Critical**
**Expected:** With none selected, Send is disabled **and** "Select at least one recipient" is displayed. Selecting one enables Send.

---

## Investigations and Reports — TC-UI-050, TC-UI-060 … 061

### TC-UI-050 — Consolidated case surface
**Req** FR-15.4 · **High**
**Expected:** Complaint summary, embedded graph, hotspot, factors and alerts on one route. Notes in reverse-chronological order.

### TC-UI-060 — Six charts render from API data
**Req** FR-16 · **High**
**Expected:** Six charts present. Each has an accessible-table toggle. No literal series in any component.

### TC-UI-061 — Metrics panel framing
**Req** FR-17.1 · **Critical**
**Expected:** Heading exactly "PROTOTYPE MODEL EVALUATION". Caption states the metrics were measured on a held-out split of synthetic data. Empty table renders "Model evaluation not yet run", never zeros.

---

## Platform Chrome — TC-UI-070, TC-UI-080 … 082

### TC-UI-070 — Demo scenario control
**Req** FR-19 · **High**
**Expected:** Prominent but not dominant. Disabled while a run is in flight. Emits `demo_started`.

### TC-UI-080 — Role control is labelled a prototype affordance
**Req** FR-20.2 · **High**
**Expected:** Labelled "Prototype role". No text implies an authenticated session.

### TC-UI-081 — Settings displays modes read-only
**Req** FR-22.1 · **High**
**Expected:** System Mode `Prototype`, Data Mode `Synthetic / Anonymised`, model version — all read-only. Thresholds editable for ADMIN only.

### TC-UI-082 — Prototype badge on every route
**Req** FR-25 · **Critical**
**Expected:** "SAMPLE / SYNTHETIC PROTOTYPE DATA" visible in the header on all twelve routes plus `/demo`.

---

## Shared Components — TC-UI-090 … 096

### TC-UI-090 — RiskBadge conveys three signals
**Req** AR-02 · **Critical**
**Expected:** Colour, icon and text for each of HIGH, MEDIUM, LOW, NONE. The component exposes no `color` prop.

### TC-UI-091 — StatePanel variants
**High**
**Expected:** Loading, empty, error and degraded each render distinctly. `degraded` is the only variant permitted to state ML unavailability.

### TC-UI-092 — KpiCard is a navigation control
**Medium**
**Expected:** Rendered as a link with a visible focus ring. Empty state renders `—` plus "No data for this range", not `0`.

### TC-UI-093 — FactorBar direction as text
**Req** FR-10.4 · **High**
**Expected:** "increases risk" / "reduces risk" present as words, not only as an arrow or colour.

### TC-UI-094 — DataTable has no selection affordance
**Medium**
**Expected:** No checkboxes. There are no bulk actions, and offering selection would imply capability that does not exist.

### TC-UI-095 — Toast behaviour
**Medium**
**Expected:** 5 s duration, dismissible, maximum three stacked, announced politely, never the sole carrier of information.

### TC-UI-096 — Error boundary isolation
**Req** NFR-06 · **High**
**Expected:** Throwing inside the map leaves the rest of the dashboard rendered and interactive.

---

## Summary

| Group | Cases | Critical | High | Medium |
|---|:--:|:--:|:--:|:--:|
| Registry and detail | 7 | 0 | 5 | 2 |
| Prediction panel | 6 | 2 | 2 | 2 |
| Graph | 6 | 1 | 3 | 2 |
| Map | 7 | 1 | 4 | 2 |
| Alerts | 3 | 1 | 2 | 0 |
| Investigations and reports | 3 | 1 | 2 | 0 |
| Platform chrome | 4 | 1 | 3 | 0 |
| Shared components | 7 | 2 | 3 | 2 |
| Simulation | 1 | 0 | 0 | 1 |
| **Total** | **34** | **9** | **24** | **11** |
