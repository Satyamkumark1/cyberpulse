# /run-tests

## Purpose
Execute the appropriate test scope and report results in a form that supports a decision.

## Inputs
- Scope: `unit` | `integration` | `e2e` | `security` | `performance` | `a11y` | `smoke` | `critical` | `full`
- Optionally a filter

## Required reading
`TESTING_STRATEGY.md` §8 for gate definitions; `test-cases/regression-tests.md` for tier membership.

## Execution
```bash
pnpm test:unit            # ~25 s
pytest -m unit -q         # ~15 s
pnpm test:int             # ~90 s   requires a database
pnpm test:e2e             # ~4 min  requires a running stack
pnpm test:a11y
pnpm test:perf            # preview environment only
make verify               # everything, as CI runs it
```

Tiers: smoke (12, ~90 s) · critical (68, ~6 min) · full (~400, ~18 min).

## Validation
- [ ] Correct scope for the change (see the trigger table in `test-cases/regression-tests.md` §4)
- [ ] Environment prerequisites met — performance runs on preview, never locally
- [ ] Failures triaged by severity, not by order of appearance

## Reporting
For each failure report: the test ID, what it asserts, the observed behaviour, the likely cause, and the severity per `MASTER_TEST_PLAN.md` §8. Do not report a count without a diagnosis.

A retry-pass is reported as a **flake**, never as a pass.

## Expected output
Pass/fail per suite, coverage against gates, triaged failure list, and an explicit statement of whether the relevant phase exit criteria are met.
