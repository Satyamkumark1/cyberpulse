# PRICING STRATEGY — CyberPulse AI

```text
Not Applicable as conventionally understood
Reason: There is no customer and no revenue model (see business/revenue-model.md).
This document instead specifies the COST TO DEPLOY AND SUSTAIN, which is the
figure a funding decision would actually need.
```

---

## 1. Prototype Cost

| Component | Tier | Monthly | Constraint that bites |
|---|---|---|---|
| Web (Vercel) | Hobby | ₹0 | Build minutes |
| ML service | Free | ₹0 | **Spins down after ~15 min — cold start** |
| Database (Neon) | Free | ₹0 | Compute hours, connections, branch count |
| Tiles, CI, registry | Free | ₹0 | Rate limits |
| **Total** | | **₹0** | |

### The one recommendation

**An always-on ML instance at roughly ₹600 per month eliminates the highest-severity operational risk in the project** (RSK-02, severity 20). Every other cold-start mitigation — keep-warm jobs, uptime probes, warm-up pings, rehearsal runs — is a workaround for not spending it.

It is the only cost decision in this project with a materially asymmetric payoff, and it is stated as a recommendation rather than buried in a table for that reason.

---

## 2. Cost Drivers at Scale

The shape of this cost curve is unusual and worth understanding before a scaling decision.

| Driver | Scales with | Growth |
|---|---|---|
| Inference compute | **Concurrent** predictions, not total | Flat per prediction; step-wise per replica |
| Database compute | Transaction volume | Linear, then step-wise at partitioning |
| Database storage | Corpus size plus audit and analytics retention | Linear |
| Web hosting | Concurrent users | Linear |
| Integration engineering | Number of adapters | **Dominant** — bespoke and authorisation-gated |
| Governance | Fixed per deployment plus periodic | Step-wise |

**Inference cost is flat per prediction** because the model is self-hosted, CPU-bound and has no per-token charge. A generative architecture would have made inference the dominant and fastest-growing line. That was chosen for accuracy and explainability (ADR-010, ADR-011); the cost shape is a consequence rather than the motivation.

**The two costs that actually dominate a real deployment are organisational**: integration engineering and governance. Both are invisible in a hackathon estimate and both exceed the infrastructure bill by a wide margin.

---

## 3. Illustrative Scaling

Infrastructure only. Deliberately excludes integration and governance, which would dominate and which cannot be estimated without knowing the counterparties.

| Scale | Users | Web | ML | Database | Monthly |
|---|:--:|---|---|---|---|
| Prototype | 20 | Free | Free | Free | ₹0 |
| Pilot — one district | 50 | Small paid | 1 always-on | Paid compute | ~₹4,000 |
| One state | 500 | Multi-instance | 3 replicas | Partitioned + replica | ~₹35,000 |
| National | — | — | — | — | Requires a real capacity study |

The last row is left blank deliberately. Producing a national figure from a prototype's measurements would be exactly the kind of overclaim this project refuses elsewhere.

---

## 4. Cost Controls Built In

These are implemented and tested, not aspirational.

| Control | Bounds |
|---|---|
| Rate limit 20 predictions/min/role | ML compute per caller |
| Candidate cap at 60 | Per-prediction cost |
| SHAP on the top cell only | ~17× saving versus explaining all candidates |
| `pageSize` max 100 | Query cost |
| Report range capped at 365 days | Aggregate cost |
| Traversal: depth ≤ 6, ≤ 500 rows, time budget | The most expensive query |
| Bbox-scoped ATM queries | Prevents full-corpus fetches |
| Report memoisation, 5 minutes | Repeated aggregate cost |
| Bundle budgets per route | Bandwidth |

The SHAP decision is the largest single cost lever in the system: explaining all sixty candidates would cost roughly 4.2 seconds per prediction instead of 70 milliseconds, for information nobody reads.

---

## 5. What Is Deliberately Not Optimised

| Not optimised | Why |
|---|---|
| Prediction caching | The most dangerous stale value in the system. Recomputing is nearly free; being wrong is not. |
| Model size | 40 MB is already trivial |
| Training cost | Minutes, run rarely |
| Batch pre-scoring | Would reduce latency but inverts the freshness model |

The first row is the one that looks like an obvious saving and is not. A cached prediction would save almost nothing — marginal inference cost is already near zero — while creating a path by which a user sees a figure computed from inputs that have since changed.

---

## 6. If Procurement Ever Happened

Not applicable to this project, and recorded only so the boundary is explicit: any procurement would need to satisfy the three objections in `business/revenue-model.md` §1 — incentive alignment, data sovereignty, and the absence of a legitimate customer. At least the first two have no obvious answer, which is why the ownership model in `business/business-model.md` §4 assumes state-built and state-operated.
