# PHASE 8 — LAUNCH, REHEARSAL & POST-LAUNCH

| Field | Value |
|---|---|
| Duration | 4 person-days · Finale, hours 14–24 |
| Output | A rehearsed demonstration, a verified system, and an honest record of what was built |
| Entry | Phase 7 exited — deployment verified, drills rehearsed |

---

## 1. Objectives

1. Rehearse the narrated demonstration until it completes inside 180 seconds, twice.
2. Verify that someone unfamiliar with the project can understand it unaided.
3. Run the final smoke and documentation audit.
4. Establish the between-evaluator reset protocol.
5. Record what was built, what was not, and what was learned.

---

## 2. Deliverables

| Deliverable | Acceptance |
|---|---|
| Two timed narrated rehearsals | Each ≤ 180 s, full six-step chain |
| First-run comprehension test | ≥ 4 of 5 participants succeed unaided |
| Final smoke against production | 12 cases green |
| `implementation/documentation-audit.md` | Zero orphans, zero contradictions |
| Between-evaluator protocol | Written, rehearsed |
| Launch checklist | Completed and signed |
| Post-event retrospective | Honest, including what did not work |
| Final `CHANGELOG.md` | Complete |

---

## 3. Implementation Tasks

| # | Task | Owner | Days |
|---|---|---|---|
| T-8.1 | Rehearse the narrated script; time it; cut what does not fit | PM + demonstrator | 0.75 |
| T-8.2 | Second timed rehearsal after adjustments | Demonstrator | 0.25 |
| T-8.3 | First-run comprehension test with five unfamiliar participants | UX | 0.5 |
| T-8.4 | Act on comprehension findings — copy only, no new features | Frontend | 0.5 |
| T-8.5 | Final smoke against production | QA | 0.25 |
| T-8.6 | Documentation audit | Architect | 0.75 |
| T-8.7 | Between-evaluator protocol, rehearsed twice | Demonstrator | 0.25 |
| T-8.8 | Launch checklist completion and sign-off | All | 0.25 |
| T-8.9 | Retrospective | All | 0.5 |

T-8.4 is deliberately constrained to copy. A comprehension failure at this stage is almost always a wording problem, and a new feature introduced in the last hours is a defect waiting to appear on stage.

---

## 4. Dependencies

**Inbound:** everything. **Outbound:** none — this is the terminal phase.

---

## 5. Risks

| Risk | Probability | Impact | Mitigation |
|---|---|---|---|
| Rehearsal reveals a narrative gap | Medium | High | First rehearsal scheduled at the *start* of the phase, not the end |
| Comprehension test fails | Medium | High | Fixes constrained to copy; the six-step flow is fixed |
| Last-minute change breaks something | Medium | **Critical** | Feature freeze at the start of P8; only copy and documentation change |
| Demonstration exceeds 180 s | Medium | Medium | Cut narration, never steps — the chain is the point |
| Cold start during an evaluation | High | Critical | Keep-warm, T−30 warm run, health tab, local fallback |
| Reset forgotten between evaluators | Medium | Medium | Written protocol; first item in the between-session checklist |

---

## 6. Acceptance Criteria

**AC-P8-01** — Two independent narrated rehearsals each complete the six-step chain in ≤ 180 s.
**AC-P8-02** — In the comprehension test, ≥ 4 of 5 participants state the predicted location, the time window and at least two contributing factors, unaided, within three minutes.
**AC-P8-03** — The 12-case smoke tier passes against production.
**AC-P8-04** — The documentation audit reports zero orphan requirements, zero orphan test cases and zero contradictions.
**AC-P8-05** — The between-evaluator protocol has been rehearsed twice and restores a known state each time.
**AC-P8-06** — The launch checklist is complete with named sign-offs.
**AC-P8-07** — `CHANGELOG.md` records the final state including the model entry.
**AC-P8-08** — The retrospective records what did not work, not only what did.

---

## 7. Test Strategy

Phase 8 tests the *demonstration*, not the software — the software was tested in P6. Its cases are timed, observed and human-judged, which is why three of the eight are manual.

---

## 8. Phase 8 Test Cases

### TC-P8-01 — Timed narrated rehearsal *(Manual, ×2)*
**Priority** Critical
**Steps:** Demonstrator runs `/demo` end to end while narrating as if to a judge. Timer starts on the first word and stops when the alert shows SENT.
**Expected:** ≤ 180 s, both runs. All six steps completed. No step skipped to save time.

### TC-UX-023 — First-run comprehension *(Manual)*
**Priority** High
**Steps:** Give five participants unfamiliar with the project the URL and no instructions. Ask where the money from `C-10284` is likely to be withdrawn and why. Observe for three minutes without assisting.
**Expected:** ≥ 4 of 5 reach the prediction and correctly state location, window and two factors.

### TC-P8-02 — Between-evaluator reset protocol *(Manual, ×2)*
**Priority** High
**Steps:** Complete a full demonstration including an alert dispatch; run the protocol; verify state.
**Expected:** Demo-origin records cleared; seed counts unchanged; `C-10284` analysable; health green. Identical outcome both times.

### TC-P8-03 — Final production smoke
**Priority** Critical · **Automated**
**Expected:** All 12 smoke cases pass, including S-06 (displayed value equals response) and S-12 (degraded mode is numberless).

### TC-P8-04 — Documentation audit
**Priority** Critical · **Automated + inspection**
**Expected:** Zero orphan requirements, zero orphan test cases, zero contradictions, all phase documents complete, declared gaps identical across three documents.

### TC-P8-05 — Model version and mode verification
**Priority** Critical · **Automated**
**Expected:** Settings shows System Mode `Prototype`, Data Mode `Synthetic / Anonymised`, model `CyberPulse-Demo-v1`. Every prediction reports the same version.

### TC-P8-06 — Disclosure present on every route
**Priority** Critical · **Automated**
**Expected:** The synthetic-data badge and the exact disclaimer sentence appear on all twelve routes plus `/demo`.

### TC-P8-07 — Degraded rehearsal *(Manual)*
**Priority** Critical
**Steps:** Stop the ML service mid-rehearsal and continue narrating.
**Expected:** The demonstrator can complete a coherent explanation with the degraded panel visible and no fabricated values. Honest failure is demonstrably presentable.

### TC-P8-08 — Local fallback rehearsal *(Manual)*
**Priority** Critical
**Steps:** Disconnect the network; switch to the local stack; resume.
**Expected:** Running demonstration within 2 minutes.

---

## 9. Regression Tests

| Scope | When |
|---|---|
| Smoke tier (12) | Before each evaluation session |
| Critical tier (68) | Once at the start of the phase |
| Full suite (~400) | Once, at the phase start, against production |

No code changes after the full-suite run except copy fixes from T-8.4, each of which re-runs TC-UX-011, TC-UX-012 and TC-UX-013.

---

## 10. Security Validation

| Check | Case |
|---|---|
| Disclosure strings exact on every route | TC-P8-06, TC-UX-011 |
| No prohibited claims in any rendered text | TC-UX-012 |
| Terminology lexicon respected | TC-UX-013 |
| Demo reset cannot touch seed data | TC-SEC-042 |
| Declared gaps unchanged and consistent | TC-DOC-018 |
| No secret in the production bundle | TC-SEC-003 |

Copy changes in T-8.4 are the last opportunity for a prohibited phrase to enter the product, which is why the three copy scans re-run after every one of them.

---

## 11. Performance Validation

| Check | Target | Case |
|---|---|---|
| Narrated rehearsal | ≤ 180 s | TC-P8-01 |
| Automated scenario | ≤ 15 s | TC-E2E-022 |
| Production health check | All up before each session | TC-P8-03 |
| No cold start during a session | Keep-warm plus T−30 run | TC-PERF-007 |

---

## 12. Exit Criteria

- [ ] AC-P8-01 … AC-P8-08 pass
- [ ] Both timed rehearsals ≤ 180 s
- [ ] Comprehension test ≥ 4 of 5
- [ ] Smoke tier green against production
- [ ] Documentation audit clean
- [ ] Between-evaluator protocol rehearsed twice
- [ ] Degraded and local-fallback rehearsals completed
- [ ] Launch checklist signed
- [ ] Retrospective written
- [ ] `CHANGELOG.md` final

---

## 13. Post-Launch

| Activity | When |
|---|---|
| Monitor health during every evaluation window | Continuous |
| Reset between evaluators | Every session |
| Record evaluator questions | During |
| Retrospective | Within 24 hours |
| Record V1 candidates from evaluator feedback | Within 48 hours |

### Retrospective prompts

1. Which part of the demonstration did evaluators engage with most?
2. Which question could the team not answer well?
3. What broke, and did the recovery path work?
4. Which documented assumption turned out to be wrong?
5. What would be built differently, and why?

Question 4 is the one that produces V1 scope. A prototype that discovered none of its assumptions were wrong probably did not test them.
