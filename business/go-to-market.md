# GO-TO-MARKET — CyberPulse AI

```text
Not Applicable as conventionally understood
Reason: There is no market, no customer and no commercial route (see
business/revenue-model.md). This document instead specifies the ADOPTION
PATHWAY — how a capability of this kind would move from prototype to
operational use, and what has to be true at each step.
```

---

## 1. The Immediate "Launch" Is an Evaluation

For this project, going to market means presenting to SIH evaluators for a few minutes each on one day. That is covered operationally in `implementation/launch-plan.md`. What follows is the pathway beyond it, which is a governance sequence rather than a marketing one.

---

## 2. Adoption Pathway

```
Prototype  →  Pilot  →  District deployment  →  State  →  National
(now)         (V1)      (V1)                    (V2)      (V3+)
```

| Stage | Precondition that gates it | Duration |
|---|---|---|
| **Prototype** | Synthetic data only | Complete |
| **Pilot** | Lawful data access; DPIA; real identity; one willing district | 3–6 months |
| **District** | Pilot shows a changed deployment decision; officers trained | 6–12 months |
| **State** | State-level partitioning; per-region calibration; SLA | 12–24 months |
| **National** | Outcome capture; bias evaluation; federated or centralised governance settled | 24 months+ |

Every arrow in that sequence is gated by something the engineering team does not control. That is the defining characteristic of this pathway and the reason it is a governance sequence rather than a sales funnel.

---

## 3. What Has To Be True Before a Pilot

Not features — preconditions. None is within this project's gift.

| # | Precondition | Owner |
|---|---|---|
| 1 | Lawful authority for complaint and transaction data access | Nodal body |
| 2 | Data protection impact assessment completed | Nodal body |
| 3 | Real identity management with verified role claims | Deployment |
| 4 | A willing district cyber cell with capacity to participate | State police |
| 5 | Bank nodal channel agreement for at least one institution | Bank + nodal body |
| 6 | Outcome capture process — did a withdrawal occur where predicted? | Field process |
| 7 | Officer training on interpretation and on **not over-relying** on the output | Training establishment |
| 8 | Independent security assessment | Nodal body |

Precondition 6 is the one most likely to be skipped and the most consequential. Without it the model stays trained on synthetic labels indefinitely, and the deployment accumulates usage without accumulating accuracy.

Precondition 7 is the one that addresses the risk software cannot: automation bias (DT-4). Confidence display, visible alternatives and published error rates push against it, but doctrine and training are what actually determine whether an officer treats a ranked list as intelligence or as instruction.

---

## 4. Pilot Design

If a pilot happened, the design would matter more than the technology.

| Element | Approach |
|---|---|
| Scope | One district, one fraud type, 90 days |
| Mode | **Shadow first** — the system predicts, officers work as usual, outcomes are recorded and compared. No deployment decision is taken on the system's output. |
| Then | Advisory mode — officers see predictions and decide freely |
| Success measure | Did the system change a deployment decision, and was that change justified in hindsight? |
| Safety measure | Zero wrongful consequences attributable to a prediction |
| Exit | Real top-3 hit rate measured on real outcomes; bias evaluation completed |

Shadow mode first is not caution for its own sake. It is the only way to obtain real accuracy figures without any person bearing the consequence of a model error, and those figures are the thing the entire pathway depends on.

---

## 5. Adoption Barriers

| Barrier | Severity | Response |
|---|---|---|
| Lawful data access | **Critical** | Outside the team's control; the adapter boundary is designed so the technical side is not the blocker |
| Officer trust | High | Explainability, visible alternatives, published error rates, honest degradation |
| "Predictive policing" objection | High | The object of prediction is a financial event tied to a filed complaint, not a person or a population — stated plainly, with the safeguards visible in the product |
| Institutional inertia | High | Deploy downstream of existing systems rather than replacing them |
| Bank participation | Medium | Structured alerts reduce their re-work, which is the incentive |
| Bias concerns | **Critical** | Untestable today; declared as the most serious open question |
| Sustainment funding | Medium | Outcome capture and revalidation are recurring, not one-off |

Rows one and six are the two that could stop the pathway entirely, and neither is a technology problem.

---

## 6. Positioning

For anyone describing this capability, the frame that holds up under scrutiny:

> CyberPulse AI is the missing analytical layer between complaint registration and field response. It does not replace the complaint system, the bank's monitoring, or the investigator's judgement. It occupies the one stage in the chain that currently has no owner — and it hands a human an explained forecast, never an instruction.

What must never be said: that it is endorsed, deployed, connected to real systems, accurate in the real world, or capable of preventing fraud. Each of those is scanned for in CI (`TC-UX-012`) precisely because they are the claims most likely to slip into a description under enthusiasm.

---

## 7. Communication Materials

| Material | Audience | Status |
|---|---|---|
| `/demo` route | Evaluators | Built |
| `docs/demo-script.md` | Demonstrator | Built |
| Prepared answers to hard questions | Evaluators | `implementation/launch-plan.md` §5 |
| `model_card.json` | Technical reviewers | Generated per training run |
| This documentation set | Any reviewer | Complete |

There is no pitch deck, no brochure and no marketing site, and none is planned. For a capability of this kind, the documentation *is* the credibility argument — and a reviewer who reads `ai/evaluation-framework.md` §8 learns more about whether to trust the system than any deck would tell them.
