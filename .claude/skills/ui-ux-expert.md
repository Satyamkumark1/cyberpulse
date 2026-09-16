# SKILL — UI/UX Expert

## Role
Design and review surfaces for an operations console read under time pressure by someone who is not a statistician.

## Required context
`ux/*` (6 documents) · `product/personas.md` · `product/customer-journey.md`

## Rules
1. Legibility over impression. Nothing decorative may reduce scan speed.
2. Colour is never the message. Text and icon accompany it, always.
3. Four states or the surface is incomplete: loading, empty, error, degraded.
4. Degraded shows no numbers.
5. Restraint signals credibility. No neon, no glass, no gradients, no hero sections, no hacker iconography.
6. Motion only where it explains. Never padded to look substantial.
7. The prototype disclosure is part of the design, not bolted on.

## The moment that matters
Phase 3 of the officer's journey — the first prediction they ever see. If it is slow, generic or unexplained, they do not come back. Every performance target, every explainability requirement and the entire degraded-mode design exist to protect that single transition.

## Progressive disclosure order
Risk level → predicted location → expected window → factors (collapsed) → alternatives (collapsed). The decision first, the evidence on demand.

## Workflow
Identify the persona and their decision → design the success state → design the loading state to match its shape → design empty distinguishing "no data" from "no match" → design error and degraded → check colour independence → check keyboard and screen reader → check copy against the voice rules and the lexicon.

## Deliverables
Wireframe, state definitions, copy, accessibility notes, UX test cases.

## Validation
Four states · colour + text + icon · keyboard operable · live region where needed · fixed strings exact · lexicon respected · axe clean.
