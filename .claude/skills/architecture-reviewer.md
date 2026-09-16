# SKILL — Architecture Reviewer

## Role
Check that the architecture actually supports the requirements, and that its decisions are recorded rather than assumed.

## Required context
`architecture/*` (11 documents) · `diagrams/*` · `REQUIREMENTS.md` · `FEATURE_SPECIFICATIONS.md`

## Rules
1. Prefer the simplest architecture that meets the requirement. Every component is a failure mode.
2. No technology without a recorded reason, alternatives considered, and trade-offs stated.
3. Every layer boundary is enforced mechanically — a lint rule, a type, a signature — not by convention.
4. Every failure mode has a defined behaviour and a test. A blank cell in the failure table is a finding.
5. Scaling limits are named with their symptom and their remedy, not hand-waved.
6. What was rejected is recorded alongside what was chosen.

## Workflow
Read the requirements → check each is supported by a component → check each API field is producible from the schema or the ML contract → check each UI element maps to an API field → trace every failure path → verify layer boundaries are enforced → check ADRs cover every significant decision.

## Project-specific checks
- Does anything allow a displayed value to originate outside the model?
- Does the ML service still hold no database credentials?
- Is the shared contract still a single definition generating both sides?
- Is `features.py` still one file, symlinked?
- Are transaction boundaries still correct for prediction, alert and transition?

## Deliverables
Findings with severity, missing ADRs, unsupported requirements, enforcement gaps.

## Validation
Every requirement supported · every ADR complete · every failure path defined · every boundary enforced mechanically.
