# ACCESSIBILITY TEST CASES — CyberPulse AI

| Field | Value |
|---|---|
| Version | 1.0 |
| Count | 15 (13 automated, 2 manual) |
| Target | WCAG 2.1 AA on core flows |
| Tools | axe-core via Playwright · manual NVDA + Chrome |
| Policy | `ux/accessibility.md` |

---

## Automated Scanning

### TC-A11Y-001 — Zero critical or serious violations on eight routes
**Req** NFR-08 · **P6** · **Critical** · **Automated**
**Routes:** `/dashboard`, `/complaints`, `/complaints/C-10284`, `/risk-map`, `/alerts`, `/investigations/INV-2041`, `/reports`, `/demo`
**Steps:** Run axe-core with `wcag2a` and `wcag2aa` tags on each route, with the prediction panel populated and the map fully loaded.
**Expected:** Zero violations at `critical` or `serious`. Violations at `moderate` or `minor` are recorded with an owner and do not block.

### TC-A11Y-006 — Contrast tokens verified
**Req** AR-01 · **High** · **Automated**
**Steps:** Compute the contrast ratio for every foreground/background token pairing in `ux/design-system.md` §2.
**Expected:** ≥ 4.5:1 body text, ≥ 3:1 large text and UI boundaries. Specifically: `risk-high` on `risk-high-bg` ≥ 4.5:1; `white` on `sih-blue-600` ≥ 4.5:1; `slate-600` on `white` ≥ 4.5:1. A new token that fails is a build failure, not a review comment.

---

## Colour Independence

### TC-A11Y-003 — Risk determinable in greyscale
**Req** AR-02 · **Critical** · **Automated**
**Steps:** Apply a CSS greyscale filter; capture the accessible name and visible text of every risk indication on the dashboard, the complaint list, the prediction panel, the map legend and the alerts list.
**Expected:** Every indication remains determinable from text or icon alone. `RiskBadge` renders "HIGH" / "MEDIUM" / "LOW" / "Not analysed" as text in all cases.

### TC-A11Y-008 — Charts labelled independently of colour
**Req** AR-02 · **High** · **Automated**
**Expected:** Every series is directly labelled or reachable from the chart's accessible table. No chart depends on a colour-only legend to be interpretable.

### TC-A11Y-009 — Map markers readable in greyscale
**Req** AR-02 · **High** · **Automated**
**Expected:** Hotspot markers render their rank as a numeral. The legend pairs every swatch with a text label.

---

## Keyboard

### TC-A11Y-002 — Keyboard-only critical path *(Manual)*
**Req** NFR-09 · **Critical** · **Manual**
**Steps:** Complete the five-interaction path — locate, open, analyse, generate alert, send — using only the keyboard.
**Expected:** Every step reachable. Focus ring visible at all times. Focus moves into the modal on open, is trapped, and returns to the trigger on close. No trap outside intended overlays.

### TC-A11Y-012 — Focus visible on every interactive element
**Req** NFR-09 · **High** · **Automated**
**Steps:** Tab through every focusable element on eight routes; compute the focus indicator's contrast against its background.
**Expected:** A 2 px ring with 2 px offset is present on every element, at ≥ 3:1 contrast. No element sets `outline: none` without a replacement.

### TC-A11Y-013 — Overlay focus management
**High** · **Automated**
**Expected:** Modal and drawer both trap focus, close on `Esc`, and return focus to the trigger. The drawer also closes on backdrop click; the alert modal does not, because it holds unsaved input.

### TC-A11Y-014 — Skip link and landmarks
**Medium** · **Automated**
**Expected:** A skip-to-content link is the first focusable element. `nav`, `header`, `main`, `footer` landmarks present, with `aria-label` on the sidebar nav. Exactly one `h1` per route.

---

## Screen Reader

### TC-A11Y-004 — Live region announcements *(Manual)*
**Req** AR-05 · **High** · **Manual, NVDA + Chrome**
**Steps:** Analyse `C-10284`; force a prediction failure; dispatch an alert; apply a filter.
**Expected:** Prediction completion announced politely with level, score, location and window. Failure announced assertively including "retry is available". Alert dispatch announced politely with recipients. Filter change announces the result count. No announcement describes a mechanism rather than an outcome.

### TC-A11Y-015 — Form labels and error association
**Req** 3.3.1, 3.3.2 · **High** · **Automated**
**Expected:** Every input has a persistent visible `<label>`. Placeholders are never the only label. Errors are referenced by `aria-describedby` and name the field. The recipients group is a `<fieldset>` with a `<legend>`, and its group error is announced assertively.

---

## Equivalents for Canvas Content

### TC-A11Y-010 — Map accessible table equivalence
**Req** AR-04 · **Critical** · **Automated**
**Steps:** Load `/risk-map`; capture the hotspot layer's data from the API; activate the accessible-table toggle; compare.
**Expected:** A `<table>` renders the same hotspots with rank, name, district, state, risk level as text, score and window. Row count equals the layer's feature count. The canvas is `aria-hidden`.

### TC-A11Y-011 — Graph accessible table equivalence
**Req** AR-04 · **Critical** · **Automated**
**Expected:** Two tables — nodes (type, ID, key attributes) and edges (from, to, amount, timestamp) — containing the same data as the rendered graph, not a summary of it.

### TC-A11Y-020 — Chart accessible table equivalence
**Req** FR-16.2 · **High** · **Automated**
**Expected:** Each of the six charts exposes a `⊞` control revealing a table of its plotted series, with values matching the API response.

---

## Motion and Reflow

### TC-A11Y-007 — Reduced motion honoured
**High** · **Automated**
**Steps:** Emulate `prefers-reduced-motion: reduce`; open a drawer, a modal and a toast; trigger a map fly-to; observe the skeleton.
**Expected:** No transition duration above 0 ms. The map jumps rather than animating. The skeleton shimmer is static. No content flashes more than three times per second.

### TC-A11Y-016 — Reflow and text spacing
**Req** 1.4.10, 1.4.12, CR-05 · **Medium** · **Automated**
**Expected:** At 1280 px, no horizontal page scrollbar; only tables, graph and map scroll within their own containers. With user text-spacing overrides applied, no content is clipped or overlapped.

---

## Declared Limitations

Recorded in `ux/accessibility.md` §8 and not treated as failures:

| Limitation | Mitigation |
|---|---|
| Map canvas not directly navigable | Full accessible table (TC-A11Y-010) |
| Graph canvas not directly navigable | Node and edge tables (TC-A11Y-011) |
| No layout below 1280 px | Documented target; V1 scope |
| Tested with NVDA + Chrome only | Broader matrix in V1 |
| No forced-colours audit | V1 scope |

An accessibility statement claiming complete coverage without having tested for it is worse than one that states its boundaries.

---

## Release Gate

Zero `critical` or `serious` axe violations across all eight routes, plus both manual passes completed and signed off. This gate blocks release; it is not advisory.

---

## Summary

| Group | Cases | Critical | High | Medium |
|---|:--:|:--:|:--:|:--:|
| Automated scanning | 2 | 1 | 1 | 0 |
| Colour independence | 3 | 1 | 2 | 0 |
| Keyboard | 4 | 1 | 2 | 1 |
| Screen reader | 2 | 0 | 2 | 0 |
| Canvas equivalents | 3 | 2 | 1 | 0 |
| Motion and reflow | 2 | 0 | 1 | 1 |
| **Total** | **15** | **5** | **9** | **2** |
