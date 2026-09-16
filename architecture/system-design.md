# SYSTEM DESIGN — CyberPulse AI

| Field | Value |
|---|---|
| Version | 1.0 |
| Scope | The whole system: components, responsibilities, boundaries, contracts, data flow, failure behaviour |
| Related | `architecture/high-level-architecture.md`, `architecture/low-level-design.md`, `architecture/architecture-decisions.md` |

---

## 1. Design Objectives

The architecture is shaped by five forces, in priority order.

1. **Integrity of the prediction path.** The single most damaging failure mode is a UI value that disagrees with what the model produced. Everything else — deployment topology, caching, service boundaries — is subordinate to keeping one authoritative source for every displayed number.
2. **Explainability as a data path, not a feature.** SHAP output must be produced, persisted, transported and rendered with the same rigour as the score itself. It cannot be a best-effort side channel.
3. **Demonstrability under adverse conditions.** The system must behave correctly, and visibly correctly, when a dependency is cold, slow or absent.
4. **Reproducibility.** A given seed and a given model version must produce the same outputs on any machine.
5. **Simplicity proportionate to scale.** Two deployable services, one database. No message bus, no cache tier, no microservice decomposition — none of it is justified at prototype scale, and each would add a failure mode during a live demonstration.

---

## 2. Component Model

```
┌───────────────────────────────────────────────────────────────────────────────┐
│                              BROWSER (Chrome/Edge)                            │
│  React 19 · Server + Client Components · TanStack Query · MapLibre · ReactFlow│
└───────────────────────────────────┬───────────────────────────────────────────┘
                                    │ HTTPS
┌───────────────────────────────────▼───────────────────────────────────────────┐
│                        NEXT.JS APPLICATION (Vercel / Node)                    │
│                                                                               │
│  ┌─────────────────────────┐        ┌────────────────────────────────────┐    │
│  │  UI LAYER               │        │  ROUTE HANDLERS (/app/api/**)      │    │
│  │  app/(dashboard)/**     │        │  · Zod validation                  │    │
│  │  components/**          │───────▶│  · role resolution + authorisation │    │
│  │  Server Components      │        │  · typed error envelope            │    │
│  │  read via services      │        │  · rate limiting                   │    │
│  └─────────────────────────┘        └───────────────┬────────────────────┘    │
│                                                     │                          │
│  ┌──────────────────────────────────────────────────▼────────────────────┐    │
│  │  SERVICE LAYER  (apps/web/services/**)                                │    │
│  │  complaintService · transactionService · predictionService            │    │
│  │  hotspotService · alertService · investigationService · reportService │    │
│  │  auditService · settingsService                                        │    │
│  │  — the ONLY place that composes DB access and ML calls —              │    │
│  └───────────────┬───────────────────────────────┬───────────────────────┘    │
│                  │                               │                            │
│  ┌───────────────▼──────────────┐   ┌────────────▼──────────────────────┐     │
│  │  DATA ACCESS (packages/db)   │   │  ML CLIENT (services/mlClient.ts) │     │
│  │  Drizzle schema + queries    │   │  typed fetch, 8s timeout, retry   │     │
│  └───────────────┬──────────────┘   └────────────┬──────────────────────┘     │
└──────────────────┼──────────────────────────────┼─────────────────────────────┘
                   │ postgres wire                 │ HTTPS/JSON
┌──────────────────▼──────────────┐   ┌────────────▼──────────────────────────┐
│   NEON POSTGRESQL               │   │   ML SERVICE (FastAPI, Docker)        │
│   13 tables + analytics_events  │   │   ┌─────────────────────────────────┐ │
│   H3 index columns              │   │   │ features.py  (shared train/serve)│ │
│   drizzle-kit migrations        │   │   ├─────────────────────────────────┤ │
└─────────────────────────────────┘   │   │ risk_model.joblib   (XGBoost)   │ │
                                      │   │ temporal_model.joblib           │ │
┌─────────────────────────────────┐   │   │ hotspot_engine (H3+DBSCAN+KDE)  │ │
│   BUILD-TIME PIPELINE           │   │   │ shap.TreeExplainer              │ │
│   generate-data → signal_check  │──▶│   └─────────────────────────────────┘ │
│   → pii_scan → seed → train     │   │   /predict /hotspots /health /metrics │
│   → evaluate → model_metrics    │   └───────────────────────────────────────┘
└─────────────────────────────────┘
```

---

## 3. Component Responsibilities

| Component | Owns | Must not |
|---|---|---|
| UI layer | Presentation, interaction, state display | Contain SQL, call the ML service directly, compute a displayed figure the API did not return |
| Route handlers | HTTP concerns: validation, authorisation, status codes, rate limits, error envelope | Contain business logic or SQL |
| Service layer | Business rules, orchestration, transactions, audit writes | Know about HTTP, know about React |
| Data access | Schema, typed queries, migrations | Contain business rules |
| ML client | Transport to the ML service, timeout, retry, typed mapping | Interpret or transform prediction semantics |
| ML service | Feature engineering, inference, ranking, explanation | Read or write the application database |
| Build pipeline | Data generation, validation, seeding, training, evaluation | Run at request time |

**The strictest boundary is the last one.** The ML service has no database credentials. It receives everything it needs in the request body and returns everything it produces in the response. This makes it independently deployable, independently testable, and incapable of producing a state change that the web application did not author.

---

## 4. The Prediction Path in Detail

This is the path that matters most, so it is specified step by step.

```
1. Browser              POST /api/predict { complaintId: "C-10284" }
2. Route handler        Zod validate → resolve role → authorise (LEA|ADMIN) → rate limit
3. predictionService    Load complaint, chain transactions, linked accounts, withdrawals
4. predictionService    Generate candidate H3 cells (from hotspotService)
5. mlClient             POST {ML_SERVICE_URL}/predict with the full payload
6. ML service           features.py builds one vector per candidate cell
7. ML service           risk_model scores every candidate
8. ML service           hotspot_engine blends model score with the combined-score terms
9. ML service           temporal_model predicts the 2-hour bin for the top candidate
10. ML service          TreeExplainer computes SHAP for the top candidate
11. ML service          Aggregate raw features → named factors → normalise to 100%
12. ML service          Respond with score, level, confidence, rankedHotspots, window, factors
13. predictionService   BEGIN TRANSACTION
14. predictionService     INSERT predictions
15. predictionService     INSERT risk_factors (n rows)
16. predictionService   COMMIT
17. Route handler       Return the persisted representation
18. Browser             Render from the response; announce via live region
```

**Two invariants of this path.**

*Invariant 1 — the response is the persisted row.* Step 17 returns what step 14–15 wrote, not what step 12 returned. If the write altered anything (rounding on a numeric column, a server-assigned ID), the client sees the stored truth. This is what makes NFR-26 testable.

*Invariant 2 — partial success is impossible.* Steps 14 and 15 are one transaction. A prediction never exists without its factors, so no screen can ever render a score whose explanation is missing for a reason other than an explicit `explanationAvailable: false`.

### 4.1 Timing budget

| Step | Budget (p95) |
|---|---|
| 2 — validation and authorisation | 5 ms |
| 3–4 — data assembly and candidate generation | 120 ms |
| 5–12 — ML service round trip | 400 ms |
| 13–16 — persistence | 60 ms |
| 17–18 — serialisation and render | 200 ms |
| Network and overhead | 200 ms |
| **Total** | **≤ 1000 ms**, against an NFR-02 budget of 1500 ms |

The 500 ms headroom is deliberate: it absorbs a cold connection or a slow first query without breaching the requirement.

---

## 5. Failure Model

Every dependency failure has a defined, tested behaviour. There is no "undefined" row in this table, which is the point of having it.

| Failure | Detection | System behaviour | User-visible result | Test |
|---|---|---|---|---|
| ML service down | Connection refused | 503 from `/api/predict`; health reports `mlService.status = down` | Degraded panel, no numbers, retry | TC-INT-020 |
| ML service cold | Latency > warm baseline | Request proceeds; health reports `degraded` during the documented warm-up | Progress indication; result renders normally | TC-PERF-007 |
| ML timeout | 8 s elapsed | Abort, typed `TIMEOUT` error | Timeout message with retry | TC-INT-022 |
| Model artefact missing | Startup load fails | Service `/health` unhealthy; `/predict` returns 503 | Degraded panel | TC-ML-014 |
| Feature schema mismatch | Assertion before inference | 500 with typed code; full detail logged server-side | Generic error with retry | TC-UNIT-015 |
| SHAP failure | Exception in explainer | Prediction returns with `factors: []`, `explanationAvailable: false` | Score shown; explanation states it could not be generated | TC-ML-045 |
| Database unreachable | Connection error | Retry with backoff; health reports `degraded` | Retryable error banner; prior data retained | TC-INT-021 |
| Prediction persist failure | Transaction abort | Roll back; nothing written | Error with retry; no phantom prediction | TC-E2E-003 |
| Audit write failure | Transaction abort | Roll back the whole alert dispatch | Alert not sent; error shown | TC-SEC-030 |
| Tile provider unreachable | Tile load error | Fall back to bundled India GeoJSON | Notice; data layers still render | TC-UI-036 |
| WebGL unavailable | Capability check | Accessible table becomes primary | Explanatory message | TC-A11Y-010 |
| Rate limit exceeded | Counter | 429 with `Retry-After` | Countdown message, modal retained | TC-SEC-031 |
| Graph traversal over budget | Elapsed check in the CTE loop | Return partial graph, `truncated: true` | Truncation notice with the true count | TC-PERF-005 |

---

## 6. Consistency and Transaction Boundaries

| Operation | Boundary | Rationale |
|---|---|---|
| Prediction persist | `predictions` + `risk_factors` in one transaction | A score without its explanation is not a valid product output |
| Alert dispatch | `alerts` + `audit_events` (+ `investigations` upsert) in one transaction | An unaudited privileged action must not exist |
| Investigation status change | `investigations` + `audit_events` in one transaction | Same |
| Note addition | `investigation_notes` only | Notes are not privileged; status is unchanged |
| Demo reset | Scoped delete of `origin = 'demo'` rows in one transaction | All-or-nothing so a partial reset cannot leave a confusing state |
| Seeding | Truncate and insert in dependency order, one transaction | Idempotency |

Concurrency control is optimistic. `investigations` carries `updated_at`; a `PATCH` supplies the value it read and receives 409 if it no longer matches. There is no pessimistic locking anywhere, because there is no operation whose contention justifies it.

---

## 7. Caching

Deliberately minimal.

| Data | Strategy | Reason |
|---|---|---|
| Complaint/transaction lists | TanStack Query, 30 s stale time, no persistence | Cheap to refetch; staleness is visible and harmless |
| Predictions | Never cached client-side beyond the query cache | A cached prediction is the most dangerous stale value in the system |
| Hotspot list for the map | 60 s stale time | Aggregates change slowly |
| ATM data | Session-lifetime cache, viewport-scoped | Static within a session |
| Model artefacts | Loaded once at ML service start | Per-request load would breach the latency budget |
| Reports aggregates | 5 min server-side memo keyed by filter hash | Expensive, tolerant of staleness |

**No Redis, no CDN caching of API responses, no service worker.** Each would add a way for the UI to show something the database does not say.

---

## 8. Security Architecture Summary

Full treatment in `architecture/security-architecture.md` and `security/threat-model.md`.

- Trust boundaries: browser ↔ Next.js (untrusted input), Next.js ↔ database (parameterised only), Next.js ↔ ML service (validated payload, no credentials shared, network-restricted in deployment).
- Authorisation is evaluated in the service layer against the resolved role, and object-level scope failures return 404 rather than 403 (see `product/user-flows.md` UF-06).
- The ML service is not publicly reachable in the deployed topology; only the Next.js runtime may call it.
- Audit events are transactional with the actions they describe.
- The prototype role switch is explicitly documented as **not a security control**.

---

## 9. Observability

| Signal | Implementation |
|---|---|
| Structured logs | JSON lines with `requestId`, `route`, `role`, `durationMs`, `outcome`; no personal data, no request bodies |
| Request correlation | `x-request-id` generated at the edge, propagated to the ML service, returned in the response header |
| Health | `/api/health` composes web, database and ML sub-checks with per-component latency |
| ML metrics | `/metrics` on the ML service reports model version, artefact load time, inference latency histogram |
| Analytics events | Append-only, role-scoped, no identity (see `product/product-analytics.md`) |
| Error tracking | Server-side capture with a hashed component stack; no user content |

---

## 10. Deliberate Non-Choices

Recording what was rejected is as useful as recording what was chosen.

| Not used | Why not |
|---|---|
| Kafka / message bus | The prototype's "stream" is a UI simulation. A real bus adds a live failure mode for zero demonstrated value. Revisit at V2 (`ROADMAP.md`). |
| Redis | Nothing in the workload needs it; it would introduce a cache-coherence path for prediction values. |
| Microservice decomposition | Two services is already one more than strictly necessary; the ML split is justified only by the Python runtime requirement. |
| GraphQL | The client's data needs are known and stable; typed REST with shared Zod schemas is simpler and gives better route-level authorisation. |
| Server-Sent Events / WebSockets | No genuine server-push requirement in v1.0; the simulation is client-driven. |
| PostGIS as a hard dependency | May be unavailable on the target tier; H3 index columns plus Turf.js cover every required operation (ASM-07). |
| An ORM with lazy loading | Hidden N+1 queries are the standard way a list endpoint quietly breaches a latency budget. |
| Client-side model inference | Would make the served model unverifiable and duplicate the feature code, reintroducing train/serve skew. |
