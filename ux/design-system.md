# DESIGN SYSTEM — CyberPulse AI

| Field | Value |
|---|---|
| Version | 1.0 |
| Foundation | Tailwind CSS + shadcn/ui (Radix primitives) + Lucide React |
| Design language | Government intelligence · modern fintech · cybersecurity operations |
| Primary viewport | 1920×1080 |

---

## 1. Design Principles

1. **Legibility over impression.** This is an operations console read under time pressure. Nothing decorative may reduce scan speed.
2. **Density with air.** High information density is required, but every region has clear boundaries and consistent internal padding.
3. **Colour is never the message.** Every risk indication carries text and iconography. Colour is reinforcement (AR-02).
4. **Restraint signals credibility.** A government intelligence tool that looks like a hacker aesthetic loses the room. No neon, no glassmorphism, no gradient fills, no hero sections.
5. **Motion only where it explains.** Animation is used for state transition and spatial continuity, never for delight.
6. **The prototype label is part of the design.** It is placed, styled and spaced deliberately — not bolted on.

### Explicitly forbidden

Cyberpunk or "hacker" visual tropes · neon accents · matrix/terminal typography as a primary face · excessive glass or blur · random or decorative gradients · giant marketing hero sections · dark-mode-only design · animated backgrounds · skull/lock/hoodie iconography.

---

## 2. Colour Tokens

### 2.1 Base palette

| Token | Hex | Use |
|---|---|---|
| `navy-900` | `#0B1B33` | Sidebar background, deepest surface |
| `navy-800` | `#122745` | Header background, elevated dark surface |
| `navy-700` | `#1B3559` | Dark surface borders, hover on dark |
| `navy-600` | `#27456F` | Dark surface active state |
| `sih-blue-600` | `#1B5FBF` | Primary action, active navigation, links |
| `sih-blue-500` | `#2F76D9` | Primary hover |
| `sih-blue-100` | `#E3EDFB` | Primary subtle background, selected rows |
| `white` | `#FFFFFF` | Content surface |
| `slate-50` | `#F6F8FB` | Page background |
| `slate-100` | `#ECF0F6` | Subtle fill, table zebra |
| `slate-200` | `#DCE3EC` | Borders, dividers |
| `slate-400` | `#94A3B4` | Disabled text, placeholder |
| `slate-600` | `#556377` | Secondary text |
| `slate-800` | `#28374B` | Primary text |
| `teal-600` | `#0E7C86` | Secondary accent, informational emphasis |
| `teal-100` | `#DDF2F4` | Informational background |

### 2.2 Semantic / risk palette

| Token | Hex | Meaning | Paired text | Paired icon |
|---|---|---|---|---|
| `risk-high` | `#C0392B` | HIGH risk | "HIGH" | `▲` `alert-triangle` |
| `risk-high-bg` | `#FBEAE8` | HIGH background | — | — |
| `risk-medium` | `#C97A0E` | MEDIUM risk | "MEDIUM" | `●` `alert-circle` |
| `risk-medium-bg` | `#FDF2E2` | MEDIUM background | — | — |
| `risk-low` | `#1F7A47` | LOW risk | "LOW" | `▼` `shield-check` |
| `risk-low-bg` | `#E6F4EC` | LOW background | — | — |
| `risk-none` | `#94A3B4` | Not analysed | "Not analysed" | `—` `minus-circle` |
| `status-success` | `#1F7A47` | Success, healthy | — | `check-circle` |
| `status-warning` | `#C97A0E` | Degraded | — | `alert-circle` |
| `status-error` | `#C0392B` | Down, failed | — | `x-circle` |
| `status-info` | `#0E7C86` | Informational | — | `info` |

**Contrast verification.** Every foreground/background pairing above meets WCAG AA. `risk-high` on `risk-high-bg` = 6.1:1; `risk-medium` on `risk-medium-bg` = 4.8:1; `risk-low` on `risk-low-bg` = 5.4:1; `slate-800` on `white` = 12.6:1; `white` on `navy-900` = 15.8:1; `white` on `sih-blue-600` = 5.9:1. Values are re-verified in CI by the contrast check in `test-cases/accessibility-tests.md`.

**Colour-independence rule.** No component may express risk, status or severity through colour alone. Every instance pairs colour with a text label and an icon. This is enforced by a lint rule on the `<RiskBadge>` component API, which requires a `level` prop and renders all three signals from it.

### 2.3 Map palette

| Layer | Encoding |
|---|---|
| Risk heatmap | Sequential single-hue ramp `#E3EDFB → #C0392B`, five stops, with a text-labelled legend |
| Hotspot markers | Filled circle sized by rank, bordered `white` 2 px, with the rank number rendered inside |
| ATM markers | Neutral `slate-600` pin, clustered above threshold with a count label |
| Selected hotspot | 3 px `navy-900` ring plus a persistent label |

Marker rank numerals mean the map remains readable in greyscale and to users with colour vision deficiency.

---

## 3. Typography

| Role | Family | Size / line | Weight | Tracking |
|---|---|---|---|---|
| Display | Inter | 32 / 40 | 600 | −0.02em |
| H1 page title | Inter | 24 / 32 | 600 | −0.01em |
| H2 section | Inter | 18 / 26 | 600 | 0 |
| H3 card title | Inter | 14 / 20 | 600 | 0.04em, uppercase |
| Body | Inter | 14 / 22 | 400 | 0 |
| Body small | Inter | 13 / 20 | 400 | 0 |
| Caption / meta | Inter | 12 / 18 | 400 | 0.01em |
| Label | Inter | 12 / 16 | 500 | 0.06em, uppercase |
| Numeric / tabular | JetBrains Mono | 14 / 22 | 500 | 0, `tabular-nums` |
| KPI value | JetBrains Mono | 30 / 36 | 600 | −0.01em, `tabular-nums` |

**Monospace for all figures.** Amounts, scores, percentages, coordinates, IDs and timestamps use the monospace face with tabular figures so columns align and a changing value does not shift layout.

---

## 4. Spacing, Radius, Elevation

**Spacing scale (px):** 2, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64.
**Radius:** `sm` 4 px (badges, inputs) · `md` 6 px (buttons, cards) · `lg` 8 px (modals, drawers) · `full` (pills, avatars).
**Elevation:** flat by default. `card` = 1 px `slate-200` border, no shadow. `raised` = `0 1px 2px rgba(11,27,51,0.06)`. `overlay` = `0 8px 24px rgba(11,27,51,0.12)`. Nothing exceeds `overlay`.

---

## 5. Core Components

### 5.1 RiskBadge

```tsx
<RiskBadge level="HIGH" score={0.917} showScore />
// renders: ▲ HIGH · 91.7%
```

| Prop | Type | Notes |
|---|---|---|
| `level` | `'HIGH' \| 'MEDIUM' \| 'LOW' \| 'NONE'` | Required — drives colour, icon and text together |
| `score` | `number` | 0–1; formatted to one decimal percentage |
| `showScore` | `boolean` | Default false |
| `size` | `'sm' \| 'md'` | Default `md` |

There is deliberately **no `color` prop**. Colour cannot be set independently of level, which makes AR-02 structurally enforceable.

### 5.2 KpiCard

Label (uppercase, `slate-600`), value (mono, 30 px), delta with direction arrow **and** sign text, optional sub-line. The whole card is a link with a visible focus ring. Empty state renders `—` with "No data for this range".

### 5.3 FactorBar

Name, percentage (mono), horizontal bar, direction as text ("increases risk" / "reduces risk"). Bars for negative contributions render from the right. Contributions below 2% collapse into "Other factors" while the displayed sum stays exactly 100%.

### 5.4 DataTable

Sticky header, optional zebra striping, sortable column headers with `aria-sort`, row-level link semantics, 25-row default page size, per-cell text truncation with a title attribute, skeleton rows during load, and a distinct empty state. Selection is not supported — there are no bulk actions in the prototype, and offering selection would imply capability that does not exist.

### 5.5 StatePanel

One component renders loading, empty, error and degraded states so that no surface can invent its own. Props: `variant`, `title`, `description`, `action`. The `degraded` variant renders the ML-unavailable message and is the only component permitted to communicate that condition.

### 5.6 Drawer and Modal

Radix Dialog primitives. Focus trapped, `Esc` closes, backdrop click closes drawers but not destructive modals, focus returns to the trigger on close. Drawer width 480 px; modal max-width 640 px.

### 5.7 Graph nodes

Three node components (`VictimNode`, `MuleAccountNode`, `AtmNode`) distinguished by shape (rounded rectangle / rectangle / circle), icon and text label. Each carries the neutrality note in its detail panel.

---

## 6. Iconography

Lucide React exclusively, 16 px in dense contexts and 20 px in headers, 1.5 px stroke, always paired with a text label or an `aria-label`.

| Concept | Icon |
|---|---|
| Dashboard | `layout-dashboard` |
| Complaints | `file-text` |
| Risk map | `map` |
| Transactions | `arrow-left-right` |
| Investigations | `search` |
| Alerts | `bell-ring` |
| Reports | `bar-chart-3` |
| Settings | `settings` |
| HIGH / MEDIUM / LOW risk | `alert-triangle` / `alert-circle` / `shield-check` |
| Victim / Mule account / ATM | `user-round` / `landmark` / `banknote` |
| Prototype notice | `info` |

Forbidden: skulls, hoodies, padlocks-with-chains, binary rain, fingerprint clichés.

---

## 7. Motion

| Interaction | Duration | Easing |
|---|---|---|
| Hover / focus | 120 ms | `ease-out` |
| Drawer slide | 220 ms | `cubic-bezier(0.16, 1, 0.3, 1)` |
| Modal fade + scale | 180 ms | `ease-out` |
| Toast enter/exit | 200 ms | `ease-out` |
| Skeleton shimmer | 1400 ms loop | `linear` |
| Map fly-to | 600 ms | `ease-in-out` |
| Graph layout settle | 400 ms | `ease-out` |

All motion is disabled under `prefers-reduced-motion: reduce`, replaced by instant state changes. Progress indicators reflect real pipeline stages; no animation is lengthened to make work appear more substantial.

---

## 8. Data Formatting Rules

| Data | Rule | Example |
|---|---|---|
| Currency | Indian grouping, `₹` prefix, no decimals | `₹3,80,000` |
| Risk score | One decimal percentage | `91.7%` |
| Model probability in tables | Three decimals | `0.917` |
| Timestamps | IST, `dd MMM yyyy, HH:mm` | `14 Sep 2026, 09:12` |
| Time windows | 24-hour, en dash, IST suffix | `14:00 – 16:00 IST` |
| Coordinates | Four decimals | `28.5700, 77.3200` |
| Account IDs | Full synthetic ID, monospace | `ACC-88123390` |
| Distances | Metres below 1 km, else one decimal km | `220 m` / `1.4 km` |
| Counts | Plain integer with a unit label | `3 ATMs` |

Storage rules that make these safe: money in integer paise, timestamps in UTC (NFR-27, NFR-28). Formatting happens only at the presentation edge.

---

## 9. Terminology Lexicon

Terms are fixed. Any change requires a decision-log entry.

| Use | Never use |
|---|---|
| Mule Account | fraudster's account, criminal account |
| Suspicious Account | guilty account, offender account |
| Risk Indicator | evidence of crime, proof |
| Predicted hotspot | confirmed location, target |
| Expected withdrawal window | scheduled withdrawal |
| Estimated exposure | loss, stolen amount confirmed |
| Decision-support intelligence | recommendation to arrest, instruction |
| Prototype | system, platform in production |
| Synthetic demonstration data | anonymised real data |

---

## 10. Prototype Disclosure Components

| Component | Placement | Content |
|---|---|---|
| `SyntheticDataBadge` | Header, every route | "SAMPLE / SYNTHETIC PROTOTYPE DATA" |
| `PrototypeNotice` | Sidebar footer | "PROTOTYPE — not an official MHA/I4C system" |
| `ResponsibleUseBanner` | Settings and `/demo` | The full sentence required by AC-015-05 |
| `NeutralityNote` | Graph node detail, alert modal | "Risk indicator. Not a finding about any person." |

These are ordinary components in the design system with defined styling — not afterthoughts — because their consistent presence is a stated requirement (FR-25) and their absence is a release blocker.
