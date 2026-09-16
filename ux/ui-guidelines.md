# UI GUIDELINES — CyberPulse AI

| Field | Value |
|---|---|
| Version | 1.0 |
| Audience | Anyone writing UI code or copy for this product, including Claude Code |
| Related | `ux/design-system.md` (tokens and components), `.claude/rules/frontend.md` (enforcement) |

These are the rules that decide arguments. Where a guideline and a personal preference conflict, the guideline wins; where two guidelines conflict, the one earlier in this document wins.

---

## 1. Non-Negotiables

1. **Never display a value the backend did not produce.** No placeholder risk score, no illustrative hotspot, no "example" percentage in shipped code. Every figure on screen traces to a field in an API response (AC-GLOBAL-01, TC-INT-010 … TC-INT-012).
2. **Never convey risk, status or severity by colour alone.** Text and icon accompany colour, always (AR-02).
3. **Never fabricate on failure.** When a capability is unavailable, name it and offer retry. Showing a stale or invented number is a defect of the highest severity (MOT-3).
4. **Never accuse.** UI copy describes accounts and locations, never people. The terminology lexicon in `ux/design-system.md` §9 is binding.
5. **Never remove the prototype disclosure.** The synthetic-data badge and the disclaimer are on every route (FR-25).
6. **Never blank the page for a partial failure.** Each surface degrades independently.

---

## 2. Copy Rules

### 2.1 Voice

Direct, specific, and calm. This is a tool used under pressure by professionals; it should read like a competent colleague, not like marketing and not like a compliance form.

| Write | Not |
|---|---|
| "Analyse this complaint to forecast likely cash-withdrawal locations." | "Unlock powerful AI insights!" |
| "Prediction service unavailable. Retry." | "Oops! Something went wrong 😔" |
| "No complaints match these filters." | "Nothing here yet" |
| "Select at least one recipient." | "Please make a valid selection" |
| "Measured on a held-out split of synthetic data." | "Highly accurate results" |

No exclamation marks. No emoji. No first-person plural ("we couldn't…") — the system is not a person. No apologies; state the condition and the remedy.

### 2.2 Sentence case everywhere

Buttons, headings, labels and menu items use sentence case, except the uppercase micro-label style defined in the design system (`H3`, `Label`) and the four fixed strings below.

### 2.3 Fixed strings

These are specified exactly and must not be paraphrased, because acceptance criteria assert on them.

| Context | Exact string |
|---|---|
| Header badge | `SAMPLE / SYNTHETIC PROTOTYPE DATA` |
| Global disclaimer | `Prototype uses synthetic/anonymized demonstration data. Predictions are experimental and intended for research/proof-of-concept use.` |
| Time window note | `Predicted window based on temporal patterns in related transactions and withdrawals.` |
| Metrics panel heading | `PROTOTYPE MODEL EVALUATION` |
| Alert modal title | `HIGH-RISK WITHDRAWAL ALERT` |
| ML degraded notice | Must contain `prediction service unavailable` |
| Node neutrality note | `Risk indicator. Not a finding about any person.` |

### 2.4 Numbers in copy

Never round in a way that overstates. `91.7%`, not "over 90%". Never write "highly likely" or "almost certain" — the confidence label is the vocabulary for uncertainty and it has exactly three values.

---

## 3. Layout Rules

- Page padding 32 px; card padding 20 px; section gap 24 px. Do not introduce new spacing values.
- One `<h1>` per route, matching the browser title.
- Primary action sits bottom-right in modals, top-right in page headers, and is the only filled button in its region.
- No more than one primary button visible in a region. Secondary actions are outline; tertiary are text.
- Tables are full-bleed within their card; charts have 16 px internal padding.
- Never centre body text. Never justify.
- Maximum measure for prose blocks is 72 characters.

---

## 4. State Rules

Every data-bearing surface implements four states through the shared `StatePanel` component. A surface that implements only success is incomplete and fails review.

| State | Requirement |
|---|---|
| Loading | Skeleton matching the final layout's shape and row count. Never a centred spinner over an empty region. Never replace already-rendered data with a skeleton on refetch — keep the data and show a subtle refresh indicator. |
| Empty | Says what is absent and what to do next. Distinguishes "no data exists" from "no data matches your filters". |
| Error | Names what failed in domain terms, offers retry, retains prior data where it is still valid. |
| Degraded | Reserved for a dependency being unavailable. Names the capability, shows no derived values, offers retry. |

---

## 5. Interaction Rules

- Buttons that trigger a request show an in-flight state and are disabled during it. Double submission must be impossible.
- Destructive or irreversible actions require confirmation naming the consequence ("This will clear 3 demo alerts and 1 demo investigation").
- Filters apply immediately; there is no "Apply" button. Filter state lives in the URL.
- Sorting and pagination never reset filters. Changing a filter always resets to page 1.
- Nothing auto-refreshes underneath the user. New data arriving during a session surfaces as a "3 new alerts — refresh" affordance the user chooses to act on.
- Toasts last 5 seconds, are dismissible, stack to a maximum of three, and never carry information available nowhere else.

---

## 6. Data Presentation Rules

- Money: integer paise in storage, `₹3,80,000` on screen, Indian digit grouping, no decimals.
- Timestamps: UTC in storage, IST on screen, always with the day for anything older than 24 hours.
- Scores: one decimal as a percentage in the UI (`91.7%`); three decimals in the metrics panel (`0.917`).
- IDs: rendered in full, in monospace, and copyable. Never truncate an identifier that a user may need to quote.
- Percentages in the factor list always sum to 100. If the underlying contributions do not, the residual is grouped as "Other factors" rather than left unaccounted.
- Empty numeric values render `—`, never `0`, when the cause is absence rather than a measured zero.

---

## 7. Map Rules

- The map is always interactive. A static image of a map is never acceptable (FR-11.3).
- Layer toggles are labelled switches, not icon-only buttons.
- The legend is always visible and always carries text labels.
- Markers carry their rank as a numeral so the map reads in greyscale.
- Clicking a marker opens the drawer; it does not navigate.
- The map never re-centres on data refresh; the user's viewport is theirs.
- The accessible table toggle is a first-class control in the toolbar, not hidden in a menu.

---

## 8. Graph Rules

- Layout is deterministic. The same complaint renders the same graph every time — a graph that reshuffles between views destroys the user's spatial memory and their trust in it.
- Node types differ by shape and icon, not only colour.
- Edge labels show amounts; direction markers are always drawn.
- Above 200 nodes, render the top-weighted subgraph and state the truncation explicitly with the true count.
- Node detail panels carry the neutrality note.
- No node ever renders a personal name — the type system has no field for one.

---

## 9. Form Rules

- Visible persistent labels. Placeholders are hints, never labels.
- Validate on blur and on submit; never on every keystroke.
- Show all errors at once on submit, and move focus to the first invalid field.
- Required is stated in text.
- Read-only intelligence fields in the alert modal are visually distinct from editable fields and are not rendered as disabled inputs — they are text, because they are not inputs.

---

## 10. Performance Rules

- Server Components by default. `'use client'` requires a reason: interactivity, browser API, or a client-only library.
- The map, the graph and the chart library are dynamically imported. None of them may appear in the initial dashboard bundle.
- Tables over 100 rows virtualise.
- Images: none in the product surface beyond the wordmark. No stock photography, no illustrations.
- No layout shift after load: reserve space for every async region (this is why skeletons match final shape).

---

## 11. Review Checklist

A UI change is not complete until every line here is true.

- [ ] No hard-coded prediction, score, hotspot name or metric value
- [ ] Risk/status/severity carries colour **and** text **and** icon
- [ ] Loading, empty, error and degraded states implemented
- [ ] Keyboard reachable; focus visible; focus returns on overlay close
- [ ] Live region announcement where the change is not visually obvious to a non-sighted user
- [ ] Copy follows the voice rules; fixed strings are exact
- [ ] Money, time, score and ID formatting follows §6
- [ ] Prototype badge and disclaimer still present on the route
- [ ] Terminology lexicon respected; no accusatory language
- [ ] Spacing and radius values come from the scale
- [ ] Server Component unless a documented reason requires otherwise
- [ ] axe-core clean at `critical` and `serious`
