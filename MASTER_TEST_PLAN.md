# MASTER TEST PLAN — CyberPulse AI

| Field | Value |
|---|---|
| Version | 1.0 |
| Status | Baseline |
| Scope | All testing across all eight phases |
| Related | `TESTING_STRATEGY.md`, `test-cases/`, `implementation/phase-test-matrix.md` |

---

# 1. Objectives

| # | Objective | Measured by |
|---|---|---|
| O-1 | Every Must requirement is verified | 100% of Must requirements trace to ≥ 1 passing test case |
| O-2 | No displayed value can originate outside the model | All 24 integrity cases pass |
| O-3 | Every failure path behaves as specified | Every row of `architecture/system-design.md` §5 has a passing test |
| O-4 | Authorisation holds for every role and capability | 66/66 matrix cases pass |
| O-5 | The model clears its published gates | `evaluate.py` exits 0 |
| O-6 | Core flows meet WCAG 2.1 AA | Zero critical/serious axe violations on eight routes |
| O-7 | Performance budgets are met | All p95 budgets within limit on the preview environment |
| O-8 | The demonstration completes inside its window | Two narrated rehearsals ≤ 180 s |

---

# 2. Scope

## 2.1 In scope

All sixteen features, all 132 requirements, all eight phases; functional, integration, API, UI, E2E, security, performance, accessibility, AI/model and regression testing; failure injection and recovery drills.

## 2.2 Out of scope, with reasons

| Out of scope | Reason |
|---|---|
| Penetration testing | Hackathon scope; declared gap G-8 |
| Load beyond 20 concurrent users | Beyond the designed envelope (`architecture/scalability.md` §1) |
| Browsers other than Chrome and Edge | NFR-18 |
| Viewports below 1280 px | CR-05 |
| Real-data accuracy validation | No real labels exist (`ai/evaluation-framework.md` §8) |
| Bias and differential-impact testing | Untestable on synthetic data; declared gap G-7 |
| Localisation | Single locale |

Two of these — G-7 and real-data accuracy — are not conveniences. They are the limits of what a synthetic prototype can establish, and they are stated identically here, in the evaluation framework and in the security checklist.

---

# 3. Test Environments

| Environment | Used for | Database | ML service |
|---|---|---|---|
| Local | Unit, component, integration during development | Postgres container | Local container |
| CI runner | Unit, integration, migrations, static scans | Service container | Contract stub |
| Preview (per PR) | E2E, accessibility, performance | Neon branch | Preview container |
| Production | Smoke, demonstration rehearsal | Neon primary | Production container |

**Performance is measured on preview only.** Local is faster than production in compute, network and cold start, so a local measurement flatters every budget.

---

# 4. Test Data

Single deterministic corpus, seed `26184`, identical in every environment. Volumes: 500 complaints, 12,000 accounts, 60,000 transactions, 2,400 withdrawals, 520 ATMs.

| Fixture | Role in testing | Rule |
|---|---|---|
| `C-10284` | Demo complaint, UPI Fraud, ₹3,80,000, Noida | **Read-only in every test** |
| `C-10283` | Has an existing prediction | Re-analysis path |
| `C-10281` | No linked transactions | Default-value path |
| `C-10279` | True cell outside the candidate set | Recall-ceiling path |
| `ACC-88123390` | Mule account in multiple chains | Graph degree |
| Cyclic chain | A → B → C → A | Traversal guard |

Test-created records carry `origin = 'DEMO'` so cleanup is scoped and can never touch seed data.

---

# 5. Test Types, Ownership and Counts

| Type | Cases | Owner | Automation | Catalogue |
|---|:--:|---|---|---|
| Unit (TS) | 96 | Feature engineer | Automated | `test-cases/unit-tests.md` |
| Unit (Python / AI) | 42 | ML engineer | Automated | `ai/ai-test-cases.md` |
| Integration | 58 | Backend engineer | Automated | `test-cases/integration-tests.md` |
| API | 48 | Backend engineer | Automated | `test-cases/api-tests.md` |
| Frontend / component | 34 | Frontend engineer | Automated | `test-cases/frontend-tests.md` |
| E2E | 35 | QA | Automated | `test-cases/e2e-tests.md` |
| UX | 23 | UX lead | Automated + 3 manual | `ux/ux-test-cases.md` |
| Security | 29 | Security engineer | Automated + 1 manual | `security/security-test-cases.md` |
| Performance | 16 | DevOps | Automated | `test-cases/performance-tests.md` |
| Accessibility | 15 | UX lead | Automated + 2 manual | `test-cases/accessibility-tests.md` |
| Integrity / fabrication | 24 | QA | Automated | `ai/hallucination-testing.md` |
| Data pipeline | 9 | ML engineer | Automated | `test-cases/unit-tests.md` |
| Regression | Tiered | QA | Automated | `test-cases/regression-tests.md` |
| **Total distinct cases** | **~400** | | **~390 automated** | |

---

# 6. Master Traceability Matrix

Requirement → Feature → Story → Acceptance criteria → Test case → Phase.

| Requirement | Feature | Story | AC | Test cases | Phase |
|---|---|---|---|---|:--:|
| FR-01 … FR-01.9 | FEAT-16 | US-001 … US-004 | AC-016-01 … 06 | TC-DATA-001 … 009, TC-SEC-020, TC-ML-001 | P2 |
| FR-02 … FR-02.5 | FEAT-01 | US-010 … US-012 | AC-001-01 … 05 | TC-API-001 … 005, TC-UI-001, TC-UI-002, TC-SEC-013 | P3 |
| FR-03 … FR-03.6 | FEAT-02 | US-013 … US-015 | AC-002-01 … 06 | TC-UI-003 … 006, TC-API-006, TC-API-007, TC-E2E-001, TC-E2E-002 | P3 |
| FR-04 … FR-04.3 | FEAT-03 | US-020, US-021 | AC-003-01 … 03 | TC-API-008 … 011, TC-PERF-005 | P4 |
| FR-05 … FR-05.7 | FEAT-04 | US-022 … US-024 | AC-004-01 … 06 | TC-UI-007 … 012, TC-API-010, TC-PERF-004, TC-SEC-021 | P4 |
| FR-06 … FR-06.5 | FEAT-05 | US-030 | AC-005-01 … 03 | TC-UNIT-010 … 015 | P3 |
| FR-07 … FR-07.5 | FEAT-06 | US-031, US-032 | AC-006-01 … 04 | TC-ML-010 … 015, TC-PERF-006 | P3 |
| FR-08 … FR-08.6 | FEAT-07 | US-033 | AC-007-01 … 03 | TC-ML-020 … 026, TC-INT-010 | P3 |
| FR-09 … FR-09.4 | FEAT-08 | US-034 | AC-008-01 … 03 | TC-ML-030 … 034, TC-UI-013 | P3 |
| FR-10 … FR-10.6 | FEAT-09 | US-035, US-036 | AC-009-01 … 05 | TC-ML-040 … 046, TC-API-020, TC-E2E-013 | P3 |
| FR-11 … FR-11.3 | FEAT-10 | US-040 | AC-010-01 … 02 | TC-UI-030 … 033, TC-UI-036 | P4 |
| FR-12 … FR-12.4 | FEAT-10 | US-041 … US-043 | AC-010-03 … 06 | TC-UI-034, TC-UI-035, TC-A11Y-010, TC-PERF-003, TC-E2E-010 | P4/P5 |
| FR-13 … FR-13.3 | FEAT-11 | US-050, US-051 | AC-011-01 … 03 | TC-UI-040 … 042, TC-API-030, TC-UNIT-020 | P5 |
| FR-14 … FR-14.5 | FEAT-11 | US-052 … US-055 | AC-011-04 … 08 | TC-API-031, TC-API-032, TC-E2E-011, TC-SEC-030, TC-SEC-031, TC-UNIT-021 | P5 |
| FR-15 … FR-15.6 | FEAT-12 | US-060 … US-064 | AC-012-01 … 06 | TC-API-040 … 045, TC-UI-050, TC-E2E-012, TC-SEC-032 | P5 |
| FR-16 … FR-16.2 | FEAT-13 | US-070, US-071 | AC-013-01 … 02 | TC-API-050, TC-UI-060, TC-A11Y-020 | P6 |
| FR-17 … FR-17.2 | FEAT-13 | US-072 | AC-013-03 … 04 | TC-API-051, TC-UI-061, TC-INT-011, TC-FAB-007 | P6 |
| FR-18 … FR-18.3 | FEAT-14 | US-081, US-082 | AC-014-03 … 04 | TC-E2E-020, TC-E2E-021, TC-API-060, TC-PERF-007 | P7 |
| FR-19 … FR-19.3 | FEAT-14 | US-080, US-083 | AC-014-01, 02, 05 | TC-UI-070, TC-E2E-022, TC-E2E-023, TC-INT-012, TC-FAB-008 | P7 |
| FR-20 … FR-20.2 | FEAT-15 | US-090 | AC-015-01 … 02 | TC-SEC-010 … 012, TC-UI-080 | P3 |
| FR-21 | FEAT-15 | US-054 | AC-011-07 | TC-SEC-030, TC-SEC-032, TC-SEC-033 | P5 |
| FR-22 … FR-22.1 | FEAT-15 | US-091, US-092 | AC-015-03 … 05 | TC-API-070, TC-UI-081 | P6 |
| FR-23 | FEAT-15 | US-093 | AC-015-06 | TC-API-080 | P2 |
| FR-24 … FR-24.1 | FEAT-03 | US-025 | AC-003-04 | TC-API-012, TC-API-013, TC-UI-020 | P4 |
| FR-25 | FEAT-15 | US-092 | AC-015-04 … 05 | TC-UI-082, TC-UX-011 | P3 |
| NFR-01, NFR-19 | cross | — | — | TC-PERF-001, TC-PERF-011 | P6 |
| NFR-02 | cross | — | — | TC-PERF-002, TC-ML-064 | P6 |
| NFR-03 … NFR-05 | cross | — | — | TC-PERF-003, TC-PERF-004, TC-PERF-010 | P6 |
| NFR-06, NFR-07, NFR-21, NFR-22 | cross | US-032 | AC-006-04 | TC-E2E-030, TC-INT-020 … 022, TC-UX-006 | P3/P6 |
| NFR-08 … NFR-09, AR-01 … AR-06 | cross | US-043 | AC-010-06 | TC-A11Y-001 … 011, TC-A11Y-020 | P6 |
| NFR-10 … NFR-13, NFR-23 … NFR-25 | cross | US-090 | — | TC-SEC-001 … 006, TC-SEC-031, TC-SEC-040 | P6 |
| NFR-14 | FEAT-16 | US-001 | AC-016-02 | TC-DATA-002 | P2 |
| NFR-15, NFR-26 | cross | — | AC-GLOBAL-01 | TC-INT-010 … 013, TC-FAB-001 … 012 | all |
| NFR-16 | cross | — | — | TC-UNIT-040 | P6 |
| NFR-17 | cross | — | — | TC-DOC-001 | P2 |
| NFR-18 | cross | — | — | TC-E2E-040 | P6 |
| NFR-27, NFR-28 | cross | — | — | TC-UNIT-030, TC-UNIT-031 | P3 |
| NFR-29, NFR-30 | cross | — | — | TC-INT-030, TC-INT-031 | P6 |
| CR-01 … CR-04 | cross | US-004 | AC-GLOBAL-02 … 03 | TC-SEC-020 … 022, TC-UX-012, TC-UX-013 | P6 |
| CR-05 | cross | — | — | TC-UX-019 | P6 |
| CR-06 | cross | — | — | TC-DOC-001, DR drill | P7 |

**Coverage result:** 132 requirements, 132 with at least one test case. Zero orphan requirements, zero orphan test cases. Verified in `implementation/documentation-audit.md`.

---

# 7. Entry and Exit Criteria

## Entry — testing may begin for a phase when

- The phase's deliverables are code-complete and merged to a branch.
- Dependencies from prior phases have exited.
- The test environment is provisioned and seeded.
- Phase test cases are written and reviewed.

## Exit — a phase is complete when

- All phase acceptance criteria pass.
- All phase test cases pass.
- All Critical and High cases pass, including regression.
- Zero unresolved Critical or High defects.
- Security tests for the phase pass.
- Performance checks for the phase pass.
- Documentation reflects the implemented state.

A phase does not exit on a Medium or Low defect, provided it is recorded with an owner.

---

# 8. Severity and Priority

## Severity — how bad is it

| Severity | Definition | Examples |
|---|---|---|
| **Critical** | Fabricated or wrong intelligence; data loss; authorisation bypass; the demonstration cannot run | A displayed value disagrees with the API; BANK creates an investigation; an alert dispatches unaudited |
| **High** | A core journey is blocked; a security control is ineffective; a metric gate fails | Prediction fails for all complaints; rate limit not enforced; top-3 hit rate below gate |
| **Medium** | A feature is degraded but usable; a non-core flow is broken | Chart empty state missing; map does not cluster; filter chip count wrong |
| **Low** | Cosmetic; documentation; a minor inconsistency | Spacing off scale; typo; tooltip wording |

## Priority — how soon

| Priority | Fix by |
|---|---|
| P0 | Immediately; stop other work |
| P1 | Before the current phase exits |
| P2 | Before release |
| P3 | Backlog |

**Any defect in the fabrication class is Critical/P0 regardless of how small it looks.** A single hard-coded percentage in one component is a P0, because the class of failure — not the instance — is what matters.

---

# 9. Defect Lifecycle

```
New → Triaged (severity + priority + owner) → In progress
    → Fixed (with a test that fails without the fix)
    → Verified (by someone other than the fixer)
    → Closed
                    ↘ Deferred (Medium/Low only, with an owner and a date)
                    ↘ Rejected (with a reason recorded)
```

Rules: a fix without a reproducing test is not a fix; verification is never done by the person who fixed it; a Critical or High defect can never be deferred; a rejected defect records why, so the same report is not re-raised.

---

# 10. Regression Strategy

Three tiers, sized to how often they run.

| Tier | Cases | When | Duration |
|---|:--:|---|---|
| **Smoke** | 12 | Every deployment, hourly in production | ~90 s |
| **Critical** | 68 | Every phase exit, every release candidate | ~6 min |
| **Full** | ~400 | Before release; nightly on `main` | ~18 min |

A defect fix adds its reproducing test to the Critical tier if the defect was Critical or High. The suite therefore grows in the direction of the failures actually experienced, rather than by guesswork.

---

# 11. Test Execution Schedule

| Phase | Focus | New cases | Cumulative |
|:--:|---|:--:|:--:|
| P1 | Documentation audit, contract validation, traceability | 12 | 12 |
| P2 | Data pipeline, migrations, health, CI | 38 | 50 |
| P3 | Features, models, SHAP, complaints, roles, integrity | 148 | 198 |
| P4 | Transactions, graph, map, performance of both | 62 | 260 |
| P5 | Alerts, investigations, audit, atomicity | 54 | 314 |
| P6 | Reports, settings, full security / performance / accessibility suites | 58 | 372 |
| P7 | Demo mode, deployment, recovery drills | 20 | 392 |
| P8 | Smoke, rehearsal, comprehension | 8 | 400 |

Phase 3 carries 37% of all cases because it delivers the vertical slice — features, models, explanation, and the complaint workflow that presents them. That concentration is intentional and matches the phase-ordering decision in ADR-014.

---

# 12. Risks to the Test Plan

| Risk | Mitigation |
|---|---|
| Model gates fail late, invalidating downstream work | `signal_check` gates before training in P2; metric gates gate P3 exit |
| E2E flakiness erodes trust in the suite | One retry, retry-passes reported as flakes, three flakes in a week quarantines a test |
| Performance measured locally and flattered | Budgets measured on preview only |
| Integrity tests skipped under deadline pressure | They run in the static and CI gates, which have no skip flag |
| Manual cases deferred indefinitely | Six manual cases, each with a named owner and a phase |
| Test data drift between environments | Same seed, checksum-verified on seed |

---

# 13. Deliverables

| Deliverable | Produced by |
|---|---|
| Test case catalogues (11 files) | `test-cases/` |
| Phase test matrix | `implementation/phase-test-matrix.md` |
| CI test reports | Every run |
| Coverage report | Every run |
| Playwright HTML report with traces | Every E2E run |
| k6 and Lighthouse reports | Every performance run |
| axe-core violation report | Every accessibility run |
| `model_metrics` row + `model_card.json` | Every training run |
| Documentation audit | `implementation/documentation-audit.md` |
