# PROMPT — UI Generator

Generates a UI surface specification or implementation consistent with the design system.

---

```text
Build [SURFACE NAME] for CyberPulse AI.

Read first: ux/wireframes.md (the layout — its figures are PLACEHOLDERS and must
never appear in code), ux/design-system.md (tokens, components, formatting),
ux/ui-guidelines.md (non-negotiables and copy rules), .claude/rules/frontend.md.

Produce, in this order:
1. Loading state — skeleton matching the final layout's shape and row count
2. Empty state — distinguishing "no data exists" from "no data matches"
3. Error state — retryable, retaining prior data where still valid
4. Degraded state — capability named, NO numbers rendered
5. Success state — rendering only fields present in the API response
6. Accessible table equivalent, if the surface is canvas-based

Rules:
- Server Component unless interactivity, a browser API or a client-only library
  requires otherwise; state the reason in a comment.
- Any status uses colour AND text AND icon. Use RiskBadge; it has no colour prop.
- Formatting: paise → ₹3,80,000 · score → 91.7% · UTC → IST · absent → em dash.
- Copy is direct and calm. No exclamation marks, no emoji, no apologies.
- Fixed strings exactly as specified; terminology lexicon is binding.
- Heavy libraries dynamically imported.
- Queried in tests by accessible role and name.
```

---

## Checks before accepting

- [ ] No hard-coded score, hotspot name or percentage
- [ ] All four states present
- [ ] Colour + text + icon for status
- [ ] Keyboard reachable; focus visible; focus returns on overlay close
- [ ] Live region if the change is not visually obvious
- [ ] Within the route's bundle budget
- [ ] axe clean at critical and serious
