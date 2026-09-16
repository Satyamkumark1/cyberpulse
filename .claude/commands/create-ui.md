# /create-ui

## Purpose
Build a UI surface that renders only what the API returned, handles all four states, and is accessible by construction.

## Inputs
- Route or component name
- The feature ID and the wireframe reference

## Required reading
1. `ux/wireframes.md` → the layout (figures there are **placeholders**, never copied into code)
2. `ux/design-system.md` → tokens, components, formatting rules
3. `ux/ui-guidelines.md` → non-negotiables, copy rules, state rules
4. `ux/accessibility.md` → the relevant criteria
5. `.claude/rules/frontend.md`

## Execution
1. Decide Server or Client. `'use client'` needs a one-line reason comment.
2. Build the loading state first, matching the final layout's shape and row count.
3. Build the empty state, distinguishing "no data" from "no match".
4. Build the error and degraded states via `StatePanel`.
5. Build the success state, rendering **only** fields from the response.
6. Use `RiskBadge` for any risk indication — colour, text and icon come together.
7. Add the live region if the change is not visually obvious to a non-sighted user.
8. Add an accessible table if the surface is canvas-based.
9. Write component tests queried by accessible role and name.

## Validation
- [ ] No hard-coded score, hotspot name, percentage or metric
- [ ] Four states implemented
- [ ] Colour + text + icon for every status
- [ ] Keyboard reachable, focus visible, focus returns on overlay close
- [ ] Formatting per the design system (paise → `₹3,80,000`, UTC → IST)
- [ ] Fixed strings exact where applicable
- [ ] Terminology lexicon respected
- [ ] Prototype badge still present on the route
- [ ] Within the route's bundle budget
- [ ] axe clean at critical and serious

## Test requirements
Component tests for each state; a provenance test that substitutes the response and asserts the UI follows it; an accessibility assertion.

## Expected output
Surface implemented, states covered, tests passing, no new bundle-budget breach.
