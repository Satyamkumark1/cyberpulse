# COMPETITIVE ANALYSIS — CyberPulse AI

| Field | Value |
|---|---|
| Version | 1.0 |
| Purpose | Establish what already exists in this space, what it does and does not do, and where CyberPulse AI's contribution actually lies |
| Caution | This analysis describes **categories of system** and their generally documented capabilities. It does not assert internal implementation details of any specific government or commercial system, and no claim here should be read as an authoritative statement about a named product's current feature set. |

---

## 1. The Competitive Landscape Is Not What It Appears

The instinctive framing — "who else predicts cash-out locations for cybercrime complaints in India" — has a short answer: as far as public information indicates, no fielded system does this. That makes the interesting analysis adjacent rather than direct. CyberPulse AI competes not with a rival predictor but with **the status quo workflow**, and it must be honest that the status quo is not nothing: it is experienced officers, bank relationships, and manual pattern recognition that works, slowly.

Four adjacent categories are analysed below.

---

## 2. Category A — Complaint Reporting and Case Management

**Examples of the category:** national cybercrime reporting portals, citizen financial-fraud reporting systems, police case-management software.

| Dimension | Category capability | Gap |
|---|---|---|
| Complaint intake | Strong — structured, multi-channel, at national scale | — |
| Case tracking | Strong — status, assignment, disposal | — |
| Money-trail reconstruction | Absent or manual | Requires bank statements obtained separately |
| Forecasting | Absent | No predictive component |
| Geospatial analytics | Limited to reporting location | No cash-out geography |
| Explainability | Not applicable | — |

**Relationship to CyberPulse AI:** complementary, not competitive. These systems own stages S1–S3 and S8 of the journey. CyberPulse AI consumes their output and owns S4. In a real deployment, CyberPulse AI would sit downstream of them, not replace them.

**Implication for the product:** the integration story must be credible. `architecture/integrations.md` specifies the adapter boundary that a real deployment would use, precisely so this analysis does not read as a claim to replace national infrastructure.

---

## 3. Category B — Bank Transaction Monitoring and AML Platforms

**Examples of the category:** commercial anti-money-laundering and transaction-monitoring suites deployed inside financial institutions.

| Dimension | Category capability | Gap for this problem |
|---|---|---|
| Transaction scoring | Strong — mature rules plus ML | Scoped to one institution's own book |
| Network analysis | Present in leading products | Stops at the institution's boundary |
| Alerting | Strong | Alerts flow inward to compliance, not outward to police |
| Cash-out location forecasting | Not a design goal | Not addressed |
| Cross-institution view | Structurally impossible | The mule chain crosses banks |
| Law-enforcement workflow | Absent | Different user entirely |

**The structural point.** A mule chain deliberately crosses institutions. Any single bank sees a fragment. This is not a shortcoming of AML products — it is a boundary condition of where they sit. A complaint-anchored view is the only vantage point from which the whole chain is visible, and that vantage point belongs to law enforcement.

**Implication for the product:** the complaint, not the account, must be the unit of analysis. This is why the data model anchors on `complaints` and why the graph is traversed from the victim outward.

---

## 4. Category C — Predictive Policing and Crime Hotspot Systems

**Examples of the category:** spatiotemporal crime forecasting tools, patrol-allocation systems.

| Dimension | Category capability | Difference here |
|---|---|---|
| Spatial forecasting | Mature — KDE, risk terrain modelling, self-exciting point processes | Directly transferable technique |
| Temporal forecasting | Mature | Directly transferable |
| Unit of prediction | Area-level crime rate over a period | Here: a specific event tied to a specific complaint |
| Trigger | Historical aggregate | Here: a live case with a known money trail |
| Explainability | Historically weak; a documented source of criticism | Here: a hard requirement |
| Ethical exposure | Significant and well documented | Materially lower — see below |

**On the ethics comparison.** Predictive policing has attracted substantial, well-founded criticism: it forecasts *where people will be policed*, risks encoding historical enforcement bias, and its subjects are populations. CyberPulse AI's object of prediction is different in kind. It forecasts **where a specific, already-reported stolen sum is likely to be withdrawn**, anchored to a filed complaint, and its subject is a financial event rather than a demographic. That distinction is real, but it is not a licence for complacency — `security/compliance.md` and `ai/guardrails.md` record the safeguards, and `product/personas.md` defines an explicit anti-persona forbidding autonomous action.

**Implication for the product:** borrow the spatial techniques, reject the population-level framing, and make explainability non-optional.

---

## 5. Category D — Graph Analytics and Investigation Platforms

**Examples of the category:** general-purpose link-analysis and investigative graph tools.

| Dimension | Category capability | Gap |
|---|---|---|
| Graph visualisation | Excellent, general-purpose | Requires an analyst to drive it |
| Data integration | Strong | Requires the data to already be assembled |
| Forecasting | Not built in | The user must bring the model |
| Domain workflow | Generic | No complaint→alert→case lifecycle |
| Skill requirement | High | Wrong fit for a district officer with 40 open cases |
| Deployment cost | High | Wrong fit for district-level scale-out |

**Implication for the product:** the graph must be *purpose-built and opinionated* — three node types, one layout, one question answered — rather than a general analysis canvas. Generality would be a usability regression for PER-01.

---

## 6. Positioning Summary

| | Complaint systems | Bank AML | Predictive policing | Graph platforms | **CyberPulse AI** |
|---|:--:|:--:|:--:|:--:|:--:|
| Complaint-anchored | ● | ○ | ○ | ○ | ● |
| Cross-institution trail | ○ | ○ | ○ | ◐ | ● |
| Cash-out location forecast | ○ | ○ | ◐ | ○ | ● |
| Time-window forecast | ○ | ○ | ◐ | ○ | ● |
| Explainable output | ○ | ◐ | ○ | ○ | ● |
| Ends in a dispatched action | ◐ | ● | ○ | ○ | ● |
| Usable by a district officer | ● | ○ | ◐ | ○ | ● |

● full · ◐ partial · ○ absent

**Positioning statement.** CyberPulse AI is the missing analytical layer between complaint registration and field response. It does not replace the complaint system, the bank's monitoring, or the investigator's judgement. It occupies the one stage that currently has no owner.

---

## 7. What Competitors Do Better

Recording this honestly is more useful than a table of advantages.

| They do better | Who | Our response |
|---|---|---|
| Scale, uptime and national integration | Complaint portals | We do not attempt it; we specify an adapter boundary instead |
| Depth of transaction-level rules refined over years | AML platforms | We use complaint anchoring to see what they structurally cannot, not to out-rule them |
| Statistical sophistication of spatiotemporal models | Predictive policing research | We deliberately choose explainable tree models over marginal accuracy from opaque ones |
| General-purpose analytical flexibility | Graph platforms | We trade flexibility for a two-click workflow, on purpose |
| Production security and governance maturity | All of the above | Acknowledged as a prototype gap; V1 scope in `ROADMAP.md` |

---

## 8. Barriers and Defensibility

| Barrier | Strength | Note |
|---|---|---|
| Data access | High | Whoever holds complaint + transaction join rights holds the position |
| Domain workflow design | Medium | Copyable, but requires the domain understanding to get right |
| Model | Low–Medium | Techniques are standard; the *labelled outcome data* from a real deployment would be the durable asset |
| Trust and adoption | High | An enforcement tool succeeds on officer trust, which is slow to build and easy to lose |

The genuinely defensible asset is the outcome feedback loop planned for V2: once the system records whether a withdrawal actually occurred in the predicted cell and window, it accumulates labelled data that no one else has. Everything before that is replicable engineering.

---

## 9. Risks From the Competitive Position

| Risk | Consequence | Mitigation |
|---|---|---|
| Being perceived as a predictive-policing derivative | Ethical objection at evaluation | Lead with the object-of-prediction distinction; make guardrails visible in the product |
| Being perceived as duplicating existing complaint infrastructure | "Why not just add this to the existing portal?" | Correct answer: that is exactly the deployment path. Say so, and show the adapter boundary |
| Overclaiming novelty | Loss of credibility with a technical evaluator | Techniques are standard and are documented as standard; the contribution is the join, the workflow and the explainability |
