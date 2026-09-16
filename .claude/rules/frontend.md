# RULE — FRONTEND

Applies to `apps/web/app/**`, `apps/web/components/**`, `apps/web/hooks/**`.
Read with `ux/ui-guidelines.md` and `ux/design-system.md`.

---

## Non-negotiable

1. **No value on screen that the API did not return.** No placeholder score, no example hotspot name, no illustrative percentage — not while developing, not behind a flag.
2. **Risk, status and severity carry colour AND text AND icon.** `RiskBadge` takes `level`; it has no `color` prop, which is what makes this structural.
3. **Four states or it is incomplete:** loading, empty, error, degraded. Use `StatePanel`; do not invent a variant.
4. **Degraded renders no numbers.** No percentage, no currency, no time range.
5. **Never blank the page for a partial failure.** Error boundaries wrap map, graph, prediction panel and each chart.
6. **Prototype badge and disclaimer on every route.**

---

## Server vs client

Server Component by default. `'use client'` needs a one-line comment naming the reason: interactivity, browser API, or client-only library.

| Client-only | Reason |
|---|---|
| Prediction panel | Mutation with in-flight state |
| Map, graph, charts | WebGL / canvas / client library — all dynamically imported |
| Modals, drawers, toasts | Interaction |

Tables, detail pages and lists are server-rendered. Their rows never enter the JS bundle.

---

## Data

- Server Components call services directly. Client Components go through route handlers via TanStack Query.
- **Never** import `@cyberpulse/db` or `services/mlClient` from a component. ESLint blocks it.
- No `useEffect` for fetching.
- No `useState` for anything derivable from props or the URL. Filter state lives in the query string.
- Never cache a prediction.
- Never recompute a displayed figure — render what the response contains. Formatting only: percentage rounding, currency, UTC→IST.

---

## Formatting

Money `₹3,80,000` (Indian grouping, no decimals, from integer paise) · score `91.7%` in UI, `0.917` in metrics · timestamps `14 Sep 2026, 09:12` IST · windows `14:00 – 16:00 IST` · IDs full and monospace · distances `220 m` / `1.4 km` · absent values `—`, never `0`.

---

## Accessibility

- Query by accessible role and name in tests; if that is hard, the component is probably inaccessible.
- Persistent visible labels; placeholders are hints.
- Focus ring 2 px `sih-blue-600`, 2 px offset. `outline: none` without a replacement is an ESLint error.
- Focus trapped in overlays; `Esc` closes; focus returns to the trigger.
- Live regions announce prediction completion, failure and alert dispatch.
- Map and graph ship accessible table equivalents with the **same data**, not a summary.
- Everything works under `prefers-reduced-motion: reduce`.

---

## Performance

- Map, graph and charts dynamically imported. Never in the initial dashboard bundle.
- Route bundle budgets are CI gates.
- Skeletons match final layout shape and row count — this prevents layout shift, so it is a performance rule as much as a visual one.
- Virtualise above 100 rows.
- No images beyond the wordmark. No stock photography.

---

## Copy

Direct and calm. No exclamation marks, no emoji, no first-person plural, no apologies. Fixed strings exactly as specified in `CLAUDE.md`. Terminology lexicon is binding.

Write "Prediction service unavailable. Retry." — not "Oops! Something went wrong".

---

## Before you finish

- [ ] No hard-coded model value
- [ ] Colour + text + icon for any status
- [ ] Four states implemented
- [ ] Keyboard reachable, focus visible, focus returns
- [ ] Live region where the change is not visually obvious
- [ ] Formatting per §Formatting
- [ ] Server Component unless documented otherwise
- [ ] Within the route's bundle budget
- [ ] axe clean at critical and serious
