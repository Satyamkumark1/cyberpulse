# REVENUE MODEL — CyberPulse AI

```text
Not Applicable
Reason: CyberPulse AI is a public-safety capability addressing a gap in a
national law-enforcement workflow. It has no customers, no pricing, and no
route to revenue that would be appropriate to the use case. Attaching a
commercial incentive to cash-out forecasting would create exactly the wrong
incentives.
```

Retained rather than omitted, because *why* there is no revenue model is a real design position.

---

## 1. Why Not

Three reasons, in descending order of importance.

**Incentive misalignment.** A vendor paid per prediction, per alert or per seat has an interest in more predictions, more alerts and more seats. An enforcement tool should optimise for fewer, better-targeted field deployments. The product's own metric design already refuses to count alerts generated as a success measure (`product/success-metrics.md` §6) for the same reason; a revenue model that counted them would undo that.

**Data sovereignty.** Any commercial model implies a vendor with access to, or leverage over, case data. `business/business-model.md` §4 rejects vendor-operated SaaS on this basis.

**No customer exists.** The users are officers, bank nodal officers and a coordination centre. None of them is a buyer; the state is the funder, and state funding is a budget line, not revenue.

---

## 2. What Replaces It

| Conventional | Here |
|---|---|
| Revenue | State funding as a budget line |
| Customers | Users within the enforcement apparatus |
| Pricing | Cost to deploy and sustain (`business/pricing-strategy.md`) |
| Growth | Coverage — states, districts, institutions connected |
| Retention | Sustained officer trust and continued use |
| Unit economics | Cost per analysed complaint, against recovery outcomes |
| Profitability | Public value: funds intercepted, cases progressed |

The closest thing to a unit economic worth tracking would be **cost per analysed complaint against recovery outcome** — and it cannot be computed without the outcome capture that V2 would introduce. Until then, any figure would be invented.

---

## 3. Models Considered and Rejected

| Model | Why rejected |
|---|---|
| Per-prediction pricing | Directly incentivises over-prediction |
| Per-seat licensing | Discourages the breadth of access the capability needs |
| Per-alert pricing | Incentivises alert volume — the exact failure mode `product/success-metrics.md` §6 guards against |
| Outcome-based (share of recovered funds) | Creates a financial interest in specific enforcement outcomes. Inappropriate. |
| Freemium with paid analytics | Gates the explainability that makes the tool safe to use |
| Data monetisation | Unthinkable for case data |

The fourth row deserves emphasis because it is superficially attractive — aligning payment with recovery sounds like good incentive design. It is not: it gives a private party a stake in whether a particular person's funds are seized, which is a line no commercial arrangement should cross.

---

## 4. If a Commercial Variant Were Ever Built

A defensible commercial adjacency exists, and it is worth naming so the boundary is clear.

The **methodology** — the deterministic synthetic generator, the evaluation framework, the explainability aggregation, the integrity-testing approach — contains no sensitive material and generalises beyond this domain. That could be published, open-sourced or offered as consulting without touching case data or enforcement outcomes.

The **deployment** could not. Any commercial arrangement around a live enforcement system would need to satisfy the three objections in §1, and at least the first two have no obvious answer.

---

## 5. What Success Looks Like Without Revenue

| Horizon | Success |
|---|---|
| Hackathon | Evaluators understand the value chain in under three minutes and find the limitations honestly stated |
| Pilot | One district cyber cell uses it on real complaints and reports that it changed a deployment decision |
| Deployment | Measurable improvement in recovery rate attributable to earlier intervention |
| Sustained | Outcome capture running, model improving on real labels, bias evaluation complete |

The pilot row is the one that matters most and is the hardest to reach, because it requires lawful data access this project does not have and cannot claim.
