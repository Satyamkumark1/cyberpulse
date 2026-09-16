# SCALABILITY — CyberPulse AI

| Field | Value |
|---|---|
| Version | 1.0 |
| Honest framing | This is a prototype designed for a specific, small envelope. This document states that envelope, identifies exactly where it breaks, and specifies the change that would lift each limit. It does **not** claim national-scale readiness. |

---

## 1. Designed Envelope

| Dimension | v1.0 target | Basis |
|---|---|---|
| Concurrent users | 20 | Demonstration and small-unit use |
| Complaints | 500 | Seed corpus |
| Accounts | 12,000 | Seed corpus |
| Transactions | 60,000 | Seed corpus |
| Withdrawals | 2,400 | Seed corpus |
| ATMs | 520 | Seed corpus |
| Predictions per minute | 20 per role (rate limited) | NFR-02 headroom |
| Alerts per minute | 10 per role | FR-14.5 |
| Regions | 1 | Single deployment |
| Tenants | 1 | No state partitioning |

---

## 2. Where It Breaks First

Ordered by how soon each is reached, with the observable symptom.

| # | Limit | Reached at | Symptom | Remedy |
|---|---|---|---|---|
| L1 | ML service cold start on a free tier | Idle > ~15 min | First prediction takes 5–20 s | Warm-up ping on app load and `/demo` mount (built); paid always-on instance (deployment change) |
| L2 | Synchronous prediction call | ~30 concurrent predictions | Request queueing; p95 breaches 1500 ms | Job queue with polling, or horizontal ML replicas behind a load balancer |
| L3 | Recursive CTE traversal | ~10⁶ transactions or dense fan-out | Graph endpoint approaches its time budget; `truncated: true` becomes common | Materialised edge table refreshed on write, or a dedicated graph store |
| L4 | Application-side spatial maths | ~10⁵ ATMs, or continuous bbox queries | Map queries dominate database time | PostGIS with GiST indexes; `atms` gains a `geography` column |
| L5 | Single Postgres instance | ~10⁷ transactions | Write contention on `transactions`; index maintenance cost | Monthly partitioning on `transactions.timestamp`; read replicas for reports |
| L6 | Report aggregates computed live | ~10⁶ complaints | `/api/reports/summary` exceeds its budget | Materialised views refreshed on a schedule |
| L7 | `analytics_events` and `audit_events` unbounded | Months of real use | Table bloat; slow audit queries | Retention policy plus partitioning; archive to cold storage |
| L8 | Single tenant | First multi-state deployment | Cross-state data visibility — a correctness and legal problem, not a performance one | Row-level security keyed on state; separate connection roles |
| L9 | Model trained on one national corpus | Regional behaviour divergence | Accuracy varies by state | Per-region calibration, or a region feature with sufficient per-region volume |

**L8 is the one that matters most and is not a performance issue at all.** It is listed here because it is the limit that would block any real deployment regardless of load, and it is V1 scope in `ROADMAP.md`.

---

## 3. Scaling Dimensions

### 3.1 Read scaling

The read path is already the cheap one: server components query directly, indexes cover every user-facing predicate (`architecture/database-design.md` §5), and pagination is mandatory with a hard `pageSize` cap of 100. Scaling reads is a matter of adding replicas and routing report queries to them — no application change beyond a second connection string.

### 3.2 Write scaling

Writes are low-volume by nature: predictions, alerts, investigations, notes and events. The one write that could become hot is `analytics_events`, which is append-only and batchable. Nothing in the write path holds a lock longer than a single short transaction.

### 3.3 Prediction scaling

This is the real constraint. The current design calls the ML service synchronously inside the request. At 20 concurrent predictions with a 400 ms inference, a single ML replica saturates.

Three escalating options, in the order they should be adopted:

1. **Horizontal ML replicas** behind a load balancer. Stateless service, artefacts baked into the image — this is a deployment change with no code change, and it covers roughly a 10× increase.
2. **Asynchronous prediction**: `POST /api/predict` returns 202 with a `predictionRef`, the client polls or subscribes. This is a genuine UX change (the officer no longer waits inline) and should not be adopted before it is necessary, because inline delivery is part of what makes the product feel usable.
3. **Batch pre-scoring**: predict for every open complaint on a schedule, serve from cache, and reserve on-demand prediction for explicit re-analysis. This inverts the freshness model and is only appropriate at very large scale.

### 3.4 Spatial scaling

H3 indexing was chosen partly for this: hotspot aggregation is `GROUP BY h3_index`, which scales as a plain B-tree grouping. The application-side Haversine and k-ring maths is the part that does not scale, and PostGIS is the documented remedy (ASM-07 records that PostGIS was avoided as a *hard dependency*, not rejected).

---

## 4. Streaming Path (V2)

The prototype simulates a live stream in the UI. A real one would look like this:

```
Complaint feed ──┐
                 ├──▶ Kafka ──▶ Stream processor ──▶ Feature store ──▶ Scoring service
Transaction feed─┘                    │                                      │
                                      ▼                                      ▼
                              Canonical tables                        predictions (upsert)
```

Adopting it would require: an online feature store so streaming and batch features agree (otherwise train/serve skew returns through a new door); idempotent processing keyed on source reference; re-scoring semantics — a prediction that updates as money moves is a different product behaviour and needs its own UX; and back-pressure handling so a feed spike cannot starve interactive prediction.

The reason this is V2 and not v1.0 is stated in `architecture/system-design.md` §10: a message bus adds a live failure mode during a demonstration in exchange for capability the prototype does not need.

---

## 5. Cost Envelope

| Component | v1.0 | At 10× | At 100× |
|---|---|---|---|
| Web hosting | Free tier | Small paid tier | Multi-instance |
| Database | Neon free tier | Paid compute + storage | Partitioned, replicas |
| ML service | Free tier, cold starts | Always-on small instance | 3+ replicas behind a balancer |
| Tiles | Public tiles | Same | Self-hosted tile server |

Cost is not a v1.0 constraint, but it is the reason cold starts exist, and cold starts are the single most likely thing to go wrong during a live evaluation. That is why the warm-up ping is a requirement (FR-18.3) rather than an optimisation.

---

## 6. What Would Be Rebuilt Rather Than Scaled

Honesty about this is more useful than pretending the prototype is a seed for production.

| Component | Verdict | Why |
|---|---|---|
| Synthetic generator | Retained, repurposed | Becomes the test-data adapter and the CI fixture source |
| Feature engineering | Retained | The module is the contract; it would gain features, not change shape |
| Models | Retrained, not rebuilt | Same family, real labels, per-region calibration |
| Explainability layer | Retained | The design is already production-shaped |
| Data model | Extended | Needs source provenance, partitioning, RLS |
| Role concept | **Rebuilt** | The prototype switch is not a security control and cannot become one |
| Alert delivery | **Rebuilt** | Persisted intelligence is not delivery |
| Graph traversal | **Rebuilt** at scale | The CTE is correct and bounded, but it is not a graph engine |
| Demo mode | Removed | It exists for evaluation |

---

## 7. Scalability Test Plan

| Test | Tool | Scenario | Pass condition |
|---|---|---|---|
| TC-PERF-020 | k6 | 20 concurrent users browsing lists for 5 min | p95 read latency ≤ 300 ms, 0 errors |
| TC-PERF-021 | k6 | 20 concurrent predictions | p95 ≤ 1500 ms warm, 0 fabricated results, 429s only above the rate limit |
| TC-PERF-022 | k6 | Sustained 5 rps mixed load for 15 min | No latency drift above 20%, no connection exhaustion |
| TC-PERF-023 | Script | Graph traversal against a synthetic 10× transaction corpus | Returns within budget or correctly reports `truncated: true` |
| TC-PERF-024 | Script | Reports with a 365-day range over a 10× corpus | Completes within budget or the documented cap engages |

These are load characterisation tests. They establish where the prototype's envelope actually sits rather than asserting it.
