# PHASE 6 — REPORTING, QA, SECURITY & PERFORMANCE

| Field | Value |
|---|---|
| Duration | 12 person-days · Week 3 day 7 – finale preparation |
| Output | The completed surface, then everything hardened against its gates |
| Entry | Phase 5 exited — the critical path completes end to end |
| Features | FEAT-13, remainder of FEAT-15 |

---

## 1. Objectives

1. Complete the product surface: reports, model-metrics publication, settings.
2. Run every test catalogue to completion and close the coverage gates.
3. Execute the full security suite and reconcile the declared-gap lists.
4. Measure every performance budget on the preview environment.
5. Complete the accessibility passes, automated and manual.
6. Reach a state where the only work remaining is deployment and rehearsal.

---

## 2. Deliverables

| Deliverable | Acceptance |
|---|---|
| `/reports` with six Recharts visualisations | Rendered from API data; each with an accessible table |
| Server-side report filters | Date, city, state, fraud type; 365-day cap |
| PROTOTYPE MODEL EVALUATION panel | Reads `model_metrics`; "not yet run" when empty |
| `/settings` | Modes read-only; thresholds ADMIN-editable; health panel |
| Threshold configuration | Display-only effect; stored scores unchanged |
| Complete test suites | ~400 cases across eleven catalogues |
| Coverage at gates | features ≥ 95%, services ≥ 85%, overall ≥ 75% |
| Full security suite | 29 cases passing |
| Performance report | All budgets measured on preview |
| Accessibility report | Zero critical/serious on eight routes; both manual passes done |
| Reconciled gap lists | Identical in three documents |
| Defect burn-down | Zero Critical, zero High |

---

## 3. Implementation Tasks

| # | Task | Owner | Days |
|---|---|---|---|
| T-6.1 | `reportService.summary` — six aggregate queries | Backend | 1.25 |
| T-6.2 | Report filters, server-side, with the range cap | Backend | 0.5 |
| T-6.3 | `reportService.metrics` reading `model_metrics` | Backend | 0.25 |
| T-6.4 | Six chart components, dynamically imported | Frontend | 1.75 |
| T-6.5 | Accessible table per chart | Frontend | 0.75 |
| T-6.6 | Metrics panel with the fixed heading and caption | Frontend | 0.5 |
| T-6.7 | Settings page: modes, thresholds, notifications, health | Frontend | 1.0 |
| T-6.8 | Threshold write with the database `CHECK` and audit | Backend | 0.5 |
| T-6.9 | Complete remaining unit and component cases | All | 1.5 |
| T-6.10 | Complete integration and API catalogues | Backend | 1.0 |
| T-6.11 | Complete E2E catalogue | QA | 1.25 |
| T-6.12 | Run and close the 29 security cases | Security | 1.0 |
| T-6.13 | k6 and Lighthouse runs against preview; tune to budget | DevOps | 1.0 |
| T-6.14 | axe runs plus the two manual accessibility passes | UX | 1.0 |
| T-6.15 | Reconcile declared gaps across three documents | Security | 0.25 |
| T-6.16 | Defect burn-down | All | 1.5 |

---

## 4. Dependencies

**Inbound:** P5 alerts and investigations (reports aggregate over them); P3 `model_metrics`.
**Outbound:** P7 deployment sign-off requires this phase's security and performance gates.

**Internal order:** reports and settings first (days 1–4), then the suites (days 5–9), then burn-down (days 10–12). Hardening before the surface is complete would mean hardening twice.

---

## 5. Risks

| Risk | Probability | Impact | Mitigation |
|---|---|---|---|
| Performance budget missed late | Medium | High | Budgets enforced in CI since P3; this phase confirms rather than discovers |
| Accessibility debt accumulated | Medium | High | Accessible tables delivered in P4; axe in CI since P2 |
| Security findings requiring redesign | Low | **Critical** | Threat model in P1; controls built in with each phase |
| Report aggregates too slow | Medium | Medium | Indexed, memoised 5 minutes, range-capped |
| Defect count exceeds the burn-down window | Medium | High | 1.5 days reserved; scope cut from P7 polish, never from exit criteria |
| Metrics hard-coded to look better | Low | **Critical** | TC-INT-011 and TC-FAB-007 read from the database |

---

## 6. Acceptance Criteria

**AC-P6-01** — Six charts render from API data with no literal series in any component (AC-013-01).
**AC-P6-02** — Filters apply server-side; all charts update; empty results render per-chart empty states (AC-013-02).
**AC-P6-03** — Metrics display to three decimals matching the stored row (AC-013-03).
**AC-P6-04** — The heading is exactly "PROTOTYPE MODEL EVALUATION" with the synthetic-data caption (AC-013-04).
**AC-P6-05** — An empty `model_metrics` renders "Model evaluation not yet run", never zeros.
**AC-P6-06** — Settings shows System Mode, Data Mode and model version read-only (AC-015-04).
**AC-P6-07** — Threshold changes affect display only; stored scores unchanged; `high <= medium` rejected by validation **and** by the database (AC-015-03).
**AC-P6-08** — All ~400 test cases execute; all Critical and High pass.
**AC-P6-09** — Coverage gates met in every area.
**AC-P6-10** — All 29 security cases pass.
**AC-P6-11** — Every performance budget met on the preview environment.
**AC-P6-12** — Zero critical or serious axe violations on eight routes; both manual passes signed off.
**AC-P6-13** — Declared-gap lists identical across `architecture/security-architecture.md` §10, `security/compliance.md` §6 and `security/security-checklist.md` §4.
**AC-P6-14** — Zero unresolved Critical or High defects.

---

## 7. Test Strategy

This phase runs everything. Its distinguishing work is **completeness** — the catalogues finish here — and **honest measurement**: performance on preview rather than locally, accessibility including the manual passes that automation cannot replace, and security including the negative-space checks that prove absences.

---

## 8. Phase 6 Test Cases

### Reports and settings
TC-API-060 six series · TC-API-061 range cap · TC-API-062 metrics availability · TC-API-070 settings ADMIN-only and validated · TC-UI-060 charts from API data · TC-UI-061 metrics framing · TC-UI-081 settings read-only modes · TC-INT-011 metrics from the database · TC-INT-082 threshold constraint at the database · TC-INT-083 settings write audited · TC-FAB-007 metrics reflect the database · TC-A11Y-020 chart table equivalence

### Full security suite
All 29 cases in `security/security-test-cases.md`, with particular attention to TC-SEC-004 (every endpoint driven into every error branch), TC-SEC-011 (66-case matrix), TC-SEC-022 (schema introspection) and TC-SEC-042 (demo reset scoping).

### Full performance suite
TC-PERF-001 … 022, all measured on preview. Bundle budgets per route. Stage breakdown against the documented profile.

### Full accessibility suite
TC-A11Y-001 … 016, including the two manual passes: keyboard-only critical path and NVDA live-region announcements.

### Integrity suite
TC-FAB-001 … 012 and TC-INT-010 … 013 in full.

### Cross-cutting
TC-UX-011 fixed strings · TC-UX-012 prohibited claims · TC-UX-013 terminology · TC-UX-019 1280 px reflow · TC-E2E-030 no unhandled errors · TC-E2E-031 independent degradation · TC-E2E-040 Edge parity · TC-INT-030, TC-INT-031 layering · TC-UNIT-040 coverage gates

**Total: 58 new + full execution of all prior catalogues.**

---

## 9. Regression Tests

The **full** suite runs in this phase — every case from P2 through P5, not a subset. This is the only phase where that is true before release.

| From | Scope |
|---|---|
| P2 | All 23 cases |
| P3 | All 74 cases |
| P4 | All 32 cases |
| P5 | All 40 cases |
| P1 | TC-DOC-010 … 021 re-run against the final documentation |

Any requirement, contract or schema that changed during P3–P6 triggers a re-run of the P1 documentation checks — which is how the documentation stays true rather than becoming a historical artefact.

---

## 10. Security Validation

The complete suite. The checks that matter most in this phase:

| Check | Case | Why here |
|---|---|---|
| Every endpoint driven into every error branch | TC-SEC-004 | Only possible once every endpoint exists |
| Full 66-case authorisation matrix | TC-SEC-011 | Only complete once every capability exists |
| Zero personal-data columns | TC-SEC-022 | Final schema |
| No secret in the production bundle | TC-SEC-003 | Final build |
| Security headers on the deployed origin | TC-SEC-041 | Requires a deployment |
| Dependency audit clean | TC-SEC-040 | Final dependency set |
| Declared gaps identical in three documents | TC-DOC-018 | Documents are final |
| Demo reset cannot touch seed data | TC-SEC-042 | Before P7 relies on it |

---

## 11. Performance Validation

Every budget, measured on preview:

| Budget | Target | Case |
|---|---|---|
| Read API p95 | ≤ 300 ms | TC-PERF-001 |
| List query p95 | ≤ 150 ms | TC-PERF-011 |
| Prediction p95 warm | ≤ 1500 ms | TC-PERF-002 |
| ML inference p95 | ≤ 400 ms | TC-PERF-006 |
| Dashboard LCP | ≤ 2500 ms | TC-PERF-010 |
| Map interactive | ≤ 1500 ms | TC-PERF-003 |
| Graph at 200 nodes | ≤ 800 ms | TC-PERF-004 |
| Traversal depth 4 | ≤ 300 ms | TC-PERF-005 |
| ML memory | ≤ 512 MB | TC-PERF-012 |
| Bundles per route | Per budget | TC-PERF-014 |
| 20 concurrent users | p95 held, 0 errors | TC-PERF-020 |
| 20 concurrent predictions | p95 held, 0 fabrications | TC-PERF-021 |
| 15-minute sustained load | < 20% drift | TC-PERF-022 |

A breach is waived only by a decision-log entry stating a new budget and its justification.

---

## 12. Exit Criteria

- [ ] AC-P6-01 … AC-P6-14 pass
- [ ] All ~400 test cases executed; all Critical and High pass
- [ ] Coverage gates met in every area
- [ ] All 29 security cases pass
- [ ] Every performance budget met on preview
- [ ] Zero critical/serious axe violations; both manual passes signed off
- [ ] Declared gaps reconciled across three documents
- [ ] Zero unresolved Critical or High defects
- [ ] P1 documentation checks re-run against the final state
- [ ] `CHANGELOG.md` complete

### The demonstrable gate

Every catalogue has been run, not sampled. Every budget has been measured, not estimated. Every declared gap says the same thing in all three places it appears. The product is finished; what remains is making it presentable and proving it survives the venue.
