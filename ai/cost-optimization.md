# COST OPTIMIZATION — CyberPulse AI

| Field | Value |
|---|---|
| Version | 1.0 |
| Scope | Compute, hosting and operational cost of the prototype, and the cost model at scale |
| Note | There is **no per-token or per-inference API cost** in this system. No external model provider is used. This changes the shape of the cost problem entirely. |

---

## 1. The Cost Model Is Unusual Here

Most AI products manage a variable cost that scales with usage: tokens, API calls, GPU-seconds. CyberPulse AI has none of that. Inference runs on a self-hosted CPU container against a ~40 MB tree ensemble, and a prediction costs roughly 400 milliseconds of one CPU core.

The consequence is that **cost optimisation here is capacity planning, not spend management**. The question is not "how do we reduce the bill per prediction" but "how many predictions fit in the instance we are paying for".

| Cost driver | Typical AI product | CyberPulse AI |
|---|---|---|
| Model inference | Per-token API charge | Amortised container cost |
| Scaling trigger | Request volume | Concurrent requests, not total |
| Marginal cost per prediction | Meaningful | Effectively zero |
| Dominant cost | Model provider | Always-on hosting |
| Optimisation lever | Prompt length, caching, model tier | Instance sizing, cold-start avoidance |

---

## 2. Prototype Cost Envelope

| Component | Tier | Monthly cost | Constraint that matters |
|---|---|---|---|
| Web (Vercel) | Hobby | ₹0 | Build minutes, bandwidth |
| ML service (Render/Railway/Fly) | Free | ₹0 | **Spins down when idle — cold start** |
| Database (Neon) | Free | ₹0 | Compute hours, connection limits, branch count |
| Map tiles | Public demo tiles | ₹0 | Rate limits, availability |
| **Total** | | **₹0** | |

The prototype runs at zero monetary cost, and that fact creates the project's single largest operational risk.

### 2.1 The cold-start problem is a cost problem

The free ML tier spins down after roughly fifteen minutes of inactivity. A cold start takes five to twenty seconds. During a three-minute judge evaluation, that is the difference between a working demonstration and a failed one (RSK-02).

This is a cost decision presented honestly: the project chose ₹0 hosting and paid for it in cold-start risk, then mitigated the risk in software rather than with money.

| Mitigation | Cost | Effectiveness |
|---|---|---|
| Warm-up ping on app load and `/demo` mount (FR-18.3) | ₹0 | Covers the common case |
| Uptime check polling `/api/health` every 60 s | ₹0 | Keeps the service warm continuously |
| Health reports `degraded`, not `down`, during warm-up | ₹0 | Turns a failure into visible progress |
| T−30 rehearsal run in the demo runbook | ₹0 | Covers evaluation day specifically |
| Local Docker stack as venue fallback | ₹0 | Covers total network failure |
| **Paid always-on instance** | **~₹600/month** | **Eliminates the risk entirely** |

The last row is the recommendation if any budget exists at all. Roughly ₹600 per month removes the highest-likelihood, highest-impact operational risk in the project. Every other mitigation is a workaround for not spending it.

---

## 3. Compute Cost Per Prediction

| Stage | CPU time | Notes |
|---|---|---|
| Feature building, 60 candidates | ~90 ms | Vectorised; the most expensive stage |
| Batch scoring, 60 rows | ~40 ms | Single `predict_proba` call |
| Combined ranking | ~15 ms | |
| Temporal classification | ~35 ms | |
| SHAP, top cell only | ~70 ms | As expensive as scoring all sixty |
| **Total** | **~250 ms** | ~400 ms p95 including serialisation |

Two design decisions follow directly from this profile and are the real cost optimisations in the system:

**SHAP on the top cell only.** Explaining all sixty candidates would cost roughly 4.2 seconds per prediction — a seventeen-fold increase — for information no user reads. This single decision is the difference between a viable and an unviable latency budget.

**Vectorised feature construction.** Building sixty vectors in a loop rather than one DataFrame operation measured roughly 4× slower in prototyping, which would have consumed the entire headroom against NFR-02.

---

## 4. Database Cost

Neon's free tier bills on compute hours and storage. The seed corpus is approximately 75,000 rows across sixteen tables — well within limits. Three practices keep it there:

| Practice | Effect |
|---|---|
| Server-side pagination with a hard cap of 100 | No query ever scans a full table for a UI request |
| Thirty-one justified indexes | Index scans rather than sequential scans on every user-facing predicate |
| Report aggregates memoised for 5 minutes | The most expensive queries run at most twelve times per hour |
| Per-PR Neon branches deleted on merge | Branch count stays within the tier limit |

The `analytics_events` table is the one that would grow unboundedly in real use. It is append-only with no retention policy, which is declared gap G-4 in `security/security-checklist.md` — recorded as a gap precisely because it is a future cost as well as a governance issue.

---

## 5. Cost at Scale

| Scale | Web | ML service | Database | Monthly estimate |
|---|---|---|---|---|
| Prototype (20 users) | Free | Free | Free | ₹0 |
| 10× (200 users, 1 district) | Small paid | 1 always-on instance | Paid compute | ~₹4,000 |
| 100× (1 state) | Multi-instance | 3 replicas behind a balancer | Partitioned + 1 replica | ~₹35,000 |
| National | Multi-region | Autoscaled pool | Partitioned, multi-replica | Requires a real capacity study |

Notably, the ML layer stays cheap as usage grows, because inference is CPU-bound and stateless — replicas are the whole scaling story. The cost that grows fastest is the database, driven by `transactions` volume and the analytics and audit tables.

A token-metered architecture would have inverted this: inference cost would dominate and grow linearly with every prediction. Choosing a self-hosted tree ensemble was an accuracy and explainability decision first, but it is also the reason the cost curve is flat in the dimension that matters.

---

## 6. Cost Controls

| Control | Purpose | Where |
|---|---|---|
| Rate limit, 20 predictions/min/role | Bounds ML compute per caller | `architecture/api-design.md` |
| Candidate cap of 60 | Bounds per-prediction cost | `ai/model-selection.md` §2.1 |
| SHAP on top cell only | Bounds explanation cost | `ai/ai-strategy.md` §7 |
| `pageSize` max 100 | Bounds query cost | API validation |
| Report range capped at 365 days | Bounds aggregate cost | API validation |
| Graph traversal: depth ≤ 6, ≤ 500 rows, time budget | Bounds the most expensive query | `architecture/database-design.md` §7 |
| Bundle budgets per route | Bounds bandwidth | CI gate |
| Bbox-scoped ATM queries | Prevents full-corpus fetches | `architecture/api-design.md` API-032 |

Every one of these is enforced in code and tested, not merely recommended.

---

## 7. What Is Deliberately Not Optimised

| Not optimised | Why |
|---|---|
| Prediction caching | A stale prediction is the most dangerous stale value in the system. Recomputing is cheap; being wrong is not. |
| Model size | 40 MB is already trivial; shrinking it would cost accuracy for no benefit |
| Training cost | Minutes on a laptop, run rarely |
| Batch pre-scoring of all open complaints | Would reduce latency but inverts the freshness model; only appropriate at very large scale (`architecture/scalability.md` §3.3) |
| Bandwidth beyond the bundle budgets | Not a constraint at this scale |

The first row is the important one. There is a real temptation to cache predictions — it would look like an obvious optimisation and it would save almost nothing, because the marginal cost of a prediction is already near zero. It would, however, create a path by which a user sees a number computed from inputs that have since changed. The cost-benefit is clear in one direction only.

---

## 8. Recommendation

If the project can spend anything at all, spend it on an always-on ML instance. Roughly ₹600 per month eliminates cold starts, which is simultaneously the largest demonstration risk, the largest user-experience risk, and the only cost decision in this document with a materially asymmetric payoff.
