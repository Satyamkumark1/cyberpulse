# PHASE 7 — DEMO MODE, DEPLOYMENT & PRODUCTION READINESS

| Field | Value |
|---|---|
| Duration | 8 person-days · Finale, hours 0–14 |
| Output | `/demo`, a live deployment, observability, and four rehearsed recovery drills |
| Entry | Phase 6 exited — all gates green |
| Features | FEAT-14 |

> **Deployment happens in Phase 6, not here.** This phase *verifies* an already-live deployment and builds the narrative layer on top of it. A first deployment attempted during a finale is a first deployment that fails.

---

## 1. Objectives

1. Build the guided `/demo` route and the one-click dashboard scenario — both using the production prediction path.
2. Verify the production deployment end to end, including model version.
3. Complete observability: health polling, dashboards, alert thresholds.
4. Rehearse all four recovery drills until each meets its RTO.
5. Produce the printed one-page runbook.

---

## 2. Deliverables

| Deliverable | Acceptance |
|---|---|
| `/demo` route | Six linear steps, standalone shell, step indicator |
| Pre-warm on mount | Health request fires before step 1 |
| Progress ticks | Driven by `pipelineStages[]`, not a timer |
| "RUN DEMO SCENARIO" control | On the dashboard; one real prediction call |
| `POST /api/demo/reset` | Scoped to `origin = 'DEMO'`, idempotent, ADMIN |
| Degraded demo path | Explicit notice, no fabricated values |
| Verified production deployment | Smoke green; model version matches |
| Keep-warm scheduled job | Every 15 minutes |
| Health uptime probe | Every 60 seconds |
| Dashboards | Operational, product, model |
| Alert thresholds | Configured per `devops/observability.md` §6 |
| Four rehearsed drills | Cold start, local fallback, rollback, rebuild-from-seed |
| `docs/demo-script.md` | The narrated script, timed |
| One-page runbook | Printed |

---

## 3. Implementation Tasks

| # | Task | Owner | Days |
|---|---|---|---|
| T-7.1 | `/demo` shell, step indicator, navigation | Frontend | 1.0 |
| T-7.2 | Six step components reusing production hooks | Frontend | 1.25 |
| T-7.3 | Pre-warm on mount | Frontend | 0.25 |
| T-7.4 | Progress ticks bound to `pipelineStages[]` | Frontend | 0.5 |
| T-7.5 | Dashboard scenario control | Frontend | 0.5 |
| T-7.6 | `POST /api/demo/reset` scoped and idempotent | Backend | 0.5 |
| T-7.7 | Reset confirmation naming exact counts | Frontend | 0.25 |
| T-7.8 | Degraded demo path | Frontend | 0.5 |
| T-7.9 | Production deployment verification and model-version check | DevOps | 0.5 |
| T-7.10 | Keep-warm job and uptime probe | DevOps | 0.5 |
| T-7.11 | Three dashboards | DevOps | 0.75 |
| T-7.12 | Alert thresholds | DevOps | 0.25 |
| T-7.13 | Four recovery drills, timed | DevOps + QA | 1.0 |
| T-7.14 | `docs/demo-script.md` | PM | 0.5 |
| T-7.15 | One-page runbook, printed | DevOps | 0.25 |

---

## 4. Dependencies

**Inbound:** every prior phase. `/demo` composes the whole product, so it cannot precede it.
**Outbound:** P8 rehearses what this phase builds.

---

## 5. Risks

| Risk | Probability | Impact | Mitigation |
|---|---|---|---|
| **Demo mode tempts a scripted shortcut** | **High** | **Critical** | TC-INT-012 asserts no demo-only prediction path exists; TC-FAB-008 substitutes the response and asserts the UI follows it |
| Cold start during evaluation | High | Critical | Keep-warm, uptime probe, pre-warm, T−30 rehearsal, local fallback |
| Reset destroys seed data | Low | Critical | `origin = 'DEMO'` filter; TC-SEC-042 records counts for all sixteen tables |
| Progress animation padded to look substantial | Medium | Medium | Ticks bound to real stage durations; TC-ML-062 asserts they sum to `inferenceMs` ± 10% |
| Deployment issues discovered here | Low | High | Deployment completed in P6; this phase verifies |
| Drills rehearsed only once | Medium | High | Each drill has a pass condition and a named owner |

The first row is rated High probability because the pressure is real: a scripted demo always works. The guard is that the demo consumes the same hook as the complaint detail page, and a test substitutes the API response to prove it.

---

## 6. Acceptance Criteria

**AC-P7-01** — `/demo` presents exactly six steps in order with a visible indicator (AC-014-03).
**AC-P7-02** — A warm-up request fires on mount before step 1 (FR-18.3).
**AC-P7-03** — Step 3 issues exactly one real `POST /api/predict`; no demo-only prediction path exists (AC-014-02).
**AC-P7-04** — Progress ticks reflect `pipelineStages[]`; no artificial delay is added.
**AC-P7-05** — The scenario completes within 15 s on the target machine (AC-014-01).
**AC-P7-06** — Reset clears only `origin = 'DEMO'` rows; seed counts unchanged; idempotent (AC-014-04).
**AC-P7-07** — The confirmation names exact counts to be cleared.
**AC-P7-08** — With ML stopped, a notice containing "prediction service unavailable" renders and no score, ranking or window appears (AC-014-05).
**AC-P7-09** — Production health reports all three components up; the model version matches the expected string.
**AC-P7-10** — The keep-warm job runs every 15 minutes; the uptime probe every 60 seconds.
**AC-P7-11** — All four drills meet their RTO: cold start < 30 s, local fallback < 2 min, rollback < 1 min, rebuild < 10 min.
**AC-P7-12** — `docs/demo-script.md` exists and has been walked once.
**AC-P7-13** — The one-page runbook is printed and carried.

---

## 7. Test Strategy

Two concerns. **Demo integrity** — the demonstration must use the real system, and must fail honestly when the system cannot answer. **Operational readiness** — every recovery path must have been executed, not merely documented.

---

## 8. Phase 7 Test Cases

### Demo integrity
TC-E2E-020 six-step flow · TC-E2E-021 reset restores a known state · TC-E2E-022 one-click scenario, one real call, ≤ 15 s · TC-E2E-023 degraded demo is honest · TC-E2E-024 demo does not disturb the corpus · TC-INT-012 no demo-only prediction path · TC-FAB-008 demo follows a substituted response · TC-UI-070 scenario control behaviour · TC-API-090 reset scoping · TC-SEC-042 reset cannot delete seed data · TC-UX-009 confirmation names the consequence

### Deployment verification
TC-P7-01 production health green · TC-P7-02 deployed model version matches the image tag · TC-P7-03 smoke tier green against production · TC-SEC-041 security headers on the deployed origin · TC-SEC-017 ML service not publicly reachable *(manual)* · TC-PERF-007 cold-start behaviour

### Recovery drills
TC-P7-04 cold-start recovery — degraded panel, no fabricated values, recovery < 30 s
TC-P7-05 local fallback — `docker compose up -d` to a running demonstration < 2 min
TC-P7-06 web rollback — previous deployment live < 1 min
TC-P7-07 rebuild from seed — working system < 10 min, both gates enforced during recovery

### Observability
TC-P7-08 health polling keeps the service warm · TC-P7-09 alert thresholds fire on an injected condition · TC-P7-10 dashboards show live data

**Total: 24 cases.**

---

## 9. Regression Tests

| From | Re-run | Why |
|---|---|---|
| All | Critical tier (68 cases) | Nothing in the product changed, but the deployment did |
| P5 | TC-E2E-010 … 014 | Alert flow works in production, not only in preview |
| P3 | TC-E2E-001, TC-E2E-050 | Prediction path works in production |
| P6 | TC-PERF-002, TC-PERF-003, TC-PERF-010 | Production timings differ from preview |
| P2 | TC-DATA-002 | Corpus unchanged after demo runs and resets |

TC-DATA-002 after a demo run is the check that catches a reset or a demo path that quietly mutated the corpus.

---

## 10. Security Validation

| Check | Case |
|---|---|
| Reset scoped to demo origin; ADMIN-only | TC-SEC-042, TC-API-090 |
| Security headers present on the deployed origin | TC-SEC-041 |
| ML service unreachable from the public internet | TC-SEC-017 *(manual)* |
| Model artefact read-only; version matches the image | TC-SEC-019 |
| No secret in the production bundle | TC-SEC-003 |
| Prototype badge and disclaimer on `/demo` | TC-UX-011 |
| Declared gaps unchanged by deployment | Checklist §3 |

---

## 11. Performance Validation

| Check | Target | Case |
|---|---|---|
| Demo scenario end to end | ≤ 15 s | TC-E2E-022 |
| Cold start to first prediction | ≤ 30 s with visible progress | TC-PERF-007 |
| Production prediction p95 warm | ≤ 1500 ms | TC-PERF-002 |
| Production dashboard LCP | ≤ 2500 ms | TC-PERF-010 |
| Keep-warm effectiveness | No cold start observed over 4 hours | TC-P7-08 |

---

## 12. Exit Criteria

- [ ] AC-P7-01 … AC-P7-13 pass
- [ ] All 24 phase test cases pass
- [ ] **TC-INT-012 and TC-FAB-008 pass** — the demo uses the real prediction path
- [ ] Critical regression tier green against production
- [ ] All four recovery drills executed and within RTO
- [ ] Local fallback stack verified on the presenting laptop
- [ ] One-page runbook printed
- [ ] `docs/demo-script.md` walked once
- [ ] Zero unresolved Critical or High defects

### The demonstrable gate

A judge clicks one button. The system loads `C-10284`, calls the real prediction service, shows a genuine score with a genuine explanation, highlights the hotspot on a live map, renders the money trail, and dispatches an alert. Then the ML service is stopped and the same button produces an honest "prediction service unavailable" with no numbers at all.

Both behaviours are the product working correctly.
