# API TEST CASES — CyberPulse AI

| Field | Value |
|---|---|
| Version | 1.0 |
| Count | 48 |
| Contract | `architecture/api-design.md` |
| Rule applied throughout | Every endpoint is tested for its happy path, its validation failures, its authorisation behaviour, and its error envelope. |

---

## Complaints

### TC-API-001 — List returns a correct page envelope
**Req** FR-02 · **FEAT-01** · **P3** · **Critical** · **Automated**
**Expected:** 200. Exactly 25 rows. Body carries `page`, `pageSize`, `total`, `totalPages`. `totalPages === ceil(total / pageSize)`.

### TC-API-002 — Search matches ID and city only
**Req** FR-02.1 · **High**
**Steps:** Search `10284`; search `Noida`; search `xyzzy`.
**Expected:** First returns `C-10284`. Second returns only Noida complaints. Third returns an empty array with `total: 0` — not a 404.

### TC-API-003 — Filters compose with AND semantics
**Req** FR-02.2 · **High**
**Expected:** `fraudType=UPI_FRAUD&state=Uttar Pradesh` returns only rows satisfying both. An impossible combination returns an empty array.

### TC-API-004 — Sorting on allow-listed columns
**Req** FR-02.3 · **High**
**Expected:** `sort=amount&order=desc` is monotonically non-increasing. `sort=riskScore` places unanalysed complaints last, not first.

### TC-API-005 — Page size bounds
**Req** FR-02.4 · **High**
**Expected:** `pageSize=500` → 400 naming `pageSize`. `pageSize=100` → 200 with 100 rows. `pageSize=0` → 400.

### TC-API-006 — Detail returns complaint, transactions and accounts
**Req** FR-03 · **Critical**
**Expected:** 200 with all three collections. Transactions in ascending timestamp order. `latestPrediction` is `null` before analysis.

### TC-API-007 — Unknown complaint
**Req** FR-03.6 · **High**
**Expected:** `C-99999` → 404 `NOT_FOUND`. `c-10284` (wrong case) → 400 `VALIDATION_ERROR`. Neither body contains internal detail.

---

## Prediction

### TC-API-010 — Prediction returns the full contract
**Req** FR-07 · **Critical**
**Expected:** 201. Every documented field present and schema-valid, including both refinements.

### TC-API-011 — BANK cannot predict
**Req** FR-20.1 · **Critical**
**Expected:** 403 `FORBIDDEN`. No row written. The same request as LEA returns 201.

### TC-API-012 — Prediction rate limit
**Req** NFR-23 · **High**
**Expected:** 21st request in a minute → 429 with `Retry-After`. Nothing written.

### TC-API-013 — `topK` bounds
**Medium**
**Expected:** `topK=0` → 400. `topK=100` → 400. `topK=20` → 201 with at most 20 ranked hotspots.

### TC-API-014 — Unknown complaint in a prediction request
**High**
**Expected:** 404 before any ML call is made — verified by asserting zero upstream requests.

---

## Transactions and Network

### TC-API-020 — Transaction list filters
**Req** FR-04 · **High**
**Expected:** `channel=ATM&minAmount=5000000` returns only matching rows. Empty result returns an empty array with `total: 0`.

### TC-API-021 — Transaction detail
**Req** FR-04.1 · **Medium**
**Expected:** Both counterparties, amount, channel, timestamp, coordinates, risk indicator.

### TC-API-022 — Network subgraph shape
**Req** FR-05 · **Critical**
**Expected:** `nodes`, `edges`, `truncated`, `nodeCount`, `requestedDepth`. Every node has a type from the closed set. No node payload has a name field.

### TC-API-023 — Depth validation
**Req** FR-04.3 · **High**
**Expected:** `depth=10`, `depth=-1`, `depth=abc` all → 400 naming `depth`.

### TC-API-024 — Simulation control is ADMIN-scoped and idempotent
**Req** FR-24.1 · **Medium**
**Expected:** LEA → 403. Start twice → both 200, one simulation running. Reset clears `simulation_events` and nothing else.

---

## Hotspots and ATMs

### TC-API-030 — Hotspot list ordering and bounds
**Req** FR-08.4 · **High**
**Expected:** Non-increasing `riskScore`. `limit=100` accepted; `limit=1000` → 400.

### TC-API-031 — Hotspot detail is the drawer payload
**Req** FR-12.1 · **High**
**Expected:** Location, score, level, window, `nearbyAtms[]` with distances, `topFactors[]`, `relatedComplaints[]` — in one response.

### TC-API-032 — ATM query requires and clamps a bbox
**Medium**
**Expected:** Missing `bbox` → 400. A bbox outside India bounds is clamped. A degenerate bbox → 400.

---

## Alerts

### TC-API-040 — Create returns 201 and persists SENT
**Req** FR-14 · **Critical**
**Expected:** 201 with `alertId`, `status: "SENT"`, `severity` derived, `investigationCaseId`. Row exists with a non-null `created_at`.

### TC-API-041 — Empty recipients rejected
**Req** FR-13.2 · **Critical**
**Expected:** 400. Duplicates de-duplicated. Unknown recipient → 400.

### TC-API-042 — Client-supplied derived fields rejected
**Req** FR-14.2 · **Critical**
**Expected:** `severity`, `exposurePaise`, `locationName`, window bounds each → 400 when supplied.

### TC-API-043 — Acknowledgement is idempotent
**Req** FR-14.4 · **High**
**Expected:** Repeat PATCH → 200, `acknowledged_at` unchanged.

### TC-API-044 — BANK sees only its own alerts
**Req** NFR-25 · **Critical**
**Expected:** List contains only alerts whose `recipients` include `BANK`. `total` reflects the scoped count.

### TC-API-045 — Alert detail out of scope
**High**
**Expected:** 404, byte-identical to a non-existent alert.

---

## Investigations

### TC-API-050 — Create is LEA/ADMIN only
**Req** FR-20.1 · **Critical**
**Expected:** BANK → 403. LEA → 201. Duplicate for the same complaint → 409.

### TC-API-051 — Transition validation
**Req** FR-15.2 · **Critical**
**Expected:** Invalid pair → 409 `INVALID_TRANSITION` with status unchanged. Valid pair → 200.

### TC-API-052 — Optimistic concurrency
**High**
**Expected:** Stale `expectedUpdatedAt` → 409 `CONFLICT`.

### TC-API-053 — Notes
**Req** FR-15.3 · **Medium**
**Expected:** Empty body → 400. Valid note → 201 with author role and UTC timestamp. BANK may add a note only on an in-scope investigation.

### TC-API-054 — Consolidated detail
**Req** FR-15.4 · **High**
**Expected:** Complaint, latest prediction with factors, alerts, notes in reverse-chronological order, graph reference — one response.

---

## Reports, Settings, Health, Demo, Role

### TC-API-060 — Report summary returns six series
**Req** FR-16 · **High**
**Expected:** Six named series plus a `meta` block echoing applied filters and the effective range.

### TC-API-061 — Report range cap
**Medium**
**Expected:** A 400-day range is capped at 365 with a notice in `meta`; `from > to` → 400.

### TC-API-062 — Metrics availability
**Req** FR-17.2 · **Critical**
**Expected:** With data, every metric to 3 dp matching the stored row. With an empty table, `{ "available": false }` — never zeros.

### TC-API-070 — Settings write is ADMIN-only and validated
**Req** FR-22 · **High**
**Expected:** LEA/BANK → 403. `thresholdHigh <= thresholdMedium` → 400. Valid write → 200 plus an audit event.

### TC-API-080 — Health composition
**Req** FR-23 · **High**
**Expected:** 200 always. Three components with status and latency. ML version and `modelLoaded` reported. Never throws.

### TC-API-090 — Demo reset scoping
**Req** FR-18.2 · **Critical**
**Expected:** Only demo-origin rows removed; idempotent; ADMIN-scoped.

### TC-API-091 — Role switch
**Medium**
**Expected:** Known role accepted; unknown role → 400; ADMIN without the access code, or with a wrong one → 403 and no cookie change; a hand-written, edited or expired ADMIN cookie, or `x-cyberpulse-role: ADMIN`, resolves to LEA (ADR-023); the response never implies an authenticated session.

---

## Cross-Cutting

### TC-API-100 — Every endpoint validates input
**Req** NFR-10 · **Critical**
**Steps:** For all 25 endpoints, send a missing required parameter, a wrong type, an out-of-range value, an unknown key and a 1 MB string.
**Expected:** 400 with a named field in every case. No 500.

### TC-API-101 — Every error body matches the envelope
**Req** NFR-13 · **Critical**
**Expected:** `code`, `message`, optional `field`, `requestId`. No stack frame, SQL keyword, file path or version string anywhere.

### TC-API-102 — `x-request-id` round trip
**Medium**
**Expected:** A supplied ID is echoed in the response header and appears in the server log. When absent, one is generated.

### TC-API-103 — Cache headers on model-derived endpoints
**High**
**Expected:** `/api/predict` and all alert endpoints return `Cache-Control: no-store`.

### TC-API-104 — Rate limits per endpoint class
**Req** NFR-23 · **High**
**Expected:** Predict 20/min, alerts 10/min, mutations 30/min, reads 120/min, health 600/min. Each returns 429 with `Retry-After` above its limit.

---

## Summary

| Group | Cases | Critical | High | Medium |
|---|:--:|:--:|:--:|:--:|
| Complaints | 7 | 2 | 4 | 1 |
| Prediction | 5 | 2 | 2 | 1 |
| Transactions and network | 5 | 1 | 2 | 2 |
| Hotspots and ATMs | 3 | 0 | 2 | 1 |
| Alerts | 6 | 4 | 2 | 0 |
| Investigations | 5 | 2 | 2 | 1 |
| Reports and platform | 7 | 2 | 3 | 2 |
| Cross-cutting | 5 | 2 | 2 | 1 |
| Authorisation matrix (66 generated) | 5 | 3 | 2 | 0 |
| **Total** | **48** | **18** | **21** | **9** |
