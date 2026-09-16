# PRODUCT ANALYTICS — CyberPulse AI

| Field | Value |
|---|---|
| Version | 1.0 |
| Purpose | Define the event taxonomy that every metric in `product/success-metrics.md` reads from |
| Storage | Prototype: append-only rows in the application database (`analytics_events`, created by migration 0009) plus structured server logs. No third-party analytics SDK is used. |

---

## 1. Principles

1. **No metric without an event.** Every metric in `success-metrics.md` names at least one event defined here, and every event here supports at least one metric. Orphans in either direction are audit failures (M-80/M-81 equivalents for analytics).
2. **No personal data in events.** Events carry role, not identity. There is no user ID, no name, no IP address, no device fingerprint. This is a constraint of the domain, not a privacy nicety.
3. **Server-authoritative timing.** Latency and duration are measured server-side or from the browser's Performance API, never from wall-clock differences across the two.
4. **Events describe what happened, not what it means.** `prediction_returned` carries a score bucket; it does not carry a judgement about whether the prediction was good.
5. **Failure is an event.** Every success event has a failure counterpart. A taxonomy that only records success cannot diagnose anything.

---

## 2. Common Envelope

Every event carries this envelope. Event-specific properties are additive.

| Property | Type | Notes |
|---|---|---|
| `event` | string | Event name from §3 |
| `ts` | ISO-8601 UTC | Server-assigned |
| `sessionId` | uuid | Ephemeral, per browser session, not linked to a person |
| `role` | `LEA` \| `BANK` \| `ADMIN` | Active prototype role |
| `route` | string | Next.js route pattern, e.g. `/complaints/[id]` — never a populated ID |
| `appVersion` | string | Build SHA |
| `modelVersion` | string \| null | Present on prediction-related events |
| `dataMode` | `synthetic` | Constant in the prototype; present so a future change is visible |

**Deliberate omission:** `route` records the *pattern*, not the resolved path, so a complaint ID never enters the analytics store.

---

## 3. Event Catalogue

### 3.1 Complaint events

| Event | Trigger | Properties | Metrics served |
|---|---|---|---|
| `complaints_list_viewed` | `/complaints` renders | `resultCount`, `page` | M-02 |
| `complaints_filter_applied` | Any filter change | `filterKeys[]`, `filterCount`, `resultCount` | Usability analysis |
| `complaints_search_performed` | Search submitted | `termLength`, `resultCount` | Usability analysis |
| `complaint_row_opened` | Row click | `fromPage` | Journey P1→P2 |
| `complaint_detail_viewed` | Detail route renders | `hasPrediction`, `transactionCount`, `linkedAccountCount` | M-02 |

### 3.2 Prediction events

| Event | Trigger | Properties | Metrics served |
|---|---|---|---|
| `complaint_analyze_clicked` | Analyze button | `isReanalysis` | M-02 |
| `features_built` | Feature vector constructed | `candidateCount`, `durationMs`, `defaultsApplied` | Model diagnostics |
| `prediction_scored` | ML service returns | `scoreBucket` (`0-20`,`20-40`,`40-60`,`60-80`,`80-100`), `inferenceMs` | M-41, M-20 context |
| `prediction_returned` | Rendered to the user | `riskLevel`, `confidence`, `hotspotCount`, `windowHours`, `factorCount`, `actionable` (bool), `e2eMs` | **M-01**, M-02, M-41 |
| `prediction_failed` | Any failure path | `reason` (`service_down`\|`timeout`\|`validation`\|`persist`\|`schema_mismatch`), `elapsedMs` | M-45, reliability |
| `hotspots_ranked` | Ranking completes | `count`, `topScoreBucket`, `clusteringFallback` | M-24 … M-26 context |
| `window_predicted` | Temporal model returns | `widthHours`, `confidence`, `windowFallback` | M-27, M-28 context |
| `explanation_generated` | SHAP completes | `factorCount`, `sumWithinTolerance` (bool), `durationMs` | M-29 |
| `explanation_failed` | SHAP fails | `reason` | M-29 |
| `explanation_expanded` | User expands factor panel | `factorCount` | **M-03** |

### 3.3 Graph and map events

| Event | Trigger | Properties | Metrics served |
|---|---|---|---|
| `graph_rendered` | Graph paints | `nodeCount`, `edgeCount`, `depth`, `renderMs`, `truncated` | **M-04**, M-44 |
| `graph_node_clicked` | Node click | `nodeType` (`victim`\|`mule`\|`atm`) | Usability analysis |
| `graph_truncated` | Node cap hit | `requestedNodes`, `renderedNodes` | Reliability |
| `map_viewed` | `/risk-map` renders | `layersOn[]`, `interactiveMs` | M-43 |
| `map_layer_toggled` | Layer switch | `layer`, `enabled` | Usability analysis |
| `hotspot_marker_clicked` | Marker click | `rank`, `riskLevel` | **M-05** |
| `hotspot_drawer_opened` | Drawer opens | `rank`, `relatedComplaintCount`, `nearbyAtmCount` | Journey P4 |
| `map_fallback_used` | Tile or WebGL fallback | `fallbackType` (`tiles`\|`webgl`) | Reliability |

### 3.4 Alert events

| Event | Trigger | Properties | Metrics served |
|---|---|---|---|
| `alert_modal_opened` | Modal opens | `origin` (`prediction`\|`hotspot_drawer`), `riskLevel` | Funnel |
| `alert_recipients_changed` | Selection change | `recipientCount` | Usability analysis |
| `alert_sent` | 201 received | `severity`, `recipientCount`, `recipients[]`, `exposureBucket` | **M-06** |
| `alert_send_failed` | Non-2xx | `reason` (`validation`\|`rate_limit`\|`persist`\|`audit`), `status` | Reliability |
| `alert_acknowledged` | PATCH succeeds | `ageMinutes` | **M-08** |

### 3.5 Investigation events

| Event | Trigger | Properties | Metrics served |
|---|---|---|---|
| `investigation_created` | Record created | `origin` (`manual`\|`alert_auto`), `priority` | **M-07** |
| `investigation_viewed` | Route renders | `status`, `alertCount`, `noteCount` | Usability analysis |
| `investigation_status_changed` | Valid transition | `from`, `to`, `automatic` (bool) | Lifecycle analysis |
| `investigation_transition_rejected` | 409 returned | `from`, `attempted` | Usability analysis |
| `investigation_note_added` | Note persisted | `bodyLength` | Lifecycle analysis |

### 3.6 Reports and settings events

| Event | Trigger | Properties | Metrics served |
|---|---|---|---|
| `reports_viewed` | `/reports` renders | `chartCount`, `loadMs` | Usability analysis |
| `reports_filter_applied` | Filter change | `filterKeys[]`, `rangeDays` | Usability analysis |
| `model_metrics_viewed` | Metrics panel visible | `modelVersion`, `metricsPresent` (bool) | Trust analysis |
| `role_switched` | Role change | `from`, `to` | **M-10** |
| `settings_updated` | PATCH succeeds | `fieldsChanged[]` | Audit correlation |
| `threshold_changed` | Threshold write | `highBefore`, `highAfter`, `mediumBefore`, `mediumAfter` | Metric-integrity rule 4 |
| `health_checked` | `/api/health` called | `overall`, `dbMs`, `mlMs` | Reliability |

### 3.7 Demo events

| Event | Trigger | Properties | Metrics served |
|---|---|---|---|
| `demo_started` | `/demo` mount or scenario click | `entry` (`route`\|`dashboard_button`) | **M-09** |
| `demo_step_completed` | Step advance | `step` (1–6), `stepMs` | Rehearsal timing |
| `demo_completed` | Step 6 finished | `totalMs` | **M-09**, G-06 |
| `demo_reset` | Reset confirmed | `alertsCleared`, `investigationsCleared` | Operability |
| `demo_degraded` | Degraded notice shown | `reason` | MOT-3 verification |

### 3.8 Error and system events

| Event | Trigger | Properties | Metrics served |
|---|---|---|---|
| `api_error` | Any non-2xx from a route handler | `route`, `status`, `code` | M-45 |
| `client_error_boundary` | React error boundary catches | `route`, `componentStack` hash | M-45 |
| `rate_limited` | 429 issued | `route`, `role` | Security |
| `validation_rejected` | 400 issued | `route`, `field` | M-60 |

---

## 4. Metric → Event Mapping (reverse index)

| Metric | Primary event(s) | Derivation |
|---|---|---|
| M-01 AFR | `prediction_returned` | `count(actionable=true) / count(*)` |
| M-02 Complaints analysed | `prediction_returned` | distinct complaint analyses in session scope |
| M-03 Explanation open rate | `explanation_expanded` / `prediction_returned` | ratio |
| M-04 Graph open rate | `graph_rendered` / `prediction_returned` | ratio |
| M-05 Map drill-downs | `hotspot_marker_clicked` | count per `sessionId` |
| M-06 Alert conversion | `alert_sent` / `prediction_returned where riskLevel=HIGH` | ratio |
| M-07 Alert→investigation | `investigation_created where origin=alert_auto` / `alert_sent` | ratio |
| M-08 Acknowledgement | `alert_acknowledged` / `alert_sent` | ratio |
| M-09 Demo completion | `demo_completed` / `demo_started` | ratio |
| M-10 Role coverage | `role_switched` | distinct `to` values |
| M-41 Prediction latency | `prediction_returned.e2eMs` | p95 |
| M-43 Map interactive | `map_viewed.interactiveMs` | p95 |
| M-44 Graph render | `graph_rendered.renderMs` | p95 at nodeCount ≥ 200 |
| M-45 Unhandled errors | `client_error_boundary`, `api_error` | count |

---

## 5. Implementation Notes

- Events are emitted through a single typed `track(event, props)` helper in `apps/web/lib/analytics.ts`. Direct writes are forbidden and are caught by an ESLint rule.
- The helper is a no-op when `NEXT_PUBLIC_ANALYTICS_ENABLED` is false, so E2E test runs do not pollute measurement data.
- Server-side events are emitted from the service layer, never from route handlers, so an event is recorded when the *operation* succeeds rather than when the HTTP response is written.
- `analytics_events` is append-only. There is no update or delete path in application code.
- Event property names are validated against a Zod schema at emit time in development, and the build fails on an unknown event name.

---

## 6. Privacy Position

The event schema deliberately cannot answer the question "what did a particular person do". It carries role rather than identity, route patterns rather than resolved paths, and buckets rather than exact values wherever a raw value could be re-identifying (score buckets, exposure buckets, body length rather than body).

This is not merely policy applied to the schema — the schema makes the privacy property structural. There is no field to misuse, so no configuration change or future feature can quietly begin collecting personal data without a visible schema change and a review.
