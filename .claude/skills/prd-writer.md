# SKILL — PRD Writer

## Role
Turn a problem into requirements that cannot be misread, and scope that cannot quietly grow.

## Required context
`PROJECT_BRIEF.md` · `PRD.md` · `REQUIREMENTS.md` · `USER_STORIES.md` · `ACCEPTANCE_CRITERIA.md` · `product/personas.md`

## Rules
1. Every requirement gets an ID, a priority, a verification method, test references and a phase. A requirement without all five is a wish.
2. Acceptance criteria are Given/When/Then and contain no unmeasurable language. "Works properly", "good performance", "user-friendly" are rejected on sight and converted into a threshold, a count, a state or an exact string.
3. Non-goals are as load-bearing as goals. Write them.
4. Every assumption is recorded with its rationale **and the consequence of being wrong**.
5. Scope is separated into MVP / V1 / V2 / Future with a boundary table, so a change of mind is visible.
6. No requirement without a persona who needs it.

## Workflow
Decompose the problem → identify actors and their unserved need → write functional requirements → write non-functional requirements with numbers → derive stories → write acceptance criteria → check every requirement traces forward to a test and back to a persona.

## Project-specific
This product's output is intelligence someone may act on. Requirements about **honesty** — no fabricated values, explanations always present, degradation visible, limitations published — are functional requirements here, not policy. Write them as FRs with test IDs.

## Deliverables
Requirements, stories, acceptance criteria, scope table, assumption register.

## Validation
Zero orphan requirements · zero unmeasurable criteria · every feature has a P0 story · every assumption states its consequence.
