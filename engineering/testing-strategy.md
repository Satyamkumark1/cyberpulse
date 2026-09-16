# ENGINEERING TESTING STRATEGY — CyberPulse AI

| Field | Value |
|---|---|
| Version | 1.0 |
| Relationship to `TESTING_STRATEGY.md` | The root document states **what** is tested and why. This one states **how** an engineer writes and runs tests day to day. |
| Related | `engineering/unit-testing.md`, `engineering/integration-testing.md`, `engineering/e2e-testing.md` |

---

## 1. Working Rules

1. **Tests ship with the code.** A PR adding behaviour without a test is incomplete, not "to be followed up".
2. **Write the failing test first for a defect.** A fix without a reproducing test is a fix that regresses.
3. **One behaviour per test.** A test asserting five things reports one failure for five causes.
4. **No sleeping.** Wait on a condition, never on a duration. `waitFor`, not `setTimeout`.
5. **No shared mutable state between tests.** Each test seeds and tears down what it needs.
6. **Determinism is mandatory.** No unseeded randomness, no real clock, no network in unit or integration tests.
7. **A flaky test is a broken test.** It is quarantined the day it flakes and fixed or deleted within the phase.

Rule 7 matters more than it sounds. A suite with three tolerated flakes trains the team to re-run on red, and after that the suite stops being a gate.

---

## 2. The Pyramid, As Applied Here

```
        ╱ E2E (Playwright) ╲            ~35 cases   critical journeys only
      ╱─────────────────────╲
    ╱  Integration            ╲         ~90 cases   API + DB + ML contract
  ╱─────────────────────────────╲
╱   Unit (Vitest + pytest)        ╲     ~200 cases  logic, features, formatting
```

The shape is conventional; the weighting is not. This project puts unusual mass into two bands most projects under-invest in:

| Band | Why heavier here |
|---|---|
| **ML unit tests** (42 cases) | A wrong feature value produces a confident, plausible, wrong prediction — undetectable from the output |
| **Contract/integrity tests** (TC-INT-*, TC-FAB-*) | The worst failure is a screen showing a number the model never produced |

---

## 3. Tooling

| Layer | Tool | Command |
|---|---|---|
| TS unit + component | Vitest + React Testing Library | `pnpm test:unit` |
| Python unit | pytest | `pytest apps/ml-service/tests -m unit` |
| API / integration | Vitest + real Postgres (testcontainer or Neon branch) | `pnpm test:int` |
| ML contract | pytest + httpx | `pytest -m contract` |
| E2E | Playwright | `pnpm test:e2e` |
| Accessibility | axe-core via Playwright | `pnpm test:a11y` |
| Performance | k6 + Lighthouse CI | `pnpm test:perf` |
| Coverage | Vitest v8 / pytest-cov | `pnpm test:cov` |
| Everything | | `make verify` |

---

## 4. What Gets Mocked, and What Never Does

| Dependency | Unit | Integration | E2E |
|---|---|---|---|
| Database | Mocked | **Real** | **Real** |
| ML service | Mocked | **Real or contract-stubbed** | **Real** |
| Clock | Fixed | Fixed | Real |
| Randomness | Seeded | Seeded | Seeded corpus |
| Map tiles | N/A | N/A | Stubbed (offline determinism) |

**Never mocked at the integration layer: the database.** An ORM mock tests the mock. Every constraint this system relies on for correctness — the window-width `CHECK`, the unique complaint-to-investigation constraint, the recipients array length, the `origin` filter on demo reset — lives in Postgres, and a mock cannot enforce any of them.

---

## 5. Test Data

One deterministic corpus, seed `26184`, shared by every layer and every environment. Integration tests seed a known subset in a transaction and roll back; E2E runs against the full seeded corpus on an isolated Neon branch.

Named fixtures used throughout:

| Fixture | Purpose |
|---|---|
| `C-10284` | The demo complaint — UPI Fraud, ₹3,80,000, Noida. Never mutated by a test. |
| `C-10283` | Analysed complaint with an existing prediction |
| `C-10281` | Complaint with no linked transactions — default-path coverage |
| `C-10279` | Complaint whose true cash-out cell is outside the candidate set |
| `ACC-88123390` | Mule account appearing in multiple chains |
| Cyclic chain fixture | Exercises the traversal visited-set guard |

`C-10279` exists specifically so the recall ceiling is exercised rather than assumed, and `C-10284` is protected because a test that mutates the demo complaint breaks the evaluation-day runbook.

---

## 6. Coverage

| Area | Gate | Reason |
|---|---|---|
| `app/engine/features.py` | ≥ 95% | Wrong features are silently wrong |
| `services/lib/**` (exposure, severity, scope) | ≥ 95% | Pure logic with real consequences |
| `services/**` | ≥ 85% | NFR-16 |
| `packages/shared` | ≥ 90% | The contract |
| Route handlers | ≥ 80% | Thin by design |
| Components | ≥ 60% | Behaviour is covered by E2E |
| Overall | ≥ 75% | |

Coverage is a floor, not a target. A module at 95% with no assertion about behaviour is worse than one at 70% with sharp tests, and review looks at the assertions rather than the percentage.

---

## 7. Local Workflow

```bash
make verify            # everything, as CI runs it
pnpm test:unit --watch # while writing logic
pnpm test:int          # after touching a service or the schema
pnpm test:e2e --ui     # after touching a flow
pytest -m unit -q      # while touching the engine
```

Expected timings on the reference machine: unit ~25 s, integration ~90 s, E2E ~4 min, full `make verify` ~7 min. When the full suite exceeds ten minutes, it stops being run before pushing, which is the point at which the suite starts decaying.

---

## 8. Definition of Tested

A change is tested when:

- The happy path is covered.
- At least one boundary and one invalid-input case are covered.
- Every failure branch the code introduces has a case.
- Any new authorisation decision has a case per role.
- Any new displayed value has a case asserting it comes from the API response.
- Any new persisted value has a case asserting the response matches the row.

The last two are specific to this product and are the ones most often skipped. They are also the ones protecting the failure mode that would matter most in front of an evaluator.
