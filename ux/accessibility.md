# ACCESSIBILITY — CyberPulse AI

| Field | Value |
|---|---|
| Version | 1.0 |
| Target | WCAG 2.1 Level AA on all core flows |
| Verification | axe-core via Playwright, manual keyboard pass, manual screen-reader pass (NVDA + Chrome) |
| Related | `test-cases/accessibility-tests.md`, `ux/design-system.md` |

---

## 1. Why This Matters Here Specifically

Two properties of this product make accessibility a correctness concern rather than a compliance checkbox.

First, the product's central output is a **risk level**, and the instinctive way to encode risk is colour. Roughly one in twelve men has a colour vision deficiency. An officer who cannot distinguish the HIGH badge from the MEDIUM badge is not inconvenienced — they receive wrong intelligence. This is why colour independence (AR-02) is specified as a hard requirement and enforced through the component API rather than through review discipline.

Second, the two most information-dense surfaces — the map and the graph — are canvas-rendered and inherently inaccessible to assistive technology. An equivalent table is therefore not a courtesy; it is the only way that data exists for a portion of users (AR-04).

---

## 2. Conformance Commitments

| WCAG criterion | Level | Commitment |
|---|---|---|
| 1.1.1 Non-text Content | A | Every icon has a text label or `aria-label`; decorative icons are `aria-hidden` |
| 1.3.1 Info and Relationships | A | Semantic tables, `<fieldset>`/`<legend>` for recipient groups, headings in order |
| 1.3.2 Meaningful Sequence | A | DOM order matches visual order on every surface |
| 1.4.1 Use of Colour | A | **Risk, status and severity always carry text plus icon** |
| 1.4.3 Contrast (Minimum) | AA | ≥ 4.5:1 body, ≥ 3:1 large text and UI boundaries; verified in CI |
| 1.4.10 Reflow | AA | Usable at 1280 px without two-dimensional scrolling except tables, graph and map |
| 1.4.11 Non-text Contrast | AA | ≥ 3:1 for control boundaries, focus rings, chart marks and map markers |
| 1.4.12 Text Spacing | AA | No loss of content with user-applied spacing overrides |
| 2.1.1 Keyboard | A | All functionality keyboard operable |
| 2.1.2 No Keyboard Trap | A | Modals and drawers trap deliberately and release on `Esc` |
| 2.4.3 Focus Order | A | Logical; focus returns to the trigger when an overlay closes |
| 2.4.7 Focus Visible | AA | 2 px `sih-blue-600` ring with 2 px offset, never removed |
| 2.5.3 Label in Name | A | Accessible name begins with the visible label |
| 3.2.2 On Input | A | No control causes navigation on change; filters apply without moving focus |
| 3.3.1 Error Identification | A | Errors identify the field by name in text |
| 3.3.2 Labels or Instructions | A | Every input has a persistent visible label, not a placeholder |
| 4.1.2 Name, Role, Value | A | Radix primitives provide correct roles; custom components tested |
| 4.1.3 Status Messages | AA | Live regions announce prediction completion, alert dispatch and errors |

---

## 3. Colour Independence — Implementation

The `RiskBadge` component takes a `level` prop and derives colour, icon and text from it. There is no prop that sets colour independently. Consequently a developer cannot render a risk indication that is colour-only, even by mistake.

| Level | Colour | Icon | Text |
|---|---|---|---|
| HIGH | `risk-high` | `alert-triangle` `▲` | "HIGH" |
| MEDIUM | `risk-medium` | `alert-circle` `●` | "MEDIUM" |
| LOW | `risk-low` | `shield-check` `▼` | "LOW" |
| NONE | `risk-none` | `minus-circle` `—` | "Not analysed" |

The same rule extends to charts (series labelled directly, not by legend colour alone), the map legend (text label beside every swatch), map markers (rank numeral rendered inside), factor bars (direction as words) and alert severity (text badge).

**Verification:** TC-A11Y-003 renders each surface with a greyscale filter applied and asserts that risk level remains determinable from the accessible name.

---

## 4. Keyboard Model

| Context | Behaviour |
|---|---|
| Global | `/` focuses search; `g` + letter navigates; `?` opens the shortcut sheet |
| Tables | `Tab` reaches the row; `Enter` opens it; sortable headers are buttons with `aria-sort` |
| Filters | Each filter is a labelled combobox; applying does not steal focus |
| Modal | Focus moves to the first interactive element; trapped; `Esc` closes; focus returns to the trigger |
| Drawer | Same as modal; backdrop click also closes |
| Map | Toggles and the accessible-table control are in tab order; canvas is `aria-hidden` with the table as its documented equivalent |
| Graph | Canvas is `aria-hidden`; an equivalent node/edge table is reachable from the toolbar |
| Toasts | Not focus-stealing; announced through a polite live region; dismissible from the toast region in tab order |

**Focus ring:** 2 px solid `sih-blue-600`, 2 px offset, on every focusable element. `outline: none` without a replacement indicator is blocked by an ESLint rule.

---

## 5. Screen Reader Support

### 5.1 Landmarks

`<nav aria-label="Primary">` for the sidebar · `<header>` for the top bar · `<main>` for content · `<aside aria-label="Hotspot details">` for the drawer · `<footer>` for attribution. One `<h1>` per route matching the page title.

### 5.2 Live regions

| Event | Politeness | Announcement |
|---|---|---|
| Prediction completed | `polite` | "Prediction complete. Risk HIGH, 91.7 percent. Predicted location Sector 18, Noida. Expected window 14:00 to 16:00." |
| Prediction failed | `assertive` | "Prediction failed. Prediction service unavailable. Retry is available." |
| Alert dispatched | `polite` | "Alert sent to LEA and Bank." |
| Filter applied | `polite` | "Showing 24 complaints." |
| Validation error | `assertive` | "Error. Select at least one recipient." |
| Status changed | `polite` | "Investigation status changed to Alert Sent." |

Announcements state the *outcome*, not the mechanism. "Loading" is announced only when a wait exceeds one second.

### 5.3 Table equivalents

| Surface | Equivalent |
|---|---|
| Risk map | Table of hotspots: rank, name, district, state, risk level, score, window, nearby ATM count |
| Money-trail graph | Two tables — nodes (type, ID, key attributes) and edges (from, to, amount, timestamp) |
| Each chart | Table of the plotted series, reachable from a `⊞` control on the chart header |

Equivalents render the **same data from the same response**, not a summary. A summary would be a different, lesser product for those users.

---

## 6. Forms and Errors

- Every input has a persistent visible `<label>`; placeholders are never the only label.
- Required fields are marked in text ("Required"), not by an asterisk alone.
- Errors appear adjacent to the field, referenced by `aria-describedby`, and name the field in the message.
- The recipient checkbox group is a `<fieldset>` with a `<legend>`; its group-level error is announced assertively.
- Submission is blocked with the reason stated in text, never by a silently disabled button — the disabled `Send Alert` is always accompanied by the "Select at least one recipient" message.

---

## 7. Motion and Sensory

- `prefers-reduced-motion: reduce` disables all transitions, the skeleton shimmer, map fly-to (replaced by an instant jump) and graph settle animation.
- No content flashes more than three times per second.
- No information is conveyed by sound; no audio is used.
- Nothing is conveyed by hover alone — every hover affordance has a focus and a click equivalent (AR-06).

---

## 8. Known Limitations (declared, not hidden)

| Limitation | Impact | Mitigation | Status |
|---|---|---|---|
| Map canvas is not directly navigable | Screen-reader users cannot pan spatially | Full accessible table equivalent | Accepted for v1.0 |
| Graph canvas is not directly navigable | Same | Node and edge tables | Accepted for v1.0 |
| No mobile layout below 1280 px | Not usable on phones | Documented target viewport; V1 scope | Accepted for v1.0 |
| Not tested with JAWS or VoiceOver | Unknown behaviour on those combinations | NVDA + Chrome tested; broader matrix in V1 | Declared |
| No high-contrast Windows theme testing | Unknown | Forced-colours audit in V1 | Declared |

Declaring these is deliberate. An accessibility statement that claims full coverage without having tested for it is worse than one that states its boundaries.

---

## 9. Verification Plan

| Check | Tool | Frequency | Test case |
|---|---|---|---|
| Automated rule scan on every route | axe-core via Playwright | Every CI run | TC-A11Y-001 |
| Keyboard-only traversal of the critical path | Manual | Every phase exit | TC-A11Y-002 |
| Greyscale risk determinability | Playwright + CSS filter | Every CI run | TC-A11Y-003 |
| Live region announcements | Manual, NVDA | P6 and P8 | TC-A11Y-004 |
| Contrast token verification | Script over the token file | Every CI run | TC-A11Y-006 |
| Map table equivalence | Playwright data comparison | Every CI run | TC-A11Y-010 |
| Graph table equivalence | Playwright data comparison | Every CI run | TC-A11Y-011 |
| Chart table equivalence | Playwright data comparison | Every CI run | TC-A11Y-020 |
| Reduced-motion behaviour | Playwright with the media feature emulated | Every CI run | TC-A11Y-007 |

**Release gate:** zero axe-core violations at `critical` or `serious` severity on `/dashboard`, `/complaints`, `/complaints/[id]`, `/risk-map`, `/alerts`, `/investigations/[id]`, `/reports` and `/demo`.
