# SECURITY TEST CASES — CyberPulse AI

| Field | Value |
|---|---|
| Version | 1.0 |
| Format | Per `test-cases/test-case-template.md` |
| Coverage | Every control in `security/threat-model.md` has at least one case here |
| Automation | Playwright / Vitest / pytest unless marked Manual |

---

## Authentication and Role Resolution

### TC-SEC-010 — Unknown role falls back to least privilege
**Req:** FR-20, ADR-019 · **Threat:** Spoofing · **Priority:** Critical · **Type:** Security · **Automated**
**Steps:** Send `GET /api/complaints` with `x-cyberpulse-role: SUPERADMIN`; then with an empty value; then with `admin` (lower case); then with a 10 KB string.
**Expected:** All four resolve to LEA. None returns 500. None grants ADMIN capability. A warning is logged with the raw value truncated.
**Severity if failed:** Critical

### TC-SEC-011 — Capability matrix enforced server-side for every role
**Req:** FR-20.1, NFR-25 · **Threat:** Elevation · **Priority:** Critical · **Type:** Security · **Automated (parameterised)**
**Steps:** For each of the 22 capabilities in `security/authorization.md` §2 and each of the three roles, issue the corresponding request directly to the API, bypassing the UI entirely.
**Expected:** Every cell matches the matrix. Denied capabilities return 403 with `{ "code": "FORBIDDEN" }` and no object detail. No denied request produces a database write — asserted by comparing row counts before and after.
**Severity if failed:** Critical

### TC-SEC-012 — Object scope returns 404, and totals are scoped
**Req:** NFR-25 · **Threat:** Information disclosure, enumeration · **Priority:** Critical · **Type:** Security · **Automated**
**Steps:**
1. As BANK, request a complaint that exists but is not reachable through any BANK-addressed alert.
2. As BANK, request a complaint ID that does not exist at all.
3. Byte-compare the two response bodies and compare response times over 50 iterations.
4. As BANK, call `GET /api/complaints` and read `total`.
**Expected:** Steps 1 and 2 return byte-identical 404 bodies; timing distributions overlap. `total` in step 4 counts only in-scope complaints and does not reveal the corpus size.
**Severity if failed:** Critical

---

## Input Validation and Injection

### TC-SEC-001 — Every endpoint validates its input
**Req:** NFR-10 · **Priority:** Critical · **Type:** Security · **Automated**
**Steps:** For every route in `architecture/api-design.md` §10, send: a missing required parameter; a wrong-typed parameter; an out-of-range value; an unexpected extra key; a 1 MB string in a text field.
**Expected:** Every case returns 400 with `VALIDATION_ERROR` and the offending `field`. No case returns 500. No unexpected key is silently accepted or silently stripped.
**Severity if failed:** Critical

### TC-SEC-002 — SQL injection resistance
**Req:** NFR-11 · **Threat:** Tampering · **Priority:** Critical · **Type:** Security · **Automated**
**Test data:** `' OR '1'='1`, `'; DROP TABLE complaints;--`, `" UNION SELECT NULL,NULL--`, `%27%20OR%201=1`, `\x27 OR 1=1`, a 4-byte UTF-8 payload containing a quote.
**Steps:** Submit each in `q`, `city`, `state`, note bodies and every path parameter.
**Expected:** All are treated as literal values. Row counts are unchanged after the run. No response contains a SQL keyword or driver message. Schema introspection confirms all tables still exist.
**Severity if failed:** Critical

### TC-SEC-013 — Sort parameter cannot inject an ordering clause
**Req:** FR-02.3 · **Threat:** Tampering · **Priority:** Critical · **Type:** Security · **Automated**
**Steps:** Request `?sort=amount;DROP TABLE alerts`, `?sort=(SELECT 1)`, `?sort=complaintTimestamp--`, `?sort=riskScore,amount`.
**Expected:** All return 400 naming `sort`. Only the three allow-listed values are accepted.
**Severity if failed:** Critical

### TC-SEC-014 — Server-derived fields are rejected, not ignored
**Req:** FR-13.3, FR-14.2 · **Threat:** Tampering · **Priority:** Critical · **Type:** Security · **Automated**
**Steps:** `POST /api/alerts` with `severity: "LOW"` on a HIGH prediction; then with `exposurePaise: 1`; then with a false `locationName`; then with a 12-hour `windowStart`/`windowEnd`.
**Expected:** Each returns 400. No alert row is written. A subsequent valid request produces server-derived values matching the prediction.
**Severity if failed:** Critical
*Note: silently ignoring these would be a defect of equal severity — the client would believe it had set a value the record does not reflect.*

### TC-SEC-015 — Mass assignment rejected
**Req:** NFR-10 · **Priority:** High · **Type:** Security · **Automated**
**Steps:** Send `PATCH /api/investigations/:id` with `{ status, id: 9999, createdAt, origin: "SEED" }`.
**Expected:** 400 for unknown keys. `origin`, `id` and `createdAt` are unchanged in the database.
**Severity if failed:** High

### TC-SEC-005 — XSS resistance in stored free text
**Req:** NFR-10 · **Priority:** Critical · **Type:** Security · **Automated**
**Test data:** `<script>alert(1)</script>`, `<img src=x onerror=alert(1)>`, `javascript:alert(1)`, `"><svg onload=alert(1)>`.
**Steps:** Submit each as an investigation note and as an alert note; render the investigation and alert views.
**Expected:** Rendered as literal text. No script executes. No `dangerouslySetInnerHTML` appears anywhere in the codebase — asserted by a static scan in the same test.
**Severity if failed:** Critical

### TC-SEC-006 — CSRF resistance
**Req:** NFR-10 · **Priority:** High · **Type:** Security · **Automated**
**Steps:** From a foreign origin, submit a form POST with `content-type: application/x-www-form-urlencoded` to `/api/alerts`; then a cross-origin `fetch` with credentials.
**Expected:** Form content types are rejected. Cross-origin credentialed requests are blocked by same-site cookie policy. No alert is created.
**Severity if failed:** High

---

## Error Handling and Disclosure

### TC-SEC-004 — No internal detail in any error response
**Req:** NFR-13, AC-GLOBAL-04 · **Priority:** Critical · **Type:** Security · **Automated**
**Steps:** Drive every endpoint into each of its error branches (400, 403, 404, 409, 429, 500, 503, 504) using fault injection. Collect all response bodies.
**Expected:** Every body matches the typed envelope. Zero bodies contain a stack frame, a file path, a SQL keyword, a table name, a dependency name or a version string. Every body carries a `requestId` that appears in the server log with the full detail.
**Severity if failed:** Critical

---

## Rate Limiting and Availability

### TC-SEC-031 — Rate limits enforced with no partial writes
**Req:** FR-14.5, NFR-23 · **Priority:** High · **Type:** Security · **Automated**
**Steps:** Issue 11 alert creations in one minute as LEA; then 21 predictions in one minute; then 601 health checks.
**Expected:** The 11th alert returns 429 with `Retry-After` and writes no row. The 21st prediction returns 429. Health checks are not throttled. After the window elapses, requests succeed again.
**Severity if failed:** High

### TC-SEC-026 — Bounded traversal cannot be abused
**Req:** FR-04.3, FR-05.7 · **Priority:** High · **Type:** Security · **Automated**
**Steps:** Request the network endpoint with `depth=10`, `depth=-1`, `depth=1e9`, `maxNodes=100000`; then request a complaint whose chain contains a deliberate cycle.
**Expected:** Out-of-range values return 400. The cyclic chain terminates via the visited set and returns within the time budget with `truncated: true` if applicable. No query exceeds the 5 s statement timeout.
**Severity if failed:** High

---

## Audit Integrity

### TC-SEC-030 — Alert dispatch is atomic with its audit event
**Req:** FR-14.3, SR-03 · **Priority:** Critical · **Type:** Security · **Automated**
**Steps:**
1. Dispatch an alert normally; verify one alert row and one `ALERT_DISPATCHED` audit row.
2. Inject a failure in the audit insert; retry the dispatch.
3. Inject a failure in the investigation upsert; retry.
**Expected:** In cases 2 and 3, zero alert rows and zero audit rows are written, and the API returns 500. The three writes are never partially applied.
**Severity if failed:** Critical

### TC-SEC-032 — Investigation status change is audited
**Req:** FR-15.5 · **Priority:** High · **Type:** Security · **Automated**
**Steps:** Perform every valid transition in the state machine; attempt three invalid ones.
**Expected:** One audit event per successful transition, capturing role, from, to and timestamp. Zero audit events for rejected transitions.
**Severity if failed:** High

### TC-SEC-033 — Complete audit coverage of privileged actions
**Req:** FR-21, SR-03 · **Priority:** Critical · **Type:** Security · **Automated**
**Steps:** Enumerate the six audited actions in `architecture/security-architecture.md` §6; perform each; query `audit_events`.
**Expected:** Six events with correct actor role, action, subject type and subject ID. A static scan confirms no service function performs an audited action without calling `auditService.record`.
**Severity if failed:** Critical

### TC-SEC-016 — Audit records cannot be amended through the application
**Req:** SR-03 · **Priority:** High · **Type:** Security · **Automated**
**Steps:** Search the codebase for any update or delete targeting `audit_events`; attempt an update through the application's database role.
**Expected:** No such code path exists. The application role's grants are `INSERT` and `SELECT` only; an update attempt is refused by the database.
**Severity if failed:** High

---

## Data Protection

### TC-SEC-020 — PII scan blocks seeding
**Req:** FR-01.7, CR-01 · **Priority:** Critical · **Type:** Security · **Automated**
**Steps:** Run `pii_scan.py` on the generated corpus; then inject a fixture containing a name, an Aadhaar-shaped number, a PAN-shaped string, a mobile number and an email into a copy and re-run; then attempt `db:seed` on the tainted copy.
**Expected:** Clean corpus passes with zero matches. Tainted copy reports every category and exits non-zero. Seeding is blocked. No flag bypasses this in CI.
**Severity if failed:** Critical

### TC-SEC-021 — Graph node payloads have no name field
**Req:** FR-05.6, DT-3 · **Priority:** Critical · **Type:** Security · **Automated**
**Steps:** Inspect the shared node payload type definitions; call the network endpoint for 20 complaints and inspect every returned node's keys.
**Expected:** No key named or resembling a personal name exists in the type or in any response. Adding such a field to the type fails the shared-schema check.
**Severity if failed:** Critical

### TC-SEC-022 — Schema contains no personal-data column
**Req:** CR-01 · **Priority:** Critical · **Type:** Security · **Automated**
**Steps:** Introspect `information_schema.columns` for the whole database; match column names against a prohibited list (name, first_name, surname, address, phone, mobile, email, aadhaar, pan, ip, device_id, dob).
**Expected:** Zero matches across all sixteen tables.
**Severity if failed:** Critical

### TC-SEC-023 — Logs contain no bodies or resolved paths
**Req:** `security/data-protection.md` §6 · **Priority:** High · **Type:** Security · **Automated**
**Steps:** Exercise the critical path with distinctive marker strings in every text input; collect all server log output.
**Expected:** No marker string appears. Route entries are patterns (`/complaints/[id]`), never resolved paths containing an ID.
**Severity if failed:** High

### TC-SEC-024 — Analytics events carry no identity
**Req:** `product/product-analytics.md` §6 · **Priority:** High · **Type:** Security · **Automated**
**Steps:** Complete a full session; dump `analytics_events`.
**Expected:** Every row has only the documented envelope plus declared props. No user identifier, IP, resolved path or raw text body. Score and exposure values appear only as buckets.
**Severity if failed:** High

### TC-SEC-025 — Notes render as text
**Req:** `security/data-protection.md` §4 · **Priority:** High · **Type:** Security · **Automated**
Covered jointly with TC-SEC-005; asserted separately on the investigation timeline and alert detail surfaces.

### TC-SEC-003 — No secret in the client bundle
**Req:** NFR-12 · **Priority:** Critical · **Type:** Security · **Automated**
**Steps:** Build for production; grep every emitted JS and CSS asset for `DATABASE_URL`, connection-string patterns, private-key headers, high-entropy strings above the configured threshold, and the literal values of all non-public environment variables.
**Expected:** Zero matches. The build also asserts that no `NEXT_PUBLIC_*` value matches a secret pattern.
**Severity if failed:** Critical

---

## Service Boundary

### TC-SEC-017 — ML service is not publicly reachable
**Req:** TB-3 · **Priority:** High · **Type:** Security · **Manual + Automated**
**Steps:** From outside the deployment network, attempt `POST /predict` and `GET /health` directly against the ML service URL.
**Expected:** Connection refused or rejected by origin allow-listing. The web application's own calls continue to succeed.
**Severity if failed:** High

### TC-SEC-018 — Malformed ML responses are rejected, not persisted
**Req:** TB-3 tampering · **Priority:** Critical · **Type:** Security · **Automated**
**Steps:** With a stubbed ML service, return in turn: `riskScore: 1.5`; three factors instead of five; factors summing to 140; a 9-hour window; a raw feature name as a factor name; `modelVersion: "other"`.
**Expected:** Every case fails shared-schema validation in the ML client. Nothing is persisted. The API returns 500 with a typed code and the UI shows an error, never a value.
**Severity if failed:** Critical

### TC-SEC-019 — Model artefact integrity
**Req:** TB-4 · **Priority:** High · **Type:** Security · **Automated**
**Steps:** Verify `MODEL_DIR` is read-only in the running container; attempt to write to it; remove the artefact and restart; compare the reported `model_version` against the image tag's recorded version.
**Expected:** Write is refused. With the artefact removed, `/health` reports `modelLoaded: false` and `/predict` returns 503. Reported version always matches the image.
**Severity if failed:** High

---

## Domain-Specific

### TC-SEC-040 — Dependency vulnerabilities block release
**Req:** NFR-24 · **Priority:** High · **Type:** Security · **Automated**
**Steps:** Run the dependency audit for both workspaces in CI; introduce a known-vulnerable package in a scratch branch.
**Expected:** Zero high or critical advisories on main. The scratch branch fails CI.
**Severity if failed:** High

### TC-SEC-041 — Security headers present
**Req:** `architecture/security-architecture.md` §8.1 · **Priority:** Medium · **Type:** Security · **Automated**
**Steps:** Request every route and inspect response headers.
**Expected:** CSP, HSTS, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy` and `Permissions-Policy` present with the documented values. The only CSP deviation is the documented `style-src 'unsafe-inline'`.
**Severity if failed:** Medium

### TC-SEC-042 — Demo reset cannot delete seed data
**Req:** FR-18.2 · **Priority:** Critical · **Type:** Security · **Automated**
**Steps:** Record row counts for all sixteen tables. Create demo and non-demo alerts and investigations. Call `POST /api/demo/reset` twice. Attempt reset as LEA and as BANK.
**Expected:** Only `origin = 'DEMO'` rows are removed. Seed counts unchanged. User-origin alerts survive. Second call is idempotent. LEA and BANK receive 403.
**Severity if failed:** Critical

---

## Coverage Summary

| Threat area | Cases | Critical | High | Medium |
|---|:--:|:--:|:--:|:--:|
| Authentication and roles | 3 | 3 | 0 | 0 |
| Input validation and injection | 6 | 5 | 1 | 0 |
| Error disclosure | 1 | 1 | 0 | 0 |
| Rate limiting and availability | 2 | 0 | 2 | 0 |
| Audit integrity | 4 | 2 | 2 | 0 |
| Data protection | 7 | 5 | 2 | 0 |
| Service boundary | 3 | 1 | 2 | 0 |
| Domain-specific | 3 | 1 | 1 | 1 |
| **Total** | **29** | **18** | **10** | **1** |

Every threat in `security/threat-model.md` §3 and §4 maps to at least one case above. Threats accepted rather than mitigated — SR-02 role spoofing, SR-12 no penetration test — are verified as *documented* rather than as fixed: TC-SEC-010 confirms the fallback behaviour, and TC-UI-080 confirms the prototype labelling.
