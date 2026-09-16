# ESTIMATION — CyberPulse AI

| Field | Value |
|---|---|
| Version | 1.0 |
| Unit | Person-days |
| Total | 88 person-days across 8 phases, plus 7.5 days buffer |
| Team | 6 people, three weeks plus a 36-hour finale |

---

## Method

Bottom-up from the task lists in each phase document, cross-checked against three reference points: the complexity of each deliverable, the number of test cases it carries, and how much of it is genuinely novel versus conventional.

Estimates are for **experienced engineers working with the blueprint already written**. Phase 1 exists partly so that later phases can be estimated at all.

---

## By Phase

| Phase | Person-days | Share | Why this size |
|:--:|:--:|:--:|---|
| P1 Research & Architecture | 6 | 7% | Parallel across six roles; time-boxed to two days |
| P2 Infrastructure & Data | 12 | 14% | The generator is 3 days of it — realistic synthetic data with planted patterns is genuinely hard |
| P3 Core Intelligence | 20 | 23% | The largest phase: features, two models, hotspot engine, SHAP, service, registry, detail, roles |
| P4 Money Trail & GIS | 14 | 16% | Two substantial surfaces built in parallel, plus a non-trivial recursive query |
| P5 Alerts & Investigations | 12 | 14% | Conventional work, but the transaction and state machine need care |
| P6 Reporting, QA, Security | 12 | 14% | 5 days of surface, 7 of hardening and burn-down |
| P7 Demo & Deployment | 8 | 9% | Deployment already done in P6; this is the demo layer plus drills |
| P8 Launch & Rehearsal | 4 | 5% | Rehearsal, comprehension test, audit |
| **Total** | **88** | | |

---

## By Discipline

| Discipline | Days | Share |
|---|:--:|:--:|
| Backend and services | 19 | 22% |
| Frontend | 22 | 25% |
| ML and data | 20 | 23% |
| QA and testing | 13 | 15% |
| DevOps | 8 | 9% |
| Product, UX, documentation | 6 | 7% |

Frontend is the largest single share because the product has twelve routes, two canvas surfaces, and a four-state requirement on every one of them.

---

## The Three Estimates Most Likely to Be Wrong

Honest uncertainty, rather than a uniform confidence claim.

**The generator (3 days, P2).** Producing synthetic data that *looks* plausible takes a day. Producing data with patterns a model can actually learn, at the right strength, without leaking the label, takes longer — and the failure mode is invisible until training. Buffer: 1 day.

**Model training and tuning (2.5 days, P3).** If the first training run clears the gates, this is half a day. If it does not, diagnosis could take two more. This is the single largest schedule risk in the project. Buffer: 2 days.

**Defect burn-down (1.5 days, P6).** The count is unknown until the suites run. Estimated from the volume of new code rather than from experience with this codebase. Buffer: 1.5 days.

---

## Buffer Allocation

| Phase | Buffer | Rationale |
|:--:|:--:|---|
| P2 | 1.0 | Generator rework (RSK-01) |
| P3 | 2.0 | Model gate failure (RSK-06) |
| P4 | 1.0 | Two new surfaces |
| P5 | 0.5 | Well-specified |
| P6 | 1.5 | Unknown defect count |
| P7 | 0.5 | Drills may need repeating |
| P8 | 0.5 | Rehearsal adjustments |
| P1 | 0.5 | — |
| **Total** | **7.5** | 8.5% of estimate |

Buffer sits where uncertainty is, not spread evenly. P2 and P3 hold 40% of it.

---

## What Is Not Estimated

| Excluded | Reason |
|---|---|
| Learning the stack | Assumed familiar; if not, add 20% |
| Environment setup per person | `make setup` is ≤ 30 min by requirement |
| Meetings beyond the daily stand-up | Three retrospectives are the only other ceremony |
| V1 and beyond | Separate effort |
| Bias evaluation | Impossible on synthetic data (RSK-11) |

---

## Estimation Rules Used

1. **Test cases are work.** A feature with 40 test cases is not the same size as one with 5, even at equal implementation complexity.
2. **Documentation updates are in the task, not after it.** The same-PR rule means the estimate includes them.
3. **Novel work gets 1.5×.** The generator, the hotspot engine and the SHAP aggregation are novel here; CRUD surfaces are not.
4. **Parallel work is only parallel if it has no shared dependency.** The graph and map in P4 qualify; the model and the prediction panel in P3 do not.
5. **The critical path determines the calendar, not the total.** 88 person-days across 6 people is not 15 days — the critical path through the intelligence layer is what sets the schedule.

---

## Tracking

Progress is measured by **exit gates met**, not by days burned or tasks closed. A phase at 90% of its tasks with an unmet gate is at 0% for planning purposes, because the gate is what the next phase depends on.
