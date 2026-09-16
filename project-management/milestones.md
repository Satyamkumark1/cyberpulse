# MILESTONES — CyberPulse AI

| Field | Value |
|---|---|
| Version | 1.0 |
| Basis | `ROADMAP.md` §2, `implementation/phase-*.md` |

---

## Milestone Definitions

A milestone is met when its phase's **exit criteria** pass — not when its tasks are finished. The distinction matters: tasks can be complete while the phase is not.

| # | Milestone | Phase | Calendar | The one thing that proves it |
|:--:|---|:--:|---|---|
| M1 | Blueprint complete | P1 | W1 D2 | Zero orphan requirements; zero contradictions |
| M2 | Foundation running | P2 | W1 D7 | Both pipeline gates demonstrated **blocking** |
| M3 | **Vertical slice working** | P3 | W2 D6 | A real prediction with a real explanation on a complaint page |
| M4 | Evidence surfaces | P4 | W3 D3 | Graph and map render real data; drawer opens |
| M5 | Loop closed | P5 | W3 D6 | Five-interaction path ends in a dispatched, audited alert |
| M6 | Hardened | P6 | Pre-finale | All gates green; zero Critical/High defects |
| M7 | Deployed and rehearsed | P7 | Finale +14 h | Four recovery drills within RTO |
| M8 | Demonstrated | P8 | Finale +24 h | Two narrated rehearsals ≤ 180 s |

---

## M3 Is the Project

Milestones M1, M2 and M4–M8 are important. **M3 decides whether there is a product.**

Everything before it is preparation. Everything after it is presentation. If a real prediction with a real explanation renders on a complaint page, the remaining phases make it usable and presentable. If it does not, no later phase creates it.

This is why ADR-014 moves the AI layer to Phase 3, why 37% of all test cases sit there, and why M3 carries the most schedule buffer.

---

## Milestone Gates

| Milestone | Must pass before the next phase begins |
|---|---|
| M1 | TC-DOC-010…021; all 20 ADRs; all 10 assumptions recorded |
| M2 | `signal_check` and `pii_scan` proven to **block**, not merely to run; `make setup` ≤ 30 min on every machine |
| M3 | Every model gate cleared; TC-ML-071 (shuffled labels collapse); `no_hardcode_check` clean |
| M4 | Both accessible table equivalents; map and graph budgets met on preview |
| M5 | TC-SEC-030 passes at all three injection points |
| M6 | All ~400 cases run; all Critical/High pass; gap lists reconciled |
| M7 | Model version verified post-deploy; all four drills within RTO |
| M8 | Comprehension test ≥ 4 of 5; documentation audit clean |

---

## Schedule Risk by Milestone

| Milestone | Risk | Buffer |
|---|---|---|
| M1 | Low — documentation is time-boxed and parallel | 0.5 day |
| M2 | **Medium** — RSK-01 could force generator rework | 1 day |
| M3 | **High** — RSK-06 could force model rework | 2 days |
| M4 | Medium — two parallel surfaces, both new | 1 day |
| M5 | Low — well-specified, conventional work | 0.5 day |
| M6 | Medium — defect count is unknown until it arrives | 1.5 days |
| M7 | Low — deployment already done in P6 | 0.5 day |
| M8 | Low — rehearsal, not construction | 0.5 day |

Total buffer: 7.5 days against 88 person-days of estimated work. Concentrated where the uncertainty is — M2 and M3 hold 40% of it between them.

---

## If a Milestone Slips

The rule is fixed in advance so it is not negotiated under pressure:

1. **Never cut the current phase's exit criteria.** A phase that exits without meeting them has not exited; it has moved its problems downstream.
2. **Cut scope from later phases.** The candidates, in order: reports chart count, simulation panel, settings threshold configuration, transaction ledger filters.
3. **Never cut:** the vertical slice, explainability, the alert path, the integrity tests, the prototype disclosures.
4. **Record the cut** in `project-management/decision-log.md`.

Item 3 is the list of things whose absence would make the product a different, lesser thing. Everything else is negotiable.
