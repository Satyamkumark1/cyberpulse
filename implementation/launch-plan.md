# LAUNCH PLAN — CyberPulse AI

| Field | Value |
|---|---|
| Version | 1.0 |
| "Launch" means | The SIH 2026 evaluation. There are no external users, no onboarding, no marketing. |
| Related | `devops/deployment-checklist.md` §4, `devops/disaster-recovery.md`, `implementation/phase-8.md` |

---

## 1. What Launch Actually Is

This product does not launch to users. It is presented to evaluators for a few minutes each, several times, on one day. Every decision in this plan follows from that.

| Conventional launch | This launch |
|---|---|
| Gradual rollout | One day, fixed sessions |
| Monitor adoption | Monitor a health tab |
| Fix forward over weeks | Fix between sessions or not at all |
| Feedback shapes the roadmap | Evaluator questions shape V1 |
| Downtime is costly | Downtime during a session is total failure |

The operational posture is therefore closer to a live broadcast than to a software release: rehearsed, short, unrepeatable, with a prepared fallback for every foreseeable failure.

---

## 2. Readiness Criteria

Launch proceeds only when all hold.

**Product**
- [ ] All eight phases exited
- [ ] Zero Critical or High defects
- [ ] All model gates cleared; `model_metrics` populated
- [ ] Full suite green against production

**Demonstration**
- [ ] Two narrated rehearsals ≤ 180 s
- [ ] Comprehension test ≥ 4 of 5
- [ ] Degraded rehearsal completed — the demonstrator can present honest failure
- [ ] Local fallback rehearsed within 2 minutes
- [ ] Reset protocol rehearsed twice

**Operational**
- [ ] Production health green, all three components
- [ ] Model version verified against the image tag
- [ ] Keep-warm job and uptime probe running
- [ ] One-page runbook printed and carried
- [ ] Local Docker stack verified on the presenting laptop

**Integrity and safety**
- [ ] Synthetic-data badge and exact disclaimer on every route
- [ ] Prohibited-claims scan clean
- [ ] Terminology scan clean
- [ ] Declared gaps consistent across three documents

---

## 3. Launch-Day Timeline

| Time | Activity | Owner |
|---|---|---|
| T−60 | Health check; smoke suite; verify model version | DevOps |
| T−45 | Local fallback stack started and verified | DevOps |
| T−30 | Full `/demo` warm-up run against production | Demonstrator |
| T−25 | `POST /api/demo/reset`; confirm `C-10284` analysable | Demonstrator |
| T−15 | Health tab opened; laptop on mains; screen sleep off; zoom 100%; window 1920×1080 | Demonstrator |
| T−5 | Runbook to hand; team positions confirmed | All |
| T−0 | First session | — |
| Between | Reset; health check; 60-second reset of composure | Demonstrator |
| T+end | Retrospective within 24 hours | All |

The 1920×1080 window and 100% zoom matter more than they sound. The layout is designed for that viewport, and a demonstration at 80% zoom on a 4K panel shows a product nobody designed.

---

## 4. The Three-Minute Narrative

Full script in `docs/demo-script.md`. The structure:

| Step | ~Seconds | The one thing the evaluator should take away |
|:--:|:--:|---|
| 1 · Complaint | 20 | A real case: ₹3,80,000, UPI fraud, Noida, filed this morning |
| 2 · Money trail | 25 | The money is a graph, not a statement — and it is already three hops out |
| 3 · AI analysis | 30 | This is a live model call, not a script |
| 4 · Hotspot | 35 | Here is *where*, ranked, with alternatives |
| 5 · Explanation | 35 | And here is *why*, in language an officer can repeat to a supervisor |
| 6 · Alert | 25 | It ends in a dispatched action, not a dashboard |
| Close | 10 | Synthetic data, prototype, decision support — stated plainly |

**Total: 180 seconds.** If it runs long, narration is cut, never a step. The chain is the product; removing a link demonstrates a different, lesser thing.

The closing ten seconds are not a disclaimer to rush through. Stating the limitations unprompted is what distinguishes a credible prototype from an overclaimed one, and evaluators notice.

---

## 5. Anticipated Questions

Prepared answers for the questions most likely to be asked, and the honest answer to each.

| Question | Answer |
|---|---|
| "Is this real data?" | No. Entirely synthetic, generated from a fixed seed. The schema has no column that could hold personal data. |
| "How accurate is it?" | On a held-out split of synthetic data, top-3 hit rate ≥ 0.72. That measures recovery of planted patterns, not real-world accuracy — we cannot claim the latter without real outcome data. |
| "How would you get real data?" | Through the adapter boundary in `architecture/integrations.md`. It is designed, not built, and it requires lawful authorisation we do not have. |
| "Could this be biased?" | Possibly, and we cannot test for it on synthetic data. It is recorded as the most serious open question in the project. |
| "What if the model is wrong?" | Every prediction carries confidence, alternatives and factors. No action is automatic. An officer decides. |
| "Why not an LLM?" | Reproducibility, exact attribution and offline verification. A tree ensemble gives all three; a generative model gives none well. |
| "Is this predictive policing?" | It predicts where an already-reported stolen sum will be withdrawn, anchored to a filed complaint. The object is a financial event, not a person or a population. |
| "What does it not do?" | No autonomous action, no freezing, no determination about any individual, no real integrations. |

The pattern across all eight: answer the question directly, then state the limit without being asked. A question met with a confident overclaim is the fastest way to lose a technically literate evaluator.

---

## 6. Failure Protocol

| Symptom | Action | Say |
|---|---|---|
| Prediction slow | Wait 20 s | "The prediction service is cold — it spins down on the free tier." |
| "Prediction unavailable" | Retry once, then switch to local | "That is the system refusing to invent a number. It is designed to fail visibly." |
| Map blank | Continue | "Tile provider is unreachable; the data layers still work." |
| Page will not load | Rollback or switch to local | — |
| Everything failing | `docker compose up -d` | "Switching to the local stack — same system, same data." |
| **A number looks wrong** | **Stop. Reset. Reload.** | "Let me reset that rather than explain it." |

The last row is the hardest to follow and the most important. Explaining away a figure the team does not trust contradicts the entire argument the product makes about itself.

---

## 7. Roles

| Role | Responsibility |
|---|---|
| Demonstrator | Drives the narrative; owns the reset protocol; makes the stop/continue call |
| Technical second | Watches the health tab; runs recovery; never speaks over the demonstrator |
| Domain answerer | Handles questions about the problem, the model and the limitations |
| Note-taker | Records every evaluator question verbatim for the retrospective |

Four roles, and the second one is the one teams usually omit. Someone whose only job is watching health is the difference between noticing a cold start at T−10 seconds and discovering it mid-sentence.

---

## 8. Post-Launch

| Activity | When | Output |
|---|---|---|
| Monitor health across all sessions | Continuous | — |
| Reset between evaluators | Every session | Known state |
| Record questions verbatim | During | Input to the retrospective |
| Retrospective | Within 24 h | Written, honest |
| V1 candidates from feedback | Within 48 h | Roadmap entries |
| Final `CHANGELOG.md` | Within 48 h | Recorded |

### Retrospective prompts

1. Which part did evaluators engage with most, and did it match what we expected?
2. Which question could we not answer well?
3. What broke, and did the documented recovery path actually work?
4. Which recorded assumption turned out to be wrong?
5. What would we build differently, and why?

Question 4 is the one that generates real V1 scope. Ten assumptions were recorded in `PROJECT_BRIEF.md` precisely so this question has something to check against — and a prototype that found none of them wrong probably did not test them hard enough.

---

## 9. What Is Deliberately Not in This Plan

| Not planned | Reason |
|---|---|
| Phased rollout | One audience, one day |
| User onboarding | No users |
| Marketing or launch communications | Not a commercial product |
| Support rota | No users to support |
| Capacity planning for growth | 20 concurrent users is the designed envelope |
| A/B testing | Nothing to test against |
| Post-launch feature releases | The build ends at the finale; V1 is a separate effort |

Listing these prevents the plan from acquiring ceremony that serves no one. A launch plan for a demonstration should be a rehearsal schedule and a failure protocol, and this one is.
