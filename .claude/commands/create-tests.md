# /create-tests

## Purpose
Write tests for existing code that lacks them, at the correct layer, in the documented format.

## Inputs
- Module, feature or requirement ID
- Optionally, the layer

## Required reading
1. `test-cases/test-case-template.md` → the required structure
2. `TESTING_STRATEGY.md` §3 → which layer owns which behaviour
3. `engineering/unit-testing.md`, `integration-testing.md` or `e2e-testing.md`
4. `.claude/rules/testing.md`

## Execution
1. Identify the layer. A behaviour is owned by exactly one — do not duplicate across layers.
2. Enumerate the cases before writing any: happy path, boundaries at their exact edges, invalid input, missing input, unauthorised, forbidden, service failure, database failure, timeout, duplicate request, concurrency where relevant, recovery.
3. Add the two project-specific categories where they apply: displayed-value provenance, persisted-value equality.
4. Write each case with a behavioural name that reads as a sentence.
5. Use named fixtures; never mutate `C-10284`.
6. Assign a test-case ID from the convention and add it to the right catalogue.
7. Update `implementation/phase-test-matrix.md`.

## Validation
- [ ] Correct layer; no duplication
- [ ] Boundaries at exact edges, not midpoints
- [ ] Negative cases present, including absence assertions where relevant
- [ ] No sleeps, no unseeded randomness, no real clock
- [ ] Names describe behaviour
- [ ] IDs assigned and catalogued
- [ ] Coverage gate for the area still met

## Test requirements
Each case must fail if the behaviour it describes is broken. Verify by deliberately breaking the behaviour once and observing the failure — a test that passes against broken code is not a test.

## Expected output
Tests written and passing, catalogue updated, matrix updated, coverage at or above the gate.
