# TESTING STRATEGY — CyberPulse AI

| Field | Value |
|---|---|
| Version | 1.0 |
| Scope | What is tested, why, at which layer, and what constitutes enough |
| Companion | `engineering/testing-strategy.md` states **how** an engineer writes and runs tests day to day |
| Related | `MASTER_TEST_PLAN.md`, `test-cases/`, `implementation/phase-test-matrix.md` |

---

## 1. Testing Philosophy

Most systems' worst failure is a crash. This one's worst failure is **a confident, plausible, wrong number on an officer's screen** — a prediction the model never produced, a stale value, a placeholder that survived a refactor. A crash announces itself; a fabricated figure does not, and it is exactly the thing a user would act on.

The strategy therefore inverts the usual emphasis. Ordinary correctness testing is present and conventional. On top of it sits a category most projects do not have at all:

> **Integrity testing** — proving that every value displayed, persisted or dispatched originated from the model, for that request, at that time.

Four principles follow.

1. **Test the contract, not the implementation.** The shared schema in `packages/shared` is the contract; tests assert against it on both sides of the wire.
2. **Prove absence, not just presence.** The degraded-mode test asserts that *no number of any relevant shape* appears — not that specific wrong numbers are missing.
3. **Every failure path is a tested path.** The failure table in `architecture/system-design.md` §5 has no blank cells, and every row names its test.
4. **A gate that can be skipped is not a gate.** `signal_check`, `pii_scan`, `no_hardcode_check` and the metric gates accept no bypass flag in CI.

---

## 2. Test Pyramid, As Weighted Here

```
            ╱ E2E  ~35 ╲                 critical journeys, real stack
          ╱──────────────╲
        ╱ Integration ~90  ╲             API + real DB + ML contract
      ╱──────────────────────╲
    ╱   Unit  ~200             ╲         logic, features, formatting, schemas
  ╱──────────────────────────────╲
╱  Static: types · lint · scans    ╲     contract generation, hard-code scan
```

| Layer | Count | Speed | Owns |
|---|:--:|---|---|
| Static | — | seconds | Type errors, forbidden imports, hard-coded values, prohibited phrases |
| Unit | ~200 | ~40 s | Pure logic, the 13 features, formatting, schema refinements |
| Integration | ~90 | ~2 min | Route → service → **real** database, ML contract, transactions |
| E2E | ~35 | ~4 min | Whole-chain journeys in a real browser |
| Specialist | ~60 | ~4 min | Security (29), accessibility (15), performance (16) |

Two bands are heavier than convention suggests, for reasons specific to this product:

**ML unit tests (42).** A wrong feature value produces a plausible prediction that no downstream test can detect. `test_no_nan_when_every_input_is_absent` exists because XGBoost treats NaN as a legitimate missing-value signal and routes it down a default branch — the output looks entirely normal.

**Integrity tests (TC-INT-*, TC-FAB-*, 24 cases).** These have no equivalent in a typical project and are the ones that matter most here.

---

## 3. What Each Layer Owns

| Concern | Static | Unit | Integration | E2E |
|---|:--:|:--:|:--:|:--:|
| Type and contract correctness | ● | ○ | ○ | |
| Forbidden layer imports | ● | | | |
| Hard-coded model values | ● | | | ● |
| Feature engineering | | ● | | |
| Threshold and formatting logic | | ● | | |
| Schema refinements | | ● | ● | |
| Authorisation matrix | | | ● | ○ |
| Database constraints | | | ● | |
| Transaction atomicity | | | ● | |
| ML contract and malformed responses | | | ● | |
| Whole-chain journeys | | | | ● |
| Degraded-mode behaviour | | | ● | ● |
| Accessibility | | ○ | | ● |
| Performance budgets | | | ○ | ● |

● primary owner · ○ secondary

The rule that keeps this stable: **a behaviour is owned by exactly one layer.** Duplicating the authorisation matrix in E2E as well as integration would double the runtime and halve the diagnostic value of a failure.

---

## 4. Testing by Type

### 4.1 Unit — Vitest, pytest
Pure functions only. Boundaries over midpoints: every threshold tested at its exact edge, every formatter at the lakh boundary where Indian digit grouping changes, every bin index at 0 and 11. Detail: `engineering/unit-testing.md`.

### 4.2 Integration — Vitest + a real PostgreSQL
**The database is never mocked.** Seven correctness properties live in Postgres constraints — the ≤ 4-hour window `CHECK`, one-investigation-per-complaint, non-empty recipients, `thresholdHigh > thresholdMedium`, non-empty note bodies, foreign keys, transactional atomicity. A mocked ORM asserts that a method was called; it cannot assert that Postgres would have accepted the write. Detail: `engineering/integration-testing.md`.

### 4.3 API — through route handlers
Validation, authorisation, status codes, error envelopes, rate limits. Every endpoint is driven into every error branch (TC-SEC-004). Catalogue: `test-cases/api-tests.md`.

### 4.4 Component — RTL
Queried by accessible role and name, so a component that is hard to test this way is usually also inaccessible. Behaviour, never implementation.

### 4.5 E2E — Playwright
Only what needs the whole stack. Assertions compare rendered values against the **intercepted API response**, not against expected constants — which makes every journey test simultaneously a fabrication test.

### 4.6 Regression
A tiered suite (`test-cases/regression-tests.md`): a 12-case smoke tier for every deployment, a critical tier per phase exit, and the full suite before release.

### 4.7 Security — 29 cases
Every threat in `security/threat-model.md` maps to at least one case. Includes the two negative-space tests: no personal-data column exists anywhere in the schema (TC-SEC-022), and no node payload has a name field (TC-SEC-021). Catalogue: `security/security-test-cases.md`.

### 4.8 Performance — k6, Lighthouse, Playwright timing, pytest-benchmark
Budgets in `architecture/performance-architecture.md` §1. Measured against the **preview environment**, never locally — local is faster than production in all three dimensions that matter, so a local measurement flatters every number.

### 4.9 Accessibility — axe-core plus manual
Automated scanning catches roughly a third of real barriers; the manual keyboard and NVDA passes catch the rest. Greyscale determinability is automated (TC-A11Y-003) because colour-only risk encoding would be an intelligence failure, not a cosmetic one.

### 4.10 AI — 42 cases
Feature determinism, threshold boundaries, ranking reproducibility including ties, SHAP exactness and stability, and the two evaluation-integrity tests: the model must beat a logistic baseline by a reported margin (TC-ML-070), and a shuffled-label retrain must collapse to chance (TC-ML-071). Catalogue: `ai/ai-test-cases.md`.

### 4.11 Manual QA
Reserved for what automation cannot judge: screen-reader announcement quality, first-run comprehension by someone unfamiliar with the project (TC-UX-023), and the timed narrated demonstration rehearsal.

---

## 5. Integrity Testing — the category that is specific to this product

Twelve cases in `ai/hallucination-testing.md` plus twelve `TC-INT-*` cases. The technique worth highlighting:

```ts
// Intercept and rewrite the response, then assert the UI follows it
await page.route('**/api/predict', r => r.fulfill({ body: JSON.stringify({ ...valid, riskScore: 0.312 }) }));
await expect(page.getByTestId('risk-score')).toHaveText('31.2%');
```

A hard-coded value passes a constant-based assertion and fails this one. No amount of code review is as reliable.

Six independent controls, because a single one is eventually bypassed by a well-intentioned shortcut: the hard-code scan, response-equals-persisted-row, no prediction caching, no optimistic UI, numberless degraded mode, and metrics read from the database.

---

## 6. Test Data

One deterministic corpus, seed `26184`, identical in local, preview and production. Named fixtures:

| Fixture | Purpose |
|---|---|
| `C-10284` | The demo complaint. **Read-only in every test** — mutating it breaks the evaluation runbook. |
| `C-10283` | Already analysed; existing-prediction path |
| `C-10281` | No linked transactions; default-value path |
| `C-10279` | True cash-out cell outside the candidate set; exercises the recall ceiling |
| Cyclic chain | Traversal visited-set guard |

`C-10279` exists so the recall ceiling is measured rather than assumed — the evaluation deliberately retains such complaints as all-negative groups so top-k hit rate is not inflated by excluding the cases the engine cannot solve.

---

## 7. Coverage

| Area | Gate | Why |
|---|---|---|
| `app/engine/features.py` | ≥ 95% | Wrong features are silently wrong |
| `services/lib/**` | ≥ 95% | Pure logic with real consequences |
| `services/**` | ≥ 85% | NFR-16 |
| `packages/shared` | ≥ 90% | The contract |
| Route handlers | ≥ 80% | Thin by design |
| Components | ≥ 60% | Behaviour covered by E2E |
| Overall | ≥ 75% | |

Coverage is a floor, not a target. Review reads the assertions, not the percentage — a module at 95% asserting nothing is worse than one at 70% with sharp tests.

---

## 8. CI Gates

```
lint → typecheck → unit → migrations → integration → security scan
  → build (bundle budgets) → preview → E2E ∥ a11y ∥ performance → deploy → smoke
```

| Destination | Required |
|---|---|
| PR merge | All gates, one approving review |
| Preview | Gates 1–7 |
| Production | All, plus phase exit criteria and a green post-deploy smoke |
| Finale hotfix | Lint, typecheck, unit, targeted E2E — full suite immediately after |

---

## 9. Automation Classification

| Class | Count | Examples |
|---|:--:|---|
| Automated | ~390 | All unit, integration, API, E2E, security, performance, most accessibility |
| Manual | 6 | NVDA announcements, first-run comprehension, timed narrated rehearsal, ML-not-publicly-reachable, restore drill, local-fallback drill |
| Hybrid | 4 | Accessibility (automated scan + manual pass), demo timing (automated + narrated) |

Automation is prioritised for the critical path, authorisation, data integrity, core APIs, regression and security — the categories where a regression is both likely and expensive.

---

## 10. Definition of Tested

A change is tested when it has: the happy path; at least one boundary and one invalid input; a case for every failure branch it introduces; a case per role for any new authorisation decision; a case asserting any new displayed value comes from the API response; and a case asserting any new persisted value matches the response.

The last two are specific to this product, most often skipped, and protect the failure mode that would matter most in front of an evaluator.

---

## 11. What Testing Cannot Establish

Stated because a strategy claiming complete coverage is not credible.

| Cannot establish | Why | Where addressed honestly |
|---|---|---|
| Real-world model accuracy | Synthetic labels only | `ai/evaluation-framework.md` §8 |
| Geographic bias | Generator geography is a design choice | `security/security-checklist.md` G-7 |
| Adversarial adaptation | Behaviour would change if the system were known | `ai/evaluation-framework.md` §8 |
| Operational value | Depends on response capacity beyond the model | `ai/evaluation-framework.md` §8 |
| Unknown vulnerabilities | No penetration test | `security/security-checklist.md` G-8 |

The distinction that matters: this suite guarantees **integrity**, not **accuracy**. A system with perfect integrity and a poor model is honest and of limited use. A system with a good model and poor integrity is dangerous, because nobody can tell which numbers came from it. Integrity has to hold first.
