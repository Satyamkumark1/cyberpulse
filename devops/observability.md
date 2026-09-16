# OBSERVABILITY — CyberPulse AI

| Field | Value |
|---|---|
| Version | 1.0 |
| Pillars | Structured logs · metrics · health · correlation. **No distributed tracing** — see §7. |
| Related | `engineering/logging-monitoring.md`, `devops/deployment-checklist.md` |

---

## 1. What Observability Has To Answer Here

Three questions, in priority order, because they are the three that get asked during an evaluation:

1. **Is the ML service up and is the model loaded?** Everything else is secondary — no model, no product.
2. **Which component is slow?** A 4-second prediction could be the database, the ML round trip, or serialisation, and the answer determines the response.
3. **What happened to request X?** An evaluator reads a request ID off an error screen and someone needs the full story in under a minute.

The design below is shaped around answering those three quickly rather than around collecting everything.

---

## 2. Health — the primary signal

```
GET /api/health
{
  "status": "healthy",
  "web":       { "status": "up", "latencyMs": 12 },
  "database":  { "status": "up", "latencyMs": 34 },
  "mlService": { "status": "up", "latencyMs": 118,
                 "modelVersion": "CyberPulse-Demo-v1", "modelLoaded": true },
  "checkedAt": "2026-09-15T05:15:00Z"
}
```

| Overall | Condition | Meaning |
|---|---|---|
| `healthy` | All three up | Normal |
| `degraded` | ML down or warming, or database retrying | Product partially usable; predictions may fail |
| `unhealthy` | Database down | Nothing works |

Three properties make this endpoint useful rather than decorative:

- **It never throws.** A failing component is reported. A health endpoint that 500s tells you only that something is wrong.
- **It distinguishes warming from down.** A cold ML service reports `degraded`, so the UI shows progress instead of failure and an operator does not chase a non-incident.
- **It reports `modelLoaded` explicitly.** A running service with a missing artefact is up by every network measure and completely useless; this is the bit that catches it.

Surfaced in the Settings panel, polled by an uptime check every 60 seconds, and — during evaluation — held open in a browser tab, which also keeps the ML service warm.

---

## 3. Logs

Structured JSON lines, correlated by `requestId`, carrying no content. Full schema and field rules in `engineering/logging-monitoring.md`.

```json
{"ts":"2026-09-15T05:10:22.481Z","level":"info","requestId":"req_01J8Z9…",
 "service":"web","route":"/api/predict","role":"LEA","status":201,
 "durationMs":947,"outcome":"success","modelVersion":"CyberPulse-Demo-v1"}
```

The deliberate absences matter as much as the fields: no complaint ID, no request body, no note text, no resolved path. Log access cannot become case-data access.

---

## 4. Metrics

### Application

`http_requests_total{route,status,role}` · `http_request_duration_ms{route}` · `prediction_total{risk_level,outcome}` · `prediction_duration_ms` · `alert_total{severity}` · `db_query_duration_ms{query}` · `rate_limit_total{route,role}`

### ML service — `GET /metrics`

`model_loaded` · `model_version_info` · `inference_duration_ms` · `feature_build_duration_ms` · `shap_duration_ms` · `inference_total{outcome}` · `artefact_load_duration_ms`

Splitting `feature_build_duration_ms` from `shap_duration_ms` is not incidental. Those two stages account for roughly two-thirds of inference time, and a regression in either is invisible in an aggregate latency number.

---

## 5. Correlation

```
Edge generates x-request-id
  → attached to the web logger's child context for the whole request
  → forwarded as a header to the ML service
  → logged on every ML line
  → returned in the response and in any error body
```

One ID joins the browser, the web runtime and the ML service. An evaluator quoting an ID from an error screen gets a complete story from one grep, without any of that detail ever having been on their screen.

---

## 6. Alerting

| Condition | Severity | Response |
|---|---|---|
| `model_loaded == 0` | Critical | Immediate — no predictions possible |
| Health `unhealthy` > 2 min | Critical | Immediate |
| Prediction error rate > 10% / 5 min | High | Investigate |
| `/api/predict` p95 > 3 s / 10 min | High | Check cold start, check replicas |
| Health `degraded` > 10 min | Medium | Investigate |
| Rate-limit hits > 50 / hour | Medium | Check for a misbehaving client |
| Explanation-failure rate > 5% | Medium | SHAP regression |
| Clustering-fallback rate > 20% | Medium | Data or parameter drift |
| Any 500 on a core route | Medium | Review by request ID |

The last two exist because they are the silent degradations. Explanations quietly failing, or clustering quietly falling back, both leave the product apparently working while removing the things that make it trustworthy — and neither shows up in a latency or error-rate panel.

**During an evaluation window, alerting is a person watching a health tab.** An alert routed to an inbox is not a control inside a three-minute demonstration.

---

## 7. No Distributed Tracing

There are two services and one synchronous hop between them. The `requestId` correlation gives the same answer a trace would, and the ML service already reports per-stage durations in `pipelineStages[]` on every prediction response — which is both the demo's progress indicator and the latency breakdown.

OpenTelemetry would add an SDK, a collector and a backend to observe a single span. At three or more services, or any asynchronous work, that trade reverses; it is recorded here so the decision is revisited rather than inherited.

---

## 8. Dashboards

| Dashboard | Panels | Audience |
|---|---|---|
| **Operational** | Health, request rate, error rate by route, p95 latency, ML inference p95, `model_loaded` | Anyone on call |
| **Product** | Predictions per hour, risk-level mix, alerts dispatched, acknowledgement rate, demo completions | Team |
| **Model** | Inference latency distribution, feature-build vs SHAP split, explanation-failure rate, clustering-fallback rate | Whoever owns the model |

---

## 9. Debugging Runbook

| Symptom | First check | Then |
|---|---|---|
| Predictions failing | `/api/health` → `mlService` | `model_loaded`; artefact present in the image |
| Predictions slow | `inference_duration_ms` vs total `durationMs` | If inference is fast, the gap is data assembly or cold start |
| Map blank | Browser console for tile errors | Confirm the bundled-outline fallback engaged |
| Graph truncated | `graph_truncated` events | Check `nodeCount` against the 200 cap |
| Explanations missing | `explanation-failure rate` | SHAP exception in the ML logs |
| Alert not appearing | Was the transaction committed? | `audit_events` for the dispatch record |
| Everything slow | Database latency in health | Connection pool exhaustion |

---

## 10. Gaps

| Gap | Impact | Remedy |
|---|---|---|
| No distributed tracing | Acceptable at two services | Add if services grow |
| No external error-reporting service | Errors are in logs only | Deliberate — avoids sending data to a third-party processor |
| No log retention beyond the platform default | Older incidents are not reconstructable | V1 retention policy |
| No synthetic monitoring of the full journey | A broken critical path could go unnoticed between deployments | Hourly production smoke suite partially covers it |
| Alerting is manual during evaluation | Depends on a person watching | Accepted for a three-minute window |
