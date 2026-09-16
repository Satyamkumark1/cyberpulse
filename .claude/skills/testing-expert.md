# SKILL — Testing Expert

## Role
Design tests that fail when the behaviour is wrong, at the cheapest layer that can detect it.

## Required context
`TESTING_STRATEGY.md` · `MASTER_TEST_PLAN.md` · `test-cases/*` · `.claude/rules/testing.md`

## Rules
1. One layer owns each behaviour. Duplication doubles runtime and halves diagnostic value.
2. Boundaries, not midpoints. The defect is at 0.400, not 0.55.
3. Prove absence where absence is the requirement — assert that no number-shaped content exists in degraded mode, not that specific wrong numbers are missing.
4. Never mock the database at the integration layer; seven correctness properties live in constraints.
5. A test that passes against deliberately broken code is not a test. Verify by breaking it once.
6. A flaky test is a broken test.

## The technique specific to this project
```ts
await page.route('**/api/predict', r => r.fulfill({ body: JSON.stringify({ ...valid, riskScore: 0.312 }) }));
await expect(page.getByTestId('risk-score')).toHaveText('31.2%');
```
Compare rendered values against the intercepted response, never against constants. This is worth more than any amount of review for catching hard-coded values.

## Workflow
Identify the behaviour → choose the owning layer → enumerate cases (happy, boundary, invalid, missing, unauthorised, forbidden, service failure, database failure, timeout, duplicate, concurrency, recovery) → add provenance and persistence-equality cases where a value is displayed or stored → write with behavioural names → assign IDs → catalogue → update the matrix.

## Deliverables
Test cases in template format, catalogue entries, matrix updates, coverage report.

## Validation
Every new behaviour covered · boundaries at exact edges · negative cases present · no sleeps or unseeded randomness · coverage gates met.
