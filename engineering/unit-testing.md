# UNIT TESTING — CyberPulse AI

| Field | Value |
|---|---|
| Version | 1.0 |
| Tools | Vitest + React Testing Library (TS) · pytest (Python) |
| Scope | Pure logic, feature engineering, formatting, schema validation, component behaviour |
| Related | `test-cases/unit-tests.md` |

---

## 1. What Belongs in a Unit Test

A unit test here covers a function whose behaviour is fully determined by its arguments. If the function needs a database, an HTTP call or a clock, it is an integration test.

| Covered | Not covered |
|---|---|
| Feature vector construction | Assembling inputs from the database |
| Risk-level threshold mapping | Whether the model produces a sensible score |
| Exposure and severity derivation | Whether the alert persists |
| Currency, date and score formatting | Whether the page renders |
| Zod schema acceptance and rejection | Whether the API returns 400 |
| State-machine transition validity | Whether the transition is audited |
| Component rendering given props | Whether the data reached the component |

---

## 2. Structure

```ts
describe('toRiskLevel', () => {
  const thresholds = { high: 0.70, medium: 0.40 };

  it('maps a score at the HIGH boundary inclusively', () => {
    // Arrange / Act
    const level = toRiskLevel(0.70, thresholds);
    // Assert
    expect(level).toBe('HIGH');
  });

  it.each([
    [0.000, 'LOW'], [0.399, 'LOW'], [0.400, 'MEDIUM'],
    [0.699, 'MEDIUM'], [0.700, 'HIGH'], [1.000, 'HIGH'],
  ])('maps %f to %s', (score, expected) => {
    expect(toRiskLevel(score, thresholds)).toBe(expected);
  });
});
```

Names read as sentences about behaviour. `it('works')` fails review; when it breaks in CI six weeks later nobody can tell what was lost.

---

## 3. Boundaries Are Where the Defects Are

Every numeric or bounded function is tested at its edges, not in its middle.

| Function | Boundary cases |
|---|---|
| `toRiskLevel` | Exactly 0.40, exactly 0.70, 0.0, 1.0 |
| `formatPaise` | 0, 1, 99, 100, 99999, 10000000 (Indian grouping changes) |
| `windowFromBins` | Bin 0, bin 11, midnight crossing, two bins within 0.05, uniform distribution |
| `collapseSmallFactors` | Exactly 5 factors, 4 factors, one factor at 98% |
| Pagination | page 1, page = totalPages, page = totalPages + 1, pageSize 1, 100, 101 |
| Traversal depth | 1, 4, 6, 7 |

`formatPaise` at 99999 and 100000 matters because Indian digit grouping changes at the lakh boundary — `₹99,999` then `₹1,00,000`. A naive `toLocaleString` with the wrong locale passes the first and fails the second.

---

## 4. Feature Engineering Tests

The highest-value unit tests in the project, because a wrong feature produces a confident, plausible, wrong prediction that no downstream test would catch.

```python
def test_distance_km_matches_reference_implementation():
    vec = build_vector(complaint_at(28.5800, 77.3300), [], [], cell_at(28.5700, 77.3200))
    expected = haversine_reference(28.58, 77.33, 28.57, 77.32)
    assert abs(vec[FEATURE_ORDER.index("distance_km")] - expected) < 0.001   # < 1 metre

def test_no_nan_when_every_input_is_absent():
    vec = build_vector(bare_complaint(), [], [], empty_cell())
    assert not np.isnan(vec).any()
    assert vec[FEATURE_ORDER.index("withdrawal_count")] == 0.0
    assert vec[FEATURE_ORDER.index("atm_density")] == 0.0

def test_vector_is_deterministic_across_100_builds():
    vectors = [build_vector(*FIXTURE) for _ in range(100)]
    assert all(np.array_equal(v, vectors[0]) for v in vectors)
```

The NaN test is not defensive padding. XGBoost accepts NaN as a legitimate "missing" signal and routes it down a default branch, producing a score that looks entirely normal. Asserting absence is the only way to catch a feature that silently stopped computing.

---

## 5. Schema Tests

The shared contract is tested as code, including its refinements.

```ts
describe('PredictionResponseSchema', () => {
  it('rejects a factor list whose contributions do not sum to 100', () => {
    const bad = { ...validPrediction, factors: fiveFactorsSummingTo(140) };
    expect(PredictionResponseSchema.safeParse(bad).success).toBe(false);
  });

  it('rejects a raw feature identifier as a factor name', () => {
    const bad = { ...validPrediction, factors: [{ name: 'txn_velocity_1h', contribution: 100, direction: 'INCREASES' }] };
    expect(PredictionResponseSchema.safeParse(bad).success).toBe(false);
  });

  it('accepts an unavailable explanation with an empty factor list', () => {
    const ok = { ...validPrediction, explanationAvailable: false, factors: [] };
    expect(PredictionResponseSchema.safeParse(ok).success).toBe(true);
  });
});
```

The third case is the one worth writing carefully: the refinement must permit honest failure while forbidding a silently incomplete explanation.

---

## 6. Component Tests

Test what a user perceives, not what React did.

```tsx
it('conveys risk without relying on colour', () => {
  render(<RiskBadge level="HIGH" score={0.917} showScore />);
  expect(screen.getByText('HIGH')).toBeInTheDocument();          // text
  expect(screen.getByTestId('risk-icon-high')).toBeInTheDocument(); // icon
  expect(screen.getByText('91.7%')).toBeInTheDocument();
});

it('disables send until a recipient is selected and says why', async () => {
  render(<AlertModal prediction={fixture} />);
  expect(screen.getByRole('button', { name: /send alert/i })).toBeDisabled();
  expect(screen.getByText('Select at least one recipient')).toBeInTheDocument();
  await userEvent.click(screen.getByRole('checkbox', { name: /LEA/i }));
  expect(screen.getByRole('button', { name: /send alert/i })).toBeEnabled();
});
```

Queries use accessible roles and names, so a component that is untestable this way is usually also inaccessible — the test discipline and AR-03 reinforce each other.

---

## 7. Anti-Patterns

| Anti-pattern | Why it fails | Instead |
|---|---|---|
| Asserting on implementation details | Breaks on every refactor | Assert on behaviour |
| `expect(fn).toHaveBeenCalled()` as the only assertion | Proves a call, not a result | Assert the outcome |
| Snapshot tests of large trees | Nobody reviews a 400-line diff | Targeted assertions |
| Mocking the function under test | Tests the mock | Mock only true boundaries |
| `setTimeout` in a test | Flake | `waitFor` on a condition |
| `Math.random()` or `new Date()` unfixed | Non-deterministic | Inject a seed or a fixed clock |
| One test, ten assertions | One failure, ten causes | Split |

---

## 8. Running

```bash
pnpm test:unit                 # all TS unit tests
pnpm test:unit --watch         # while writing
pnpm test:unit RiskBadge       # filtered
pytest -m unit -q              # Python
pytest -m unit --cov=app/engine --cov-report=term-missing
```

CI runs unit tests first because they are the fastest signal: roughly 25 seconds for the TS suite and 15 for Python. A failure here stops the pipeline before anything expensive runs.
