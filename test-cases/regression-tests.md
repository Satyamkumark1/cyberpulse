# REGRESSION TEST CASES — CyberPulse AI

| Field | Value |
|---|---|
| Version | 1.0 |
| Structure | Three tiers, sized to how often each runs |
| Related | `MASTER_TEST_PLAN.md` §10, `implementation/phase-test-matrix.md` |

---

## 1. Tiers

| Tier | Cases | Runtime | When |
|---|:--:|---|---|
| **Smoke** | 12 | ~90 s | Every deployment; hourly against production |
| **Critical** | 68 | ~6 min | Every phase exit; every release candidate |
| **Full** | ~400 | ~18 min | Before release; nightly on `main` |

A suite that takes too long stops being run before pushing, and a suite nobody runs is not a gate. Tiering is what keeps the fast path fast.

---

## 2. Smoke Tier — 12 cases

The minimum set that proves the deployment is alive and honest. Read-only apart from one scoped demo reset.

| # | Case | Asserts |
|---|---|---|
| S-01 | `GET /api/health` | 200; all three components `up`; expected model version |
| S-02 | `/dashboard` renders | Four KPI cards, map canvas, hotspot rail, no error boundary |
| S-03 | `/complaints` renders | 25 rows; pagination metadata correct |
| S-04 | `/complaints/C-10284` renders | Summary, timeline, linked accounts present |
| S-05 | Prediction succeeds | 201; schema-valid; ≥ 5 factors summing to 100 ± 0.5 |
| S-06 | Displayed value equals response | Rendered percentage equals `round(riskScore × 100, 1)` |
| S-07 | `/risk-map` renders | Canvas present; three layer toggles; legend with text |
| S-08 | Money-trail graph renders | Victim, mule and ATM nodes present for `C-10284` |
| S-09 | `/alerts` and `/reports` render | No error boundary; metrics panel shows stored values or "not yet run" |
| S-10 | Prototype badge present | Exact string on every route sampled |
| S-11 | Demo reset works | Idempotent; seed counts unchanged |
| S-12 | Degraded mode is numberless | With ML stopped, no percentage, currency or time range in the prediction region |

S-06 and S-12 are in the smoke tier despite being integrity checks rather than availability checks. A deployment that is up but shows a value the model did not produce is worse than one that is down, so both are checked on every deploy.

---

## 3. Critical Tier — 68 cases

Everything at Critical severity across the catalogues, plus the High cases guarding a phase's exit criteria.

| Source | Cases |
|---|:--:|
| Integrity (`TC-INT-010 … 013`, `TC-FAB-001 … 012`) | 16 |
| Security Critical (`security/security-test-cases.md`) | 18 |
| AI Critical (`ai/ai-test-cases.md`) | 14 |
| E2E Critical (`test-cases/e2e-tests.md`) | 15 |
| UX Critical (`ux/ux-test-cases.md`) | 5 |
| **Total** | **68** |

---

## 4. Regression Triggers by Change Type

What must be re-run when a given area changes. This is the table a reviewer consults when deciding whether a PR needs more than the default suite.

| Changed | Re-run |
|---|---|
| Feature engineering | All AI cases; TC-INT-013; full model evaluation; TC-FAB-003 |
| Model artefact or hyperparameters | Full evaluation with gates; TC-ML-050, 070, 071; `CHANGELOG` `Model` entry |
| Thresholds | TC-UNIT-022, 023; TC-ML-011; TC-API-070; TC-UI-016 |
| Shared schema | Contract tests both sides; TC-ML-061; TC-INT-025; regenerate Zod and Pydantic |
| Database schema | Migrations on a clean DB; all integration; TC-SEC-022; ERD updated |
| Authorisation logic | Full 66-case matrix; TC-SEC-011, 012; TC-API-044, 050 |
| Alert or investigation logic | TC-INT-040 … 045, 050 … 055; TC-E2E-010 … 014; TC-SEC-030, 032 |
| Error handling | TC-SEC-004; TC-INT-020 … 025; TC-UX-006; TC-E2E-030, 031 |
| Map or graph component | TC-UI-030 … 036 or 007 … 012; TC-PERF-003 or 004; TC-A11Y-010 or 011 |
| Any UI copy | TC-UX-011, 012, 013 |
| Rate limits | TC-SEC-031; TC-API-104; TC-E2E-032 |
| Dependency upgrade | Full tier; bundle budgets; dependency audit |
| Deployment configuration | Smoke tier; TC-API-080; TC-SEC-041 |

---

## 5. Per-Phase Regression Requirements

Each phase re-runs the prior phases' Critical cases plus a targeted set. Full detail in each `implementation/phase-*.md`.

| Phase completing | Regression required |
|:--:|---|
| P2 | — (first implementation phase) |
| P3 | P2 data pipeline and health cases |
| P4 | P3 prediction path, integrity cases, complaint workflow |
| P5 | P3 + P4 Critical; graph and map still render with new data |
| P6 | All Critical; full security, performance and accessibility suites |
| P7 | All Critical; demo flow does not disturb the corpus (TC-E2E-024) |
| P8 | Smoke tier twice; full suite once |

---

## 6. How the Suite Grows

A defect fix adds its reproducing test to the Critical tier if the defect was Critical or High. The suite therefore accumulates in the direction of failures actually experienced rather than by speculation, which is what keeps it proportionate.

```
Defect found → severity assigned → fix written with a failing test
            → test added to the Critical tier if Critical/High
            → verified by someone other than the fixer
```

---

## 7. Flake Policy

| Rule | Detail |
|---|---|
| One retry in CI | A retry-pass is reported as a flake, never silently swallowed |
| Three flakes in a week | The test is quarantined the same day |
| Quarantined tests | Fixed or deleted within the phase — never left quarantined across a phase boundary |
| A flaky test blocking release | Treated as a failing test |

A suite with three tolerated flakes trains the team to re-run on red, and after that the suite has stopped being a gate. This policy exists to prevent that specific decay.

---

## 8. Known Regression Risks

| Risk | Why it recurs | Guard |
|---|---|---|
| A hard-coded value reintroduced during UI work | Stubbing a value is the fastest way to build a component | `no_hardcode_check.sh` in the static gate |
| A wireframe placeholder shipped | Documentation figures look correct | TC-E2E-051 scans the bundle for them |
| Train/serve skew | Someone "tidies" the symlink into a copy | TC-UNIT-014 |
| Threshold change reported as an accuracy gain | Easy to conflate | Metric-integrity rule 4; `threshold_changed` event |
| Authorisation hidden in UI instead of enforced | Hiding a button feels like a fix | 66-case matrix runs against the API directly |
| An error path that returns a default | Feels defensive | TC-FAB-005 |
| Accessibility regression from a restyle | Colour-only status creeps back | TC-A11Y-003 greyscale check |

Every row here is a mistake a competent engineer makes under deadline pressure. Each one has an automated guard because review alone does not reliably catch them.

---

## 9. Summary

| Tier | Cases | Runtime | Blocks |
|---|:--:|---|---|
| Smoke | 12 | ~90 s | Deployment |
| Critical | 68 | ~6 min | Phase exit, release candidate |
| Full | ~400 | ~18 min | Release |
