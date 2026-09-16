# BUSINESS MODEL — CyberPulse AI

| Field | Value |
|---|---|
| Version | 1.0 |
| Framing | CyberPulse AI is a **public-safety capability**, not a commercial product. "Business model" here means how such a capability would be funded, owned and sustained — not how it would be monetised. |

---

## 1. What Kind of Thing This Is

The instinct with a documentation template is to describe a SaaS business. That would be a fabrication here, and fabrication is the one thing this project is built to avoid.

CyberPulse AI addresses a gap in a national law-enforcement workflow. Its users are police officers, bank nodal officers and a coordination centre. Its output informs enforcement decisions. It has no customers in the commercial sense and no route to one that would be appropriate — a private vendor charging per prediction for cash-out forecasting would create incentives nobody should want.

The honest model is **public infrastructure**: funded by the state, owned by the nodal body, operated within the existing enforcement stack, and evaluated on outcomes rather than revenue.

---

## 2. Value Created

| Stakeholder | Value | Measurable as |
|---|---|---|
| Victim | Higher probability that funds are intercepted before cash-out | Recovery rate |
| Investigating officer | A defensible answer to "where and when", in seconds rather than days | Time to first action; disposal rate |
| Bank | Structured, prioritised requests instead of heterogeneous free text | Response turnaround; institutional exposure |
| Coordination centre | Cross-state pattern visibility | Advisories issued on evidence |
| State | Reduced financial-crime losses; better resource allocation | Aggregate recovery; field-deployment efficiency |

The value is concentrated in one place: **the interval between complaint registration and cash-out.** Everything else in the enforcement chain already has an owner. That interval does not, and that is the whole proposition.

---

## 3. Cost Structure

### Prototype (now)

| Item | Monthly |
|---|---|
| Hosting, database, CI, registry | ₹0 (free tiers) |
| Recommended always-on ML instance | ~₹600 |
| **Total** | **₹0–600** |

### Hypothetical deployment (illustrative, not a quotation)

| Item | Driver |
|---|---|
| Compute | Scales with concurrent users, not total predictions — inference is CPU-bound and self-hosted |
| Database | Scales with transaction volume; partitioning at ~10⁷ rows |
| Integration engineering | The dominant cost — each adapter is bespoke and requires authorisation |
| Governance | DPIA, security assessment, audit retention, bias evaluation |
| Training and doctrine | Officers must be trained not to over-rely on the output |

The notable feature of the cost curve: **inference cost stays flat as usage grows**, because there is no per-token or per-call charge. A generative architecture would have inverted this, with the dominant cost scaling linearly with every prediction. That was an accuracy and explainability decision first, but it has this consequence.

The two costs that actually dominate — integration and governance — are both organisational rather than technical, which is typical for public-sector capability and atypical for a hackathon estimate.

---

## 4. Ownership Model

| Option | Assessment |
|---|---|
| Vendor-operated SaaS | **Rejected.** Case data leaving the state's control, and a commercial incentive attached to enforcement output. |
| Vendor-built, state-operated | Plausible. The state owns the deployment, data and model; a vendor delivers and maintains. |
| State-built and state-operated | Most appropriate for a capability of this sensitivity, and the assumption this blueprint is written under. |
| Open-source reference implementation | Complementary — the methodology and the synthetic generator could be published without any real-data component. |

The last row is worth noting as a genuine option: the parts of this project with the widest applicability — the deterministic generator, the evaluation framework, the explainability aggregation — contain no sensitive material and could be shared.

---

## 5. Sustainability

A predictive system is not a one-time build. Three ongoing obligations determine whether it stays useful:

**Outcome capture.** Without recording whether a withdrawal actually occurred in the predicted cell and window, the model cannot improve beyond its synthetic origin. This is the single highest-value ongoing investment and is V2 scope.

**Revalidation.** Cash-out behaviour adapts. A model deployed and left alone degrades, and nothing in this prototype measures resistance to adversarial adaptation.

**Governance.** Bias evaluation, model cards, drift monitoring and periodic reassessment are recurring, not one-off.

A deployment that funds the build and not these three is a deployment that quietly stops working.

---

## 6. Defensibility

Recorded honestly, because the answer is uncomfortable for a pitch and correct for a plan.

| Asset | Durability |
|---|---|
| The model | **Low.** Standard techniques, publicly documented |
| The workflow design | **Medium.** Copyable, but requires domain understanding to get right |
| Data access | **High.** Whoever holds the complaint-plus-transaction join holds the position |
| Labelled outcome data | **Highest.** Accumulated only through deployment; no one else has it |
| Officer trust | **High.** Slow to build, easy to lose |

Everything before the fourth row is replicable engineering. The outcome feedback loop is the only durable asset, and it does not exist yet.

---

## 7. What This Section Deliberately Does Not Claim

- No revenue projection. There is no revenue model (see `business/revenue-model.md`).
- No market sizing. The addressable "market" is the Indian enforcement apparatus, and sizing it as a commercial opportunity would misrepresent what this is.
- No adoption forecast. Adoption of an enforcement tool depends on doctrine, training and institutional trust, none of which this team can forecast.
- No claim of endorsement, procurement interest or deployment intent. There is none.
