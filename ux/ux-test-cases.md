# UX TEST CASES — CyberPulse AI

| Field | Value |
|---|---|
| Version | 1.0 |
| Scope | User-flow, interaction, state and copy verification |
| Format | Per `test-cases/test-case-template.md` |
| Automation | Playwright unless marked Manual |

---

### TC-UX-001 — Critical path completes in five interactions

- **Requirement:** FR-02, FR-03.4, FR-13, FR-14 · **Feature:** FEAT-01, 02, 11 · **Phase:** P5 · **Priority:** Critical · **Type:** E2E · **Automation:** Automated
- **Preconditions:** Seeded data; ML healthy; LEA role
- **Test data:** Complaint `C-10284`
- **Steps:**
  1. Open `/complaints`.
  2. Click the row for `C-10284` *(interaction 1)*.
  3. Click **Analyze Complaint** *(2)*.
  4. Wait for the prediction panel to render.
  5. Click **Generate Alert** *(3)*.
  6. Select the LEA recipient *(4)*.
  7. Click **Send Alert** *(5)*.
- **Expected:** Alert status reads SENT. Exactly five user interactions were required. No intermediate navigation occurred.
- **Severity if failed:** Critical

---

### TC-UX-002 — Progressive disclosure order on the prediction panel

- **Requirement:** FR-03.5, FR-10 · **Feature:** FEAT-02, 09 · **Phase:** P3 · **Priority:** High · **Type:** UI · **Automation:** Automated
- **Steps:**
  1. Analyse `C-10284`.
  2. Read the DOM order of the prediction panel's regions.
- **Expected:** Order is risk level → predicted location → expected window → factors (collapsed) → ranked alternatives (collapsed). The factor panel's `aria-expanded` is `false` on first render.
- **Severity if failed:** Medium

---

### TC-UX-003 — Refetch does not blank rendered data

- **Requirement:** NFR-06 · **Feature:** FEAT-01 · **Phase:** P3 · **Priority:** High · **Type:** UI · **Automation:** Automated
- **Steps:**
  1. Load `/complaints` and wait for 25 rows.
  2. Change the sort order.
  3. Sample the DOM during the in-flight request.
- **Expected:** The 25 previous rows remain in the DOM throughout; a subtle refresh indicator is present; no skeleton replaces rendered data.
- **Severity if failed:** Medium

---

### TC-UX-004 — Filter state survives reload and is shareable

- **Requirement:** FR-02.2 · **Feature:** FEAT-01 · **Phase:** P3 · **Priority:** High · **Type:** UI · **Automation:** Automated
- **Steps:**
  1. Apply fraud type `UPI Fraud` and state `Uttar Pradesh`.
  2. Copy the URL, reload, then open the URL in a fresh context.
- **Expected:** Both loads render the identical filtered result set with both filter chips active and the count badge reading 2.
- **Severity if failed:** Medium

---

### TC-UX-005 — Empty state distinguishes "no data" from "no match"

- **Requirement:** FR-02.5 · **Feature:** FEAT-01 · **Phase:** P3 · **Priority:** Medium · **Type:** UI · **Automation:** Automated
- **Steps:**
  1. Apply a filter combination that matches nothing.
  2. Read the empty-state copy.
  3. Repeat against an empty database.
- **Expected:** Filtered case reads "No complaints match these filters" with a `Clear all filters` action. Empty database reads a different message with no clear-filters action.
- **Severity if failed:** Low

---

### TC-UX-006 — Degraded state shows no numbers

- **Requirement:** FR-07.5, NFR-07 · **Feature:** FEAT-06 · **Phase:** P3 · **Priority:** Critical · **Type:** Integration · **Automation:** Automated
- **Steps:**
  1. Stop the ML service.
  2. Open `/complaints/C-10284` and click **Analyze Complaint**.
  3. Scan the prediction region for any digit followed by `%`, any `₹` amount, and any time range.
- **Expected:** Zero matches. A notice containing "prediction service unavailable" is present with a retry control. No error boundary is triggered.
- **Severity if failed:** Critical

---

### TC-UX-007 — Independent surface degradation

- **Requirement:** NFR-06 · **Feature:** FEAT-13 · **Phase:** P6 · **Priority:** High · **Type:** UI · **Automation:** Automated
- **Steps:**
  1. Force `GET /api/reports/metrics` to return 500 while other report endpoints succeed.
  2. Open `/reports`.
- **Expected:** Six charts render normally; only the metrics panel shows an error state; the page is otherwise fully usable.
- **Severity if failed:** High

---

### TC-UX-008 — Double submission is impossible

- **Requirement:** FR-14 · **Feature:** FEAT-11 · **Phase:** P5 · **Priority:** Critical · **Type:** UI · **Automation:** Automated
- **Steps:**
  1. Open the alert modal with a recipient selected.
  2. Click **Send Alert** three times within 200 ms.
- **Expected:** Exactly one `POST /api/alerts` request is issued; exactly one alert row exists; the button is disabled after the first click.
- **Severity if failed:** Critical

---

### TC-UX-009 — Destructive confirmation names the consequence

- **Requirement:** FR-18.1 · **Feature:** FEAT-14 · **Phase:** P7 · **Priority:** High · **Type:** UI · **Automation:** Automated
- **Steps:**
  1. Generate two demo alerts and one demo investigation.
  2. Click **Reset Demo**.
- **Expected:** The confirmation dialog names the exact counts to be cleared. Cancelling changes nothing. Confirming clears exactly those records and leaves seed row counts unchanged.
- **Severity if failed:** High

---

### TC-UX-010 — No auto-refresh under the user

- **Requirement:** §5 of `ux/ui-guidelines.md` · **Feature:** FEAT-11 · **Phase:** P5 · **Priority:** Medium · **Type:** UI · **Automation:** Automated
- **Steps:**
  1. Open `/alerts` and note the row order.
  2. Dispatch a new alert from a second browser context.
  3. Wait 30 seconds without interacting.
- **Expected:** The list does not reorder or re-render on its own. A "1 new alert — refresh" affordance appears. Activating it updates the list.
- **Severity if failed:** Medium

---

### TC-UX-011 — Fixed strings are exact

- **Requirement:** FR-09.3, FR-17.1, FR-25, AC-015-05 · **Feature:** FEAT-08, 13, 15 · **Phase:** P6 · **Priority:** Critical · **Type:** UI · **Automation:** Automated
- **Steps:** Visit every route and assert exact string equality for each of the seven fixed strings listed in `ux/ui-guidelines.md` §2.3 in the contexts where each applies.
- **Expected:** All present, character-for-character.
- **Severity if failed:** Critical

---

### TC-UX-012 — Prohibited claims absent

- **Requirement:** CR-02, AC-GLOBAL-02 · **Feature:** cross-cutting · **Phase:** P6 · **Priority:** Critical · **Type:** UI · **Automation:** Automated
- **Steps:** Extract all rendered text from every route; search case-insensitively for `official`, `endorsed`, `real-time bank data`, `guaranteed recovery`, `prevents fraud`, `government-approved`.
- **Expected:** Matches occur only inside the responsible-use notice, where each appears within an explicit negative statement.
- **Severity if failed:** Critical

---

### TC-UX-013 — Terminology lexicon respected

- **Requirement:** CR-03, CR-04, AC-GLOBAL-03 · **Feature:** cross-cutting · **Phase:** P6 · **Priority:** Critical · **Type:** UI · **Automation:** Automated
- **Steps:** Extract all rendered text; search for `criminal`, `fraudster`, `offender`, `guilty`, `accused`, `culprit`.
- **Expected:** Zero matches. Account risk language is limited to "Mule Account", "Suspicious Account" and "Risk Indicator".
- **Severity if failed:** Critical

---

### TC-UX-014 — Graph layout is deterministic

- **Requirement:** §8 of `ux/ui-guidelines.md` · **Feature:** FEAT-04 · **Phase:** P4 · **Priority:** High · **Type:** UI · **Automation:** Automated
- **Steps:**
  1. Open the money-trail graph for `C-10284`; record every node's position.
  2. Navigate away, return, and record positions again.
  3. Reload the page and record a third time.
- **Expected:** All three position sets are identical to within 1 px.
- **Severity if failed:** High

---

### TC-UX-015 — Map viewport is not stolen on refresh

- **Requirement:** §7 of `ux/ui-guidelines.md` · **Feature:** FEAT-10 · **Phase:** P4 · **Priority:** Medium · **Type:** UI · **Automation:** Automated
- **Steps:**
  1. Open `/risk-map`, zoom to Noida, record centre and zoom.
  2. Trigger a data refresh by toggling a layer twice.
- **Expected:** Centre and zoom are unchanged.
- **Severity if failed:** Medium

---

### TC-UX-016 — Drawer opening does not re-centre the map beyond necessity

- **Requirement:** `ux/wireframes.md` W-04 · **Feature:** FEAT-10 · **Phase:** P4 · **Priority:** Low · **Type:** UI · **Automation:** Automated
- **Steps:** With a marker visible near the left edge, click it and observe the viewport.
- **Expected:** The map pans only if the marker would be occluded by the 480 px drawer, and by no more than the occluded width.
- **Severity if failed:** Low

---

### TC-UX-017 — Read-only intelligence fields are not inputs

- **Requirement:** FR-13.3, AC-011-02 · **Feature:** FEAT-11 · **Phase:** P5 · **Priority:** High · **Type:** UI · **Automation:** Automated
- **Steps:** Open the alert modal; query for `input`, `textarea` and `select` elements within the intelligence block.
- **Expected:** None found. Risk score, severity, exposure, location and window are rendered as text. Only the recipients fieldset and the notes textarea are form controls.
- **Severity if failed:** High

---

### TC-UX-018 — Reduced motion honoured

- **Requirement:** `ux/accessibility.md` §7 · **Feature:** cross-cutting · **Phase:** P6 · **Priority:** Medium · **Type:** UI · **Automation:** Automated
- **Steps:** Emulate `prefers-reduced-motion: reduce`; open a drawer, a modal, a toast, and trigger a map fly-to.
- **Expected:** No transition durations above 0 ms; the map jumps rather than animating; the skeleton shimmer is static.
- **Severity if failed:** Medium

---

### TC-UX-019 — 1280 px reflow

- **Requirement:** CR-05 · **Feature:** cross-cutting · **Phase:** P6 · **Priority:** Medium · **Type:** UI · **Automation:** Automated
- **Steps:** Set viewport to 1280×720; visit every route.
- **Expected:** Sidebar auto-collapses to 64 px; no horizontal page scrollbar; tables scroll horizontally within their container only; all primary actions remain reachable.
- **Severity if failed:** Medium

---

### TC-UX-020 — Demo scenario completes within the narrative budget

- **Requirement:** FR-19.1, G-06 · **Feature:** FEAT-14 · **Phase:** P8 · **Priority:** Critical · **Type:** E2E · **Automation:** Automated + Manual rehearsal
- **Steps:**
  1. Warm the ML service.
  2. Start a timer, click **RUN DEMO SCENARIO**, and stop when the alert modal is dispatchable.
- **Expected:** Automated sequence completes in ≤ 15 s. Two manual narrated rehearsals complete the full six steps in ≤ 180 s.
- **Severity if failed:** Critical

---

### TC-UX-021 — Keyboard-only critical path *(Manual)*

- **Requirement:** NFR-09 · **Feature:** cross-cutting · **Phase:** P6 · **Priority:** High · **Type:** Accessibility · **Automation:** Manual
- **Steps:** Complete TC-UX-001 using only the keyboard.
- **Expected:** Every step reachable; focus always visible; focus returns to the trigger when the modal closes; no trap outside intended overlays.
- **Severity if failed:** High

---

### TC-UX-022 — Screen-reader announcement of prediction completion *(Manual)*

- **Requirement:** AR-05 · **Feature:** FEAT-02, 09 · **Phase:** P6 · **Priority:** High · **Type:** Accessibility · **Automation:** Manual (NVDA + Chrome)
- **Steps:** With NVDA running, analyse `C-10284` and listen.
- **Expected:** A polite announcement states completion, risk level, score, predicted location and window, matching the copy in `ux/accessibility.md` §5.2.
- **Severity if failed:** High

---

### TC-UX-023 — First-run comprehension *(Manual)*

- **Requirement:** BR-02, G-06 · **Feature:** cross-cutting · **Phase:** P8 · **Priority:** High · **Type:** Usability · **Automation:** Manual
- **Steps:** Give a participant unfamiliar with the project the URL and no instructions. Ask them to find out where the money from complaint `C-10284` is likely to be withdrawn and why. Observe without assisting for three minutes.
- **Expected:** At least four of five participants reach the prediction and correctly state the predicted location, the window and at least two contributing factors, unaided, within three minutes.
- **Severity if failed:** High

---

## UX Test Coverage Summary

| Area | Cases | Critical | High | Medium | Low |
|---|:--:|:--:|:--:|:--:|:--:|
| Critical path and flow | 4 | 2 | 1 | 1 | 0 |
| State handling | 4 | 2 | 1 | 1 | 0 |
| Copy and safety | 3 | 3 | 0 | 0 | 0 |
| Map and graph | 4 | 0 | 2 | 1 | 1 |
| Forms and interaction | 3 | 1 | 1 | 1 | 0 |
| Accessibility and responsive | 5 | 1 | 2 | 2 | 0 |
| **Total** | **23** | **9** | **7** | **6** | **1** |
