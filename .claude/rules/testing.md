# RULE — TESTING

Read with `TESTING_STRATEGY.md` and `engineering/testing-strategy.md`.

---

## Working rules

1. **Tests ship with the code.** Not after.
2. **A defect fix starts with a failing test.** Otherwise it regresses.
3. **One behaviour per test.** Five assertions report one failure for five causes.
4. **No sleeping.** Wait on a condition, never a duration.
5. **No unseeded randomness, no real clock, no network** in unit or integration tests.
6. **A flaky test is a broken test** — quarantined the day it flakes, fixed or deleted within the phase.

---

## Layer ownership

A behaviour is owned by exactly one layer. Duplicating the authorisation matrix in E2E as well as integration doubles runtime and halves diagnostic value.

| Layer | Owns |
|---|---|
| Static | Types, forbidden imports, hard-coded values, prohibited phrases |
| Unit | Pure logic, the 13 features, formatting, schema refinements |
| Integration | Route → service → **real database**, ML contract, transactions |
| E2E | Whole-chain journeys in a browser |

---

## Never mock the database at the integration layer

Seven correctness properties live in Postgres constraints. An ORM mock asserts a method was called; it cannot assert Postgres would have accepted the write.

---

## Boundaries, not midpoints

Test the exact edge: `0.400` and `0.700` for thresholds, `99999`/`100000` paise for Indian digit grouping, bins 0 and 11, depth 1/4/6/7, `pageSize` 1/100/101, exactly 5 factors, exactly 200 graph nodes.

---

## Prove absence, not just presence

The degraded-mode test asserts that **no number of any relevant shape** appears:

```ts
expect(panel).not.toMatch(/\d+(\.\d+)?%/);
expect(panel).not.toMatch(/\d+(\.\d+)?\s*\/\s*100/);   // risk score format (DEC-017)
expect(panel).not.toMatch(/₹[\d,]+/);
expect(panel).not.toMatch(/\d{2}:\d{2}\s*[–-]\s*\d{2}:\d{2}/);
```

Asserting that specific wrong numbers are absent would miss a placeholder nobody anticipated.

---

## Integrity testing — this project's signature technique

```ts
await page.route('**/api/predict', r => r.fulfill({ body: JSON.stringify({ ...valid, riskScore: 0.312 }) }));
await expect(page.getByTestId('risk-score')).toHaveText('31.2 / 100');
```

Compare rendered values against the **intercepted response**, never against expected constants. A hard-coded value passes a constant-based assertion and fails this one.

Required for: any new displayed value, and any new persisted value (response must equal the row).

---

## Test data

Seed `26184` everywhere. `C-10284` is **read-only in every test** — mutating it breaks the evaluation runbook. Test-created records carry `origin = 'DEMO'`.

| Fixture | For |
|---|---|
| `C-10283` | Existing-prediction path |
| `C-10281` | No transactions; defaults path |
| `C-10279` | True cell outside candidates; recall ceiling |
| Cyclic chain | Traversal visited-set guard |

---

## Naming

```ts
it('returns 404 when the complaint is out of scope for BANK', ...)
```

Not `it('works')`. When it breaks in CI six weeks later, the name is the diagnosis.

---

## Coverage

`features.py` ≥ 95% · `services/lib/**` ≥ 95% · `services/**` ≥ 85% · `packages/shared` ≥ 90% · handlers ≥ 80% · components ≥ 60% · overall ≥ 75%.

A floor, not a target. Review reads the assertions.

---

## Before you finish

- [ ] Happy path
- [ ] One boundary, one invalid input
- [ ] Every new failure branch
- [ ] Every role for a new authorisation decision
- [ ] A case asserting a new displayed value comes from the response
- [ ] A case asserting a new persisted value equals the response
- [ ] No sleeps, no unseeded randomness, no real clock
