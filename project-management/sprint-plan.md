# SPRINT PLAN — CyberPulse AI

| Field | Value |
|---|---|
| Version | 1.0 |
| Model | Phase-aligned sprints, not fixed-length iterations |
| Team | 6 — PM/UX, Architect/Backend, Frontend A, Frontend B, ML, DevOps/QA |

---

## Why Phase-Aligned Rather Than Two-Week Sprints

The delivery window is three weeks plus a 36-hour finale. A two-week cadence would produce one and a half sprints, and the ceremony would cost more than the rhythm it created.

Instead, each phase is a sprint with a real exit gate. The gate is what a sprint review would have been, except it is objectively checkable rather than a demonstration and a conversation.

---

## Sprint Map

| Sprint | Phase | Days | Goal | Exit gate |
|:--:|:--:|:--:|---|---|
| S1 | P1 | 2 | Blueprint | Zero orphans, zero contradictions |
| S2 | P2 | 5 | Foundation and corpus | Both gates block; `make setup` ≤ 30 min |
| S3 | P3 | 6 | **The vertical slice** | Real prediction, real explanation, all model gates |
| S4 | P4 | 4 | Evidence surfaces | Graph and map on real data, accessible equivalents |
| S5 | P5 | 3 | The loop closed | Five-interaction path, audited |
| S6 | P6 | 5 | Hardening | All suites, zero Critical/High |
| S7 | P7 | 14 h | Demo and deployment | Four drills within RTO |
| S8 | P8 | 10 h | Rehearsal | Two runs ≤ 180 s |

---

## Team Allocation by Sprint

| | S1 | S2 | S3 | S4 | S5 | S6 | S7 | S8 |
|---|---|---|---|---|---|---|---|---|
| **PM/UX** | Requirements, personas, wireframes | Design system in code | Prediction panel design | Drawer, accessible tables | Alert modal | Accessibility passes | Demo script | Comprehension test |
| **Architect/Backend** | ADRs, contracts, schema | Shared codegen, health | `predictionService`, roles | Network endpoint | **Alert transaction** | Security cases | Deploy verify | Support |
| **Frontend A** | — | Shell, sidebar | Complaint registry + detail | **Graph** | Investigations | Defect burn-down | Demo steps | Copy fixes |
| **Frontend B** | — | Compose, tooling | Prediction panel | **Map** | Alerts list | Reports charts | Demo shell | Copy fixes |
| **ML** | ML approach, metrics | **Generator, signal check** | **Features, models, SHAP** | Hotspot refresh | — | Model docs | Warm-up verify | — |
| **DevOps/QA** | Test strategy, matrix | CI, migrations, seeding | Integrity scaffolding | Traversal query | Audit tests | **All suites** | **Drills** | Smoke, rehearsal |

Bold entries are the critical path for that sprint. Two people are deliberately idle-capable in S3 (Frontend A and B both have work that does not block on the model) and fully loaded in S4, which is the largest parallel block.

---

## Daily Rhythm

A 10-minute stand-up answering three questions, and one rule:

1. What moved the phase's exit gate closer yesterday?
2. What will move it today?
3. What is blocking?

**The rule:** work that does not move the current phase's exit gate needs a reason. This is the practical form of RSK-05 mitigation — scope creep is almost always well-intentioned work on a later phase's surface.

---

## Sprint Review

At each phase exit, in order:

1. Run the phase's test cases and the required regression scope.
2. Walk the exit criteria checklist item by item. Each is objectively checkable.
3. Demonstrate the phase's "demonstrable gate" — the one sentence in each phase document describing what a person can now do.
4. Record defects with severity and owner.
5. Decide: exit, or extend with scope cut from a later phase.

No review declares a phase complete on the basis that the work feels finished.

---

## Retrospective

At S3, S6 and S8 only — three retrospectives in three weeks is the right number. Each asks:

1. Which documented assumption turned out to be wrong?
2. What did we build that the exit gate did not require?
3. What slowed us down that was avoidable?

Question 1 feeds `project-management/decision-log.md` and eventually V1 scope. Question 2 is the RSK-05 check applied backwards.

---

## Definition of Ready

A task is ready to start when: the requirement ID exists; the acceptance criteria are written; the contract it depends on exists; and the test cases that will verify it are identified.

A task without all four gets clarified rather than started. On a three-week timeline, a day spent building the wrong thing costs more than an hour spent asking.
