# CUSTOMER JOURNEY — CyberPulse AI

| Field | Value |
|---|---|
| Version | 1.0 |
| Scope | The end-to-end journey from citizen victimisation to case closure, and where CyberPulse AI intervenes |

---

## 1. The System-Level Journey

CyberPulse AI does not own the whole journey. It owns one segment of it — the segment that is currently empty. Understanding the surrounding stages is what keeps the product honest about its boundaries.

| Stage | Owner | Duration today | CyberPulse AI role |
|---|---|---|---|
| S1 Victimisation | — | Minutes | None |
| S2 Complaint registration | NCRP / helpline / police station | Minutes–hours | Consumes the complaint record (synthetic in this prototype) |
| S3 Case assignment | Cyber cell | Hours | None |
| S4 **Signal joining and forecasting** | *Currently nobody* | *N/A* | **Owns this stage** |
| S5 Bank engagement | Cyber cell → bank nodal officer | Days | Provides the structured alert that initiates it |
| S6 Field response | Cyber cell | Hours–days | Provides location and window |
| S7 Cash-out event | Offender | Hours | The event being forecast |
| S8 Investigation and closure | Cyber cell | Weeks–months | Provides the case surface and audit trail |

The strategic point is S4. Stages S1–S3 and S5–S8 exist and function. S4 does not exist at all, and its absence is what makes S5 and S6 arrive too late.

---

## 2. PER-01 Journey Map — Investigating Officer

### Phase 1 — Receive
**Doing:** Opens the shift's new complaints. Skims for amount and fraud type.
**Thinking:** "Which of these eleven can I actually do something about today?"
**Feeling:** Pressed. Slightly resigned about the smaller cases.
**Pain:** No basis for triage beyond amount.
**Touchpoint:** `/complaints` with risk-level column and sortable amount.
**Opportunity:** Risk level visible in the queue converts triage from guesswork into ranking.

### Phase 2 — Orient
**Doing:** Opens a complaint to understand what happened.
**Thinking:** "Where did the money go, and is any of it still recoverable?"
**Feeling:** Focused.
**Pain:** The complaint record describes the victim's experience, not the money's movement.
**Touchpoint:** `/complaints/[id]` — summary, transaction timeline, linked accounts on one page.
**Opportunity:** Pre-joined trail removes the multi-day statement request from the critical path.

### Phase 3 — Analyse *(the moment of value)*
**Doing:** Clicks **Analyze Complaint**.
**Thinking:** "Can this actually tell me something I don't already know?"
**Feeling:** Sceptical, then — if the output is specific and explained — engaged.
**Pain:** Prior experience of tools that produce a number and no reasoning.
**Touchpoint:** Prediction panel with ranked hotspot, window, confidence and factors.
**Opportunity:** This is the interaction the entire product exists to deliver. It must be fast, specific and explained, or the officer never returns.
**Failure mode to avoid:** A slow spinner followed by an unexplained percentage. That single experience ends adoption.

### Phase 4 — Verify
**Doing:** Opens the money-trail graph; reads the factor breakdown.
**Thinking:** "Does this reasoning match what I can see?"
**Feeling:** Building or losing trust.
**Pain:** No way to audit an inference.
**Touchpoint:** Money-trail graph and factor panel, side by side.
**Opportunity:** Verification is what converts a prediction into a decision. Making the evidence inspectable is a trust mechanism, not a nice-to-have.

### Phase 5 — Decide and act
**Doing:** Escalates to the supervisor if needed; generates and dispatches the alert.
**Thinking:** "Who needs to know, and can I justify this deployment?"
**Feeling:** Committed.
**Pain:** Composing the same request differently for each bank.
**Touchpoint:** Alert modal with pre-filled intelligence and recipient selection.
**Opportunity:** A consistent structure benefits both sides of the request.

### Phase 6 — Track
**Doing:** Records notes; moves the case through its lifecycle.
**Thinking:** "What is the current state, and what did we actually do?"
**Feeling:** Administrative.
**Pain:** State lives in spreadsheets and messages.
**Touchpoint:** Investigation view with notes and validated transitions.
**Opportunity:** Recording outcomes creates the labelled data that makes V2's feedback loop possible.

### Emotional arc

```
Pressed ──▶ Focused ──▶ Sceptical ──▶ Engaged ──▶ Trusting ──▶ Committed ──▶ Administrative
   P1         P2           P3 (start)   P3 (end)     P4          P5             P6
```

The single largest risk in the whole journey sits between "Sceptical" and "Engaged", in Phase 3. Every performance target (NFR-02), every explainability requirement (FR-10.x) and the entire degraded-mode design exist to protect that transition.

---

## 3. PER-03 Journey Map — Bank Nodal Officer

| Phase | Doing | Pain today | Touchpoint | Opportunity |
|---|---|---|---|---|
| Receive | Processes a large, heterogeneous inbound queue | Every request has a different shape | Structured alert with fixed fields | Machine-comparable requests |
| Triage | Decides what to action first | No severity or confidence signal | Severity derived from risk level; confidence shown | Objective prioritisation |
| Act | Investigates internally | Requests often lack the specificity to act | Location, window, accounts, factors | Actionable specificity |
| Respond | Confirms receipt | No standard acknowledgement channel | One-action acknowledgement with timestamp | Closed loop for the requesting officer |

**Boundary that must hold:** the bank officer must see only alerts addressed to them and the case context reachable through those alerts. This is enforced server-side (AC-015-02), not by hiding UI.

---

## 4. PER-02 Journey Map — I4C Analyst

| Phase | Doing | Pain today | Touchpoint |
|---|---|---|---|
| Scan | Reviews national activity | State-siloed data | National risk map with heatmap layer |
| Detect | Notices a concentration | No cross-state view | Hotspot layer with ranked scores |
| Investigate | Drills into the cluster | Aggregates are dead ends | Hotspot drawer → related complaints |
| Assess | Judges how much to trust it | Metrics unpublished | PROTOTYPE MODEL EVALUATION panel |
| Advise | Issues an advisory | Cannot cite an unvalidated model | Published metrics with stated methodology |

---

## 5. Journey Metrics

| Journey moment | Metric | Target | Source event |
|---|---|---|---|
| P1 → P2 | Time from queue to complaint open | ≤ 15 s | `complaint_row_opened` |
| P3 | Analyse click → rendered prediction | p95 ≤ 1.5 s | `prediction_returned` |
| P3 → P4 | Explanation expansion rate | ≥ 80% | `explanation_expanded` |
| P4 | Graph open rate after prediction | ≥ 70% | `graph_rendered` |
| P4 → P5 | HIGH prediction → alert dispatch | ≥ 40% | `alert_sent` |
| P5 → P6 | Alert → investigation record | 100% | `investigation_created` |
| Bank | Alert → acknowledgement | ≥ 60% in session | `alert_acknowledged` |

All events are defined in `product/product-analytics.md`.

---

## 6. Moments of Truth

Three moments determine whether the product succeeds. Each has a named owner in the phase plan.

| # | Moment | Fails when | Protected by |
|---|---|---|---|
| MOT-1 | The first prediction an officer ever sees | It is slow, generic, or unexplained | NFR-02, FR-10.x, P3 exit gate |
| MOT-2 | The first time a prediction is checked against the graph | The reasoning does not match the visible evidence | FEAT-04, FEAT-09, AC-009-05 |
| MOT-3 | The first time the system cannot predict | It invents a number instead of saying so | FR-07.5, AC-006-04, AC-014-05 |

MOT-3 is the one most products get wrong, and it is the one a government evaluator is most likely to probe. Honest degradation is specified as a hard requirement precisely because it is a trust asset rather than a limitation.
