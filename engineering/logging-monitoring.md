# LOGGING AND MONITORING — CyberPulse AI

| Field | Value |
|---|---|
| Version | 1.0 |
| Format | Structured JSON lines, one event per line |
| Correlation | `x-request-id` generated at the edge, propagated to the ML service, returned to the client |
| Related | `devops/observability.md`, `security/data-protection.md` §6 |

---

## 1. Logging Principles

1. **Structured, always.** JSON lines. No `console.log`, no string interpolation into a message.
2. **Correlated, always.** Every line carries `requestId`. Without it, distributed logs are anecdotes.
3. **No content, ever.** No request bodies, no user text, no resolved paths containing identifiers.
4. **Route patterns, not paths.** `/complaints/[id]`, never `/complaints/C-10284`.
5. **Log the decision, not the trace.** One line per meaningful outcome beats ten lines of narration.

Rule 3 has a consequence worth stating: a complaint ID never enters the log store, so log access cannot become case-data access. That is a deliberate privacy boundary, not an oversight (`security/data-protection.md` §6).

---

## 2. Log Schema

```json
{
  "ts": "2026-09-15T05:10:22.481Z",
  "level": "info",
  "requestId": "req_01J8Z9K3M4N5P6Q7R8S9T0",
  "service": "web",
  "route": "/api/predict",
  "method": "POST",
  "role": "LEA",
  "status": 201,
  "durationMs": 947,
  "outcome": "success",
  "modelVersion": "CyberPulse-Demo-v1",
  "msg": "prediction completed"
}
```

| Level | Use |
|---|---|
| `error` | A request failed, or a dependency is down |
| `warn` | Degraded but served — ML cold, clustering fallback, rate limit hit |
| `info` | Request completed; lifecycle events |
| `debug` | Local only; disabled in deployed environments |

---

## 3. What Is Logged

| Event | Level | Fields beyond the envelope |
|---|---|---|
| Request completed | info | `status`, `durationMs`, `outcome` |
| Request failed | error | `code`, exception name, message, stack |
| Prediction completed | info | `inferenceMs`, `candidateCount`, `riskLevel`, `confidence`, `modelVersion` |
| Prediction failed | error | `reason` (`service_down` \| `timeout` \| `schema_mismatch` \| `persist`) |
| Explanation unavailable | warn | `reason` |
| Clustering fallback used | warn | `candidateCount` |
| Alert dispatched | info | `severity`, `recipientCount` |
| Authorisation denied | warn | `capability`, `role` |
| Rate limit hit | warn | `limit`, `windowMs` |
| Database retry | warn | `attempt`, `backoffMs` |
| ML cold start detected | warn | `latencyMs` |
| Service start | info | `modelVersion`, `featureSchemaVersion`, `loadMs` |

Note what is absent: no `complaintId`, no `alertId`, no note text. Subject identifiers live in `audit_events`, which is the record built for accountability; logs are for operations.

---

## 4. Request Correlation

```
Browser ──▶ Edge: generate x-request-id if absent
        ──▶ Next.js: attach to logger context for the whole request
        ──▶ ML service: forwarded as a header, logged on every ML line
        ◀── returned in the response and in any error body
```

An evaluator who sees an error can read the ID off the screen; the full story is one grep away, and none of it was ever in the browser.

---

## 5. Implementation

```ts
// lib/logger.ts
export const logger = pino({
  level: env.LOG_LEVEL,
  base: { service: 'web', appVersion: env.APP_VERSION },
  redact: { paths: ['req.body', 'res.body', '*.notes', '*.body'], remove: true },
  formatters: { level: (label) => ({ level: label }) },
});

export function withRequest(requestId: string, route: string, role: ActorRole) {
  return logger.child({ requestId, route, role });
}
```

Redaction is configured at the logger rather than left to call sites, so a body cannot be logged even by a developer who forgets. `console.*` is an ESLint error in application code for the same reason.

```python
# ml-service core/logging.py
logger = structlog.get_logger().bind(service="ml-service", model_version=MODEL_VERSION)
```

---

## 6. Metrics

### Application

| Metric | Type | Use |
|---|---|---|
| `http_requests_total{route,status,role}` | counter | Traffic and error rate |
| `http_request_duration_ms{route}` | histogram | NFR-01, NFR-02 |
| `prediction_total{risk_level,outcome}` | counter | Volume and failure rate |
| `prediction_duration_ms` | histogram | Latency budget |
| `alert_total{severity}` | counter | Product usage |
| `db_query_duration_ms{query}` | histogram | NFR-19 |
| `rate_limit_total{route,role}` | counter | Abuse and misconfiguration |

### ML service — `GET /metrics`

| Metric | Use |
|---|---|
| `model_loaded` | 1 / 0 — the single most important operational bit |
| `model_version_info` | Labelled gauge |
| `inference_duration_ms` | Histogram; p95 gate |
| `feature_build_duration_ms` | The stage that dominates |
| `shap_duration_ms` | Second heaviest |
| `inference_total{outcome}` | Success, schema mismatch, not loaded |
| `artefact_load_duration_ms` | Cold-start visibility |

Deliberately absent: anything describing model internals, training data, or feature values. `/metrics` is operational telemetry, not a model-inspection endpoint.

---

## 7. Health

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

| Overall | Condition |
|---|---|
| `healthy` | All three up |
| `degraded` | ML down or warming, or database retrying |
| `unhealthy` | Database down |

The endpoint never throws. A failing component is reported, not propagated — an uptime check that itself 500s tells you nothing about which component broke.

An uptime probe polls it every 60 seconds, which doubles as the ML warm-up mechanism during the evaluation window (`architecture/deployment-architecture.md` §8).

---

## 8. Alerting Thresholds

| Condition | Severity | Action |
|---|---|---|
| `model_loaded == 0` | Critical | Immediate — no predictions are possible |
| Health `unhealthy` > 2 min | Critical | Immediate |
| Prediction error rate > 10% over 5 min | High | Investigate |
| `/api/predict` p95 > 3 s over 10 min | High | Check cold start and ML replicas |
| Health `degraded` > 10 min | Medium | Investigate |
| Rate-limit hits > 50/hour | Medium | Check for a misbehaving client |
| Database retry rate rising | Medium | Check connection pool |
| Any 500 on a core route | Medium | Review with the request ID |

During the evaluation window every one of these is watched manually by keeping a health tab open, because an alert nobody reads inside a three-minute demonstration is not a control.

---

## 9. Dashboards

| Dashboard | Panels |
|---|---|
| **Operational** | Health status, request rate, error rate by route, p95 latency, ML inference p95, `model_loaded` |
| **Product** | Predictions per hour, risk-level mix, alerts dispatched, acknowledgement rate, demo completions |
| **Model** | Inference latency distribution, feature-build vs SHAP split, explanation-failure rate, clustering-fallback rate |

The model dashboard exists because the two most likely silent degradations — explanations quietly failing, and clustering quietly falling back — are invisible in request-level metrics and visible here.

---

## 10. Retention

| Store | Prototype | Gap |
|---|---|---|
| Application logs | Platform default (~7 days) | Acceptable |
| ML logs | Host default | Acceptable |
| `audit_events` | Unbounded, append-only | **G-4** in `security/security-checklist.md` |
| `analytics_events` | Unbounded, append-only | **G-4** |

The two unbounded tables are a declared gap rather than an oversight, and they are the first thing a real deployment would need to address — both for cost (`ai/cost-optimization.md` §4) and for governance.
