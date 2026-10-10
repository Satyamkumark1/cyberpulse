# API DESIGN — CyberPulse AI

| Field | Value |
|---|---|
| Version | 1.0 |
| Style | Typed REST over JSON; Next.js route handlers for the application API, FastAPI for the ML service |
| Validation | Zod (web) and Pydantic (ML), both generated from one shared JSON Schema in `packages/shared` |
| Base paths | Web: `/api` · ML: `{ML_SERVICE_URL}` |

---

## 1. Conventions

### 1.1 Success envelope

Collections:

```json
{ "data": [ ... ], "page": 1, "pageSize": 25, "total": 500, "totalPages": 20 }
```

Single resources return the object directly. There is no `{ "data": {...} }` wrapper for singletons — wrapping a singleton adds a level of nesting that every client then has to unwrap for no benefit.

### 1.2 Error envelope (universal)

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "pageSize must be between 1 and 100",
    "field": "pageSize",
    "requestId": "req_01J8Z9K3M4N5P6Q7R8S9T0"
  }
}
```

`message` is safe for display. Internal detail — stack traces, SQL, file paths, dependency versions — is logged server-side against `requestId` and never serialised (NFR-13, AC-GLOBAL-04).

| Code | Status | Meaning |
|---|---|---|
| `VALIDATION_ERROR` | 400 | Input failed schema validation; `field` names the offender |
| `UNAUTHORIZED` | 401 | No resolvable role (not reachable in the prototype) |
| `FORBIDDEN` | 403 | Role lacks the capability for this action |
| `NOT_FOUND` | 404 | Resource absent, or present but out of the caller's scope |
| `INVALID_TRANSITION` | 409 | State machine rejected the transition |
| `CONFLICT` | 409 | Optimistic concurrency failure |
| `RATE_LIMITED` | 429 | Limit exceeded; `Retry-After` header present |
| `INTERNAL_ERROR` | 500 | Unhandled server fault |
| `ML_UNAVAILABLE` | 503 | ML service unreachable or unhealthy |
| `TIMEOUT` | 504 | Upstream exceeded its budget |

**On 404 for out-of-scope objects.** A BANK-role request for a complaint outside its scope returns 404, not 403. A 403 would confirm the object exists, which is an information leak in an enforcement context (`product/user-flows.md` UF-06).

### 1.3 Common headers

| Header | Direction | Purpose |
|---|---|---|
| `x-request-id` | both | Correlation; generated if absent, propagated to the ML service, echoed back |
| `x-cyberpulse-role` | request | Prototype role selection for any role except ADMIN (ADR-023); **not a security credential** and documented as such |
| `Retry-After` | response | On 429 and on 503 during ML warm-up |
| `Cache-Control` | response | `no-store` on every prediction and alert endpoint |

### 1.4 Rules applied to every endpoint

1. Validate before anything else; reject with the field named.
2. Resolve the role, then authorise, then execute.
3. Delegate to a service module; a route handler contains no business logic and no SQL (NFR-29, NFR-30).
4. Never return a partially written entity.
5. Write the audit event inside the same transaction as the action it records.
6. `no-store` on anything derived from a model output.

---

## 2. Complaints

### API-001 · `GET /api/complaints`

**Purpose:** paginated, filterable complaint registry · **Auth:** LEA, ADMIN full; BANK scoped to complaints reachable through alerts addressed to BANK · **Rate limit:** 120/min/role

**Query parameters**

| Param | Type | Default | Rules |
|---|---|---|---|
| `page` | int | 1 | ≥ 1 |
| `pageSize` | int | 25 | 1–100 |
| `q` | string | — | ≤ 64 chars; matches `complaint_id` or `city` |
| `fraudType` | enum | — | One of the six fraud types |
| `status` | enum | — | complaint_status |
| `riskLevel` | enum | — | HIGH \| MEDIUM \| LOW \| NONE |
| `from` / `to` | ISO date | — | `from ≤ to`; span ≤ 365 days |
| `city` / `state` | string | — | ≤ 64 chars |
| `sort` | enum | `complaintTimestamp` | **Allow-listed**: `complaintTimestamp` \| `amount` \| `riskScore` |
| `order` | enum | `desc` | `asc` \| `desc` |

The `sort` allow-list is a security control, not a convenience — it is what prevents an ordering-clause injection (TC-SEC-013).

**200 response**

```json
{
  "data": [{
    "complaintId": "C-10284",
    "fraudType": "UPI_FRAUD",
    "amountPaise": 38000000,
    "complaintTimestamp": "2026-09-14T03:42:00Z",
    "city": "Noida", "district": "Gautam Buddha Nagar", "state": "Uttar Pradesh",
    "status": "OPEN",
    "riskLevel": "HIGH",
    "riskScore": 0.917,
    "lastPredictionAt": "2026-09-14T05:10:22Z"
  }],
  "page": 1, "pageSize": 25, "total": 500, "totalPages": 20
}
```

`riskLevel: "NONE"` with `riskScore: null` means not yet analysed. A page beyond `totalPages` returns an empty `data` array with correct metadata — not a 404.

**Errors:** 400 (validation), 503 (database).
**Tests:** TC-API-001 … TC-API-005, TC-SEC-013

---

### API-002 · `GET /api/complaints/:complaintId`

**Purpose:** full case context in one request · **Auth:** as API-001 · **Path param:** `complaintId` matching `^C-\d{5}$`

**200 response**

```json
{
  "complaint": { "...": "as in API-001, plus victimLat, victimLon" },
  "transactions": [{
    "transactionId": "TXN-0000104821",
    "fromAccountId": "ACC-10029421", "toAccountId": "ACC-88123390",
    "amountPaise": 38000000, "timestamp": "2026-09-14T03:34:00Z",
    "channel": "UPI", "riskIndicator": "HIGH", "hopIndex": 0
  }],
  "linkedAccounts": [{
    "accountId": "ACC-88123390", "accountType": "MULE", "bankName": "Synthetic Bank A",
    "riskScore": 0.91, "status": "ACTIVE", "openedAt": "2026-08-12T00:00:00Z",
    "transactionCount": 14, "linkedAccountCount": 5
  }],
  "latestPrediction": null
}
```

Returning transactions and accounts alongside the complaint is a deliberate denormalisation of the API surface: the alternative is three round trips for one screen, which would breach NFR-03.

**Errors:** 400 (malformed ID), 404 (absent or out of scope).
**Tests:** TC-API-006, TC-API-007

---

## 3. Prediction

### API-010 · `POST /api/predict`

**Purpose:** run the full prediction pipeline for a complaint, persist it, return the persisted representation · **Auth:** LEA, ADMIN (BANK → 403) · **Rate limit:** 20/min/role · **Cache:** `no-store` · **Timeout:** 8 s to the ML service

**Request**

```json
{ "complaintId": "C-10284", "topK": 5, "forceRefresh": false }
```

`topK` defaults to 5, maximum 20. `forceRefresh: true` bypasses the "return the existing prediction" shortcut.

**201 response**

```json
{
  "predictionRef": "PRD-4821",
  "complaintId": "C-10284",
  "riskScore": 0.917,
  "riskLevel": "HIGH",
  "confidence": "HIGH",
  "predictedLocation": {
    "name": "Sector 18, Noida",
    "h3Index": "8860d4d4b1fffff",
    "lat": 28.5700, "lon": 77.3200,
    "district": "Gautam Buddha Nagar", "state": "Uttar Pradesh"
  },
  "expectedWindow": {
    "start": "2026-09-14T08:30:00Z",
    "end":   "2026-09-14T10:30:00Z",
    "confidence": "HIGH",
    "fallback": false
  },
  "likelyAtms": 3,
  "estimatedExposurePaise": 28000000,
  "rankedHotspots": [
    { "rank": 1, "name": "Sector 18, Noida", "h3Index": "8860d4d4b1fffff", "lat": 28.57, "lon": 77.32, "score": 0.917, "likelyAtms": 3 },
    { "rank": 2, "name": "Gurugram Sector 29", "h3Index": "8860d4d4b3fffff", "lat": 28.46, "lon": 77.07, "score": 0.872, "likelyAtms": 5 }
  ],
  "factors": [
    { "name": "Transaction Velocity",   "contribution": 27.0, "direction": "INCREASES" },
    { "name": "Historical Hotspot",     "contribution": 22.0, "direction": "INCREASES" },
    { "name": "Linked Account Pattern", "contribution": 19.0, "direction": "INCREASES" },
    { "name": "ATM Proximity",          "contribution": 14.0, "direction": "INCREASES" },
    { "name": "Time Pattern",           "contribution": 11.0, "direction": "INCREASES" },
    { "name": "Amount / Frequency",     "contribution":  7.0, "direction": "INCREASES" }
  ],
  "explanationAvailable": true,
  "clusteringFallback": false,
  "modelVersion": "CyberPulse-Demo-v1",
  "featureSchemaVersion": "fs-1",
  "inferenceMs": 312,
  "createdAt": "2026-09-14T05:10:22Z"
}
```

> The figures above are **schema illustrations**. At runtime every value comes from the model; none may be hard-coded in application code (TC-INT-010, TC-INT-012).

**Response invariants** — each is asserted by a test:

| Invariant | Test |
|---|---|
| `riskScore ∈ [0,1]` | TC-ML-010 |
| `riskLevel` derives from `riskScore` and the configured thresholds | TC-ML-011 |
| `factors.length ≥ 5` | TC-ML-045 |
| `Σ|contribution| = 100 ± 0.5` | TC-ML-043 |
| `0 < end − start ≤ 4 h` | TC-ML-032 |
| `rankedHotspots` sorted non-increasing by `score` | TC-ML-024 |
| The response equals the persisted row | TC-INT-013 |

**Errors:** 400, 403 (BANK), 404 (unknown complaint), 429, 500 (`schema_mismatch`), 503 `ML_UNAVAILABLE`, 504 `TIMEOUT`.
**Tests:** TC-E2E-001, TC-E2E-002, TC-ML-010 … TC-ML-045, TC-INT-013, TC-INT-020, TC-INT-022

---

## 4. Transactions

### API-020 · `GET /api/transactions`
Query: `page`, `pageSize`, `channel`, `minAmount`, `maxAmount`, `from`, `to`, `riskIndicator`, `accountId`, `sort` (allow-listed: `timestamp` \| `amount`), `order`. Standard collection envelope. **Tests:** TC-API-008

### API-021 · `GET /api/transactions/:transactionId`
Returns the transaction, both counterparty account summaries, and coordinates. 404 if absent or out of scope. **Tests:** TC-API-009

### API-022 · `GET /api/transactions/network/:id`

**Purpose:** the money-trail subgraph · **Query:** `depth` (default 4, max 6), `maxNodes` (default 200, max 500)

```json
{
  "nodes": [
    { "id": "victim:C-10284", "type": "VICTIM", "data": { "complaintId": "C-10284", "amountPaise": 38000000 } },
    { "id": "acct:ACC-88123390", "type": "MULE_ACCOUNT",
      "data": { "accountId": "ACC-88123390", "riskScore": 0.91, "transactionCount": 14, "linkedAccountCount": 5, "openedAt": "2026-08-12T00:00:00Z", "status": "ACTIVE" } },
    { "id": "atm:ATM-102", "type": "ATM",
      "data": { "atmId": "ATM-102", "bankName": "Synthetic Bank C", "city": "Noida",
                "withdrawals": [ { "amountPaise": 5000000, "timestamp": "2026-09-12T11:20:00Z" } ] } }
  ],
  "edges": [
    { "id": "e1", "source": "victim:C-10284", "target": "acct:ACC-88123390",
      "data": { "amountPaise": 38000000, "timestamp": "2026-09-14T03:34:00Z", "channel": "UPI" } }
  ],
  "truncated": false,
  "nodeCount": 7,
  "requestedDepth": 4
}
```

**Schema-level guarantee:** no node payload type contains a personal-name field. This is enforced by the shared type, not by convention (FR-05.6, TC-SEC-021).

**Errors:** 400 (`depth` or `maxNodes` out of range), 404.
**Tests:** TC-API-010, TC-API-011, TC-PERF-005, TC-SEC-021

### API-023 · Simulation
`POST /api/simulation/start` · `POST /api/simulation/pause` · `POST /api/simulation/reset` · `GET /api/simulation/events?since=`
ADMIN and the demo route only. Writes exclusively to `simulation_events`. Start is idempotent. **Tests:** TC-API-012, TC-API-013

---

## 5. Hotspots

### API-030 · `GET /api/hotspots`
Query: `state`, `riskLevel`, `from`, `to`, `limit` (default 20, max 100), `bbox` (`minLon,minLat,maxLon,maxLat`, clamped to India bounds). Returns ranked hotspots with `h3Index`, `name`, coordinates, `riskScore`, `riskLevel`, `likelyAtmCount`, `expectedStart`, `expectedEnd`. A cell's risk fields come from the highest of its *current* predictions — each complaint's latest, so a superseded refresh no longer counts — never from the `hotspots` row's own columns; a cell no current prediction names is not listed. Ordered by `riskScore` desc, ties on `h3Index`. **Tests:** TC-API-014

### API-031 · `GET /api/hotspots/:h3Index`
Returns the hotspot plus `nearbyAtms[]` (id, bank, distance in metres), `topFactors[]`, `predictionRef` and exposure from the prediction behind the displayed score (as API-030), and `relatedComplaints[]` (id, fraud type, amount) whose current prediction names this cell. 404 when no current prediction names the cell. This is exactly the drawer's payload — one request, one screen. **Tests:** TC-UI-035

### API-032 · `GET /api/atms`
Query: `bbox` (required, clamped), `limit` (default 500, max 2000). Viewport-scoped so the map never issues an unbounded query. **Tests:** TC-PERF-003

---

## 6. Alerts

### API-040 · `POST /api/alerts`

**Auth:** LEA, ADMIN · **Rate limit:** 10/min/role (FR-14.5)

```json
{ "predictionRef": "PRD-4821", "recipients": ["LEA", "BANK"], "notes": "Team briefed." }
```

Server-derived and **not accepted from the client**: `severity` (from the prediction's risk level), `exposurePaise` (documented formula), `locationName`, coordinates, `windowStart`, `windowEnd`. Supplying any of them is a 400 — accepting them would let a client alter the record of what the model said.

**201 response**

```json
{ "alertId": "ALT-9932", "status": "SENT", "severity": "HIGH",
  "predictionRef": "PRD-4821", "investigationCaseId": "INV-2041",
  "recipients": ["LEA","BANK"], "createdAt": "2026-09-14T05:12:04Z" }
```

**Transaction:** insert alert → insert audit event → upsert investigation to `ALERT_SENT`. All three commit together or none do (AC-011-07, TC-SEC-030).

**Errors:** 400 (empty `recipients`, or client-supplied derived field), 403, 404 (unknown prediction), 429 with `Retry-After`, 500.
**Tests:** TC-API-030, TC-API-031, TC-E2E-010 … TC-E2E-012, TC-SEC-030, TC-SEC-031

### API-041 · `GET /api/alerts`
Query: `status`, `severity`, `from`, `to`, `page`, `pageSize`. BANK sees only alerts whose `recipients` contain `BANK`. **Tests:** TC-API-033

### API-042 · `GET /api/alerts/:alertId`
Full alert with the linked prediction summary and factor list. **Tests:** TC-API-034

### API-043 · `PATCH /api/alerts/:alertId`

```json
{ "status": "ACKNOWLEDGED" }
```

Idempotent: re-acknowledging returns 200 and leaves `acknowledged_at` unchanged (AC-011-06). BANK may acknowledge; LEA and ADMIN may also close. Writes an audit event in the same transaction.
**Tests:** TC-API-032

---

## 7. Investigations

### API-050 · `GET /api/investigations`
Query: `status`, `priority`, `assignedRole`, `page`, `pageSize`, `sort` (`updatedAt` \| `priority`). **Tests:** TC-API-044

### API-051 · `POST /api/investigations`
`{ "complaintId": "C-10284", "priority": "HIGH" }` → 201. LEA and ADMIN only; BANK receives 403 (AC-015-02). A second create for the same complaint returns 409 `CONFLICT` (the unique constraint made visible). **Tests:** TC-API-045, TC-SEC-011

### API-052 · `GET /api/investigations/:caseId`
Returns the consolidated case surface: complaint, latest prediction with factors, associated alerts, notes in reverse-chronological order, and the graph endpoint reference. **Tests:** TC-UI-050

### API-053 · `PATCH /api/investigations/:caseId`

```json
{ "status": "MONITORING", "expectedUpdatedAt": "2026-09-14T05:12:04Z", "note": "Recipient acknowledged." }
```

Transition validated against the state machine in `FEATURE_SPECIFICATIONS.md` FEAT-12. Backward transitions are limited to one step and require `note`. `RESOLVED` always requires `note`. `expectedUpdatedAt` provides optimistic concurrency; a mismatch returns 409 `CONFLICT`.
**Errors:** 400, 403, 404, 409 `INVALID_TRANSITION`, 409 `CONFLICT`.
**Tests:** TC-API-040 … TC-API-042

### API-054 · `POST /api/investigations/:caseId/notes`
`{ "body": "…" }`. Empty or whitespace-only body → 400. BANK may add notes only on investigations linked to alerts addressed to BANK. **Tests:** TC-API-043

---

## 8. Reports, Settings, Health, Demo

### API-060 · `GET /api/reports/summary`
Query: `from`, `to` (span capped at 365 days), `city`, `state`, `fraudType`. Returns six named series, each an array of `{ label, value }` plus a `meta` block with the applied filters and the effective range. Charts render from this and nothing else. **Tests:** TC-API-050

### API-061 · `GET /api/reports/metrics`
Reads the latest `model_metrics` row for the active model version. Returns 200 with `{ "available": false }` when no evaluation has run — never zeros (AC-013-04). **Tests:** TC-API-051, TC-INT-011

### API-070 · `GET /api/settings` · `PATCH /api/settings`
`PATCH` is ADMIN-only and audited. Rejects `thresholdHigh <= thresholdMedium` with 400. Threshold changes affect level *display* only; stored `risk_score` values are never rewritten (AC-015-03). **Tests:** TC-API-070

### API-080 · `GET /api/health`

```json
{
  "status": "healthy",
  "web":       { "status": "up", "latencyMs": 12 },
  "database":  { "status": "up", "latencyMs": 34 },
  "mlService": { "status": "up", "latencyMs": 118, "modelVersion": "CyberPulse-Demo-v1", "modelLoaded": true },
  "checkedAt": "2026-09-14T05:15:00Z"
}
```

Overall status is `healthy`, `degraded` (any component degraded or warming) or `unhealthy` (database down). This endpoint never throws; a failing component is reported, not propagated. **Tests:** TC-API-080

### API-090 · `POST /api/demo/reset`
ADMIN or the demo route. Deletes, in one transaction and in dependency order, `origin = 'DEMO'` alerts and investigations, and every `DEMO`-origin complaint (FEAT-17 citizen reports) with the predictions, investigations and alerts that depend on it whatever their own origin. Idempotent. Returns `{ "alertsCleared": 2, "investigationsCleared": 1, "complaintsCleared": 1 }`. Cannot touch seed data — the `origin` filter is the guarantee. **Tests:** TC-API-060, TC-E2E-021, TC-SAFE-020

### API-091 · `POST /api/role`
`{ "role": "BANK" }`. Sets the prototype role in an `httpOnly` cookie. Documented in `security/auth-strategy.md` as **not a security control** for every role except ADMIN. ADMIN (ADR-023) requires `{ "role": "ADMIN", "accessCode": "…" }` matching `ADMIN_ACCESS_CODE`; a missing or wrong code returns 403 `FORBIDDEN`. The ADMIN cookie is signed and expires after 8 hours. **Tests:** TC-UI-080, TC-API-091

### API-100 · `POST /api/citizen/reports`
FEAT-17, ADR-022. CITIZEN only (`/safety` always sends `x-cyberpulse-role: CITIZEN`). Body, strict: `{ "fraudType": "UPI_FRAUD", "amountPaise": 4500000, "city": "Mumbai" }` — `amountPaise` an integer from 100 to 10,00,00,000,00; `city` one of the seeded cities (else 400, `field: "city"`). Any of `complaintId`, `status`, `origin`, `victimLat`, `victimLon`, `victimH3R8`, `district`, `state`, `complaintTimestamp` → 400 naming the field. Creates a `DEMO`-origin complaint (ID from `citizen_complaint_seq`, coordinates the seeded centroid of the city), a `citizen_reports` row and a `CITIZEN_REPORT_SUBMITTED` audit event in one transaction. Returns 201 `{ "complaintId": "C-90018", "trackingCode": "2WWM-ZEWZ-2QON-DMSE" }`; the code is returned once and stored only as a hash. 5/min per IP. **Tests:** TC-SAFE-010 … TC-SAFE-015

### API-101 · `POST /api/citizen/reports/status`
CITIZEN only. POST so the tracking code travels in a body, never a URL or log line. Body, strict: `{ "complaintId": "C-90018", "trackingCode": "2wwm zewz 2qon dmse" }` — any case, dashes and spaces optional. Returns 200 `{ "complaintId", "stage", "updatedAt" }`, where `stage` ∈ `RECEIVED`, `UNDER_REVIEW`, `ALERT_SENT`, `RESOLVED`, derived from the investigation status when one exists, else the complaint status. The response schema is strict, so no prediction field can leave. A wrong code, an unknown ID and a seeded (non-citizen) complaint are all the same 404. **Tests:** TC-SAFE-016 … TC-SAFE-018

---

## 9. ML Service API

Not publicly reachable in the deployed topology; only the Next.js runtime may call it.

### ML-001 · `POST /predict`

**Request** (the web application supplies everything; the service reads no database):

```json
{
  "requestId": "req_01J8Z9...",
  "complaint": { "complaintId": "C-10284", "fraudType": "UPI_FRAUD", "amountPaise": 38000000,
                 "timestamp": "2026-09-14T03:42:00Z", "victimLat": 28.58, "victimLon": 77.33, "victimH3R8": "8860d4d4b5fffff" },
  "transactions": [ { "amountPaise": 38000000, "timestamp": "...", "channel": "UPI", "hopIndex": 0, "riskIndicator": "HIGH" } ],
  "accounts": [ { "accountId": "ACC-88123390", "accountType": "MULE", "openedAt": "...", "riskScore": 0.91, "priorSuspiciousFlags": 3 } ],
  "candidateCells": [ { "h3Index": "8860d4d4b1fffff", "lat": 28.57, "lon": 77.32, "atmCount": 3,
                        "atmDensity": 4.1, "historicalHotspotScore": 0.62, "withdrawalCount": 18 } ],
  "topK": 5
}
```

**Response:** the prediction object of API-010 minus the persistence fields (`predictionRef`, `createdAt`), plus `pipelineStages[]` reporting per-stage durations — which is what the demo's progress ticks read (`ux/wireframes.md` W-10).

**Errors:** 422 (Pydantic validation), 500 (`FEATURE_SCHEMA_MISMATCH`, `INFERENCE_FAILED`), 503 (model not loaded).

### ML-002 · `POST /hotspots/rank`
Ranking only, without explanation. Used by the hotspot refresh job.

### ML-003 · `GET /health`
`{ "status": "healthy", "modelLoaded": true, "modelVersion": "CyberPulse-Demo-v1", "featureSchemaVersion": "fs-1", "loadedAt": "..." }`. Reports `unhealthy` with `modelLoaded: false` when the artefact is missing (AC-006-04).

### ML-004 · `GET /metrics`
Model version, artefact load time, inference latency histogram, request counts by outcome. Operational metrics only — no model internals, no training data.

---

## 10. Endpoint Index

| API ID | Method | Route | Auth | Rate limit | Tests |
|---|---|---|---|---|---|
| API-001 | GET | `/api/complaints` | LEA, ADMIN, BANK* | 120/min | TC-API-001 … 005 |
| API-002 | GET | `/api/complaints/:id` | LEA, ADMIN, BANK* | 120/min | TC-API-006, 007 |
| API-010 | POST | `/api/predict` | LEA, ADMIN | 20/min | TC-ML-010 … 045 |
| API-020 | GET | `/api/transactions` | LEA, ADMIN, BANK* | 120/min | TC-API-008 |
| API-021 | GET | `/api/transactions/:id` | LEA, ADMIN, BANK* | 120/min | TC-API-009 |
| API-022 | GET | `/api/transactions/network/:id` | LEA, ADMIN, BANK* | 60/min | TC-API-010, 011 |
| API-023 | POST/GET | `/api/simulation/*` | ADMIN | 30/min | TC-API-012, 013 |
| API-030 | GET | `/api/hotspots` | all | 120/min | TC-API-014 |
| API-031 | GET | `/api/hotspots/:h3` | all | 120/min | TC-UI-035 |
| API-032 | GET | `/api/atms` | all | 120/min | TC-PERF-003 |
| API-040 | POST | `/api/alerts` | LEA, ADMIN | 10/min | TC-API-030, 031 |
| API-041 | GET | `/api/alerts` | all (scoped) | 120/min | TC-API-033 |
| API-042 | GET | `/api/alerts/:id` | all (scoped) | 120/min | TC-API-034 |
| API-043 | PATCH | `/api/alerts/:id` | BANK, LEA, ADMIN | 30/min | TC-API-032 |
| API-050 | GET | `/api/investigations` | LEA, ADMIN, BANK* | 120/min | TC-API-044 |
| API-051 | POST | `/api/investigations` | LEA, ADMIN | 30/min | TC-API-045 |
| API-052 | GET | `/api/investigations/:id` | LEA, ADMIN, BANK* | 120/min | TC-UI-050 |
| API-053 | PATCH | `/api/investigations/:id` | LEA, ADMIN | 30/min | TC-API-040 … 042 |
| API-054 | POST | `/api/investigations/:id/notes` | LEA, ADMIN, BANK* | 60/min | TC-API-043 |
| API-060 | GET | `/api/reports/summary` | all | 60/min | TC-API-050 |
| API-061 | GET | `/api/reports/metrics` | all | 60/min | TC-API-051 |
| API-070 | GET/PATCH | `/api/settings` | GET all, PATCH ADMIN | 30/min | TC-API-070 |
| API-080 | GET | `/api/health` | all | 600/min | TC-API-080 |
| API-090 | POST | `/api/demo/reset` | ADMIN, demo | 10/min | TC-API-060 |
| API-091 | POST | `/api/role` | all | 30/min | TC-UI-080 |
| API-100 | POST | `/api/citizen/reports` | CITIZEN | 5/min per IP | TC-SAFE-010 … 015 |
| API-101 | POST | `/api/citizen/reports/status` | CITIZEN | 120/min | TC-SAFE-016 … 018 |

`*` BANK access is scoped to objects reachable through alerts addressed to BANK; out-of-scope objects return 404.

---

## 11. Versioning

v1.0 is unversioned in the path. Any breaking change before a real integration exists would be applied directly with a `CHANGELOG.md` entry. The moment an external consumer exists (V1's adapter boundary), the API moves to `/api/v1` and follows the deprecation policy in `engineering/release-process.md`. Adding a version prefix now would be ceremony without a consumer.
