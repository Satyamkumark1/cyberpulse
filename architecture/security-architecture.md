# SECURITY ARCHITECTURE — CyberPulse AI

| Field | Value |
|---|---|
| Version | 1.0 |
| Posture | Prototype-appropriate security with production-shaped structure. **The role mechanism is not authentication and is documented as such throughout.** |
| Related | `security/threat-model.md`, `security/auth-strategy.md`, `security/authorization.md`, `test-cases/security-tests.md` |

---

## 1. Security Objectives

| # | Objective | Why it matters here |
|---|---|---|
| S-1 | No real personal or financial data can enter the system | The schema has no columns for it; the pipeline blocks on a PII scan |
| S-2 | Authorisation decisions are made server-side | A hidden button is not a control |
| S-3 | Privileged actions are unforgeably recorded | An alert dispatched without an audit event must be impossible, not merely unlikely |
| S-4 | Errors disclose nothing | Enforcement software leaking SQL or paths is a credibility failure as much as a technical one |
| S-5 | The prediction path cannot be poisoned | The ML service holds no credentials and cannot write state |
| S-6 | Object access cannot be enumerated | Out-of-scope objects return 404, not 403 |

---

## 2. Trust Boundaries

```
┌──────────────────────────────────────────────────────────────────┐
│ UNTRUSTED — Browser                                              │
│ All input hostile: query params, path params, bodies, headers    │
└───────────────────────────┬──────────────────────────────────────┘
                            │ TB-1  validate → authorise → rate limit
┌───────────────────────────▼──────────────────────────────────────┐
│ SEMI-TRUSTED — Next.js runtime                                   │
│ Holds DATABASE_URL and ML_SERVICE_URL. Enforces all policy.      │
└──────────┬────────────────────────────────┬──────────────────────┘
           │ TB-2 parameterised only        │ TB-3 validated payload,
           │                                │      no credentials shared
┌──────────▼──────────────┐    ┌────────────▼─────────────────────┐
│ TRUSTED — PostgreSQL    │    │ ISOLATED — ML service            │
│ Constraints as the last │    │ No DB access. Cannot write state.│
│ line of defence         │    │ Not publicly routable.           │
└─────────────────────────┘    └──────────────────────────────────┘
```

**TB-3 is the architecturally interesting one.** Because the ML service has no database credentials, a compromise of it yields the ability to return wrong predictions — serious, and detectable through the response validation in the ML client — but not the ability to alter, delete or exfiltrate stored data. Every persisted consequence is authored by the web application from a validated response.

---

## 3. Input Validation

Every route handler begins with a Zod parse of query, path and body. There is no handler that reads `request.json()` directly; a lint rule forbids it.

| Input class | Rule |
|---|---|
| Identifiers | Regex-bound: `^C-\d{5}$`, `^ACC-\d{8}$`, `^TXN-\d{10}$`, `^ALT-\d{4,}$`, `^INV-\d{4,}$`, `^PRD-\d{4,}$` |
| Pagination | `page ≥ 1`; `pageSize` 1–100 |
| Enums | Parsed against the shared enum, never accepted as free text |
| Sort columns | **Allow-listed**, mapped to a column reference — never interpolated |
| Dates | ISO-8601; `from ≤ to`; span ≤ 365 days |
| Bounding boxes | Clamped to India bounds; degenerate boxes rejected |
| Depth / limits | Bounded with documented maxima |
| Free text | Length-capped; stored as-is and escaped on output, never as HTML |
| Server-derived fields | Rejected with 400 if a client supplies them (severity, exposure, coordinates, window) |

The last row deserves emphasis. `POST /api/alerts` refuses a client-supplied `severity` or `exposurePaise` rather than ignoring it. Silently ignoring would let a client believe it had set a value that the record does not reflect.

---

## 4. Authorisation

Three roles: **LEA**, **BANK**, **ADMIN**. Enforcement is a two-stage check in the service layer.

```
1. Capability check   — may this role perform this action at all?      → 403
2. Object scope check — may this role see this specific object?        → 404
```

| Action | LEA | BANK | ADMIN |
|---|:--:|:--:|:--:|
| List / read complaints | ✅ | ⚠ scoped | ✅ |
| Run prediction | ✅ | ❌ | ✅ |
| Read hotspots and map | ✅ | ✅ | ✅ |
| Create alert | ✅ | ❌ | ✅ |
| Acknowledge alert | ✅ | ✅ | ✅ |
| Create / transition investigation | ✅ | ❌ | ✅ |
| Add investigation note | ✅ | ⚠ scoped | ✅ |
| Read reports | ✅ | ⚠ scoped | ✅ |
| Update settings | ❌ | ❌ | ✅ |
| Simulation control | ❌ | ❌ | ✅ |
| Demo reset | ❌ | ❌ | ✅ |

⚠ scoped = limited to objects reachable through alerts whose `recipients` include `BANK`.

### 4.1 The prototype role switch

`POST /api/role` sets the active role. **This is not authentication.** It is stated as a prototype affordance in the UI, in `security/auth-strategy.md`, in ADR-019, and here. Its purpose is to let an evaluator observe that authorisation boundaries exist and are enforced server-side — a request with `x-cyberpulse-role: BANK` genuinely receives 403 on `POST /api/investigations` (AC-015-02, TC-SEC-011).

What it does **not** do is prevent a caller from choosing a different role, except ADMIN, which needs the demo access code and a signed, expiring cookie (ADR-023). Any real deployment replaces it with an identity provider before any real data is present, and the classification gate described in `architecture/integrations.md` §3.1 is designed to make that non-optional.

---

## 5. Data Protection

| Control | Implementation |
|---|---|
| No PII by construction | No name, address, phone, email or government-ID column exists in any table |
| Generation-time scan | `pii_scan.py` blocks seeding on any match; non-bypassable in CI (AC-016-06) |
| Analytics without identity | Event schema carries role and route pattern, never a person or a resolved path |
| Logs without content | Structured logs carry `requestId`, route, role, duration and outcome — never request bodies |
| Transport | TLS everywhere; the ML service is reachable only from the web runtime |
| At rest | Managed encryption at the database provider |
| Secrets | Environment variables only; `.env.example` is the only committed file; a secret scanner runs in CI |
| Client bundle | No secret is referenced from a `NEXT_PUBLIC_*` variable; a build check asserts this |

---

## 6. Audit

Audited actions: alert dispatch, alert acknowledgement, investigation status change, settings update, demo reset, role switch.

Each record captures actor role, action, subject type, subject ID, UTC timestamp and a metadata object. Records are written **inside the same transaction as the action**, and `auditService.record` has no signature that permits writing outside one (`architecture/low-level-design.md` §3). The application's database role holds `INSERT` and `SELECT` on `audit_events` and nothing else, so there is no application path that can amend or remove a record.

---

## 7. Rate Limiting

| Endpoint class | Limit | Rationale |
|---|---|---|
| `POST /api/predict` | 20/min/role | Protects the ML service, the scarcest resource |
| `POST /api/alerts` | 10/min/role | Prevents recipient flooding (FR-14.5) |
| Mutations generally | 30/min/role | Contains scripted abuse |
| Reads | 120/min/role | Generous; catches runaway clients |
| `/api/health` | 600/min | Monitoring must not be throttled |

429 responses carry `Retry-After` and write no data. Limits are applied through a `withRateLimit` wrapper, so adding an endpoint forces an explicit limit decision.

---

## 8. Application Security Controls

| Threat | Control |
|---|---|
| SQL injection | Drizzle parameterisation throughout; sort columns allow-listed; no raw SQL outside the reviewed traversal CTE, which is itself parameterised |
| XSS | React escaping; no `dangerouslySetInnerHTML` anywhere; a lint rule forbids it; user notes rendered as text |
| CSRF | Same-site cookies; state-changing routes accept JSON only and reject form content types |
| IDOR | Object scope check on every `:id` route; 404 for out-of-scope (TC-SEC-012) |
| Mass assignment | Zod schemas are strict; unknown keys are rejected, not stripped |
| Open redirect | No user-controlled redirect target exists |
| SSRF | The only outbound server call is to `ML_SERVICE_URL`, which is configuration, never user input |
| Path traversal | No file upload and no file serving from user input |
| Clickjacking | `X-Frame-Options: DENY`, CSP `frame-ancestors 'none'` |
| Dependency risk | CI fails on high or critical advisories (NFR-24) |
| Prompt injection | Not applicable — there is no LLM in any path (`architecture/integrations.md` §7) |

### 8.1 Security headers

```
Content-Security-Policy: default-src 'self'; img-src 'self' data: https://*.tile-provider;
  script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self' https://*.tile-provider;
  frame-ancestors 'none'; base-uri 'self'; form-action 'self'
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(), camera=(), microphone=(), payment=()
```

`style-src 'unsafe-inline'` is required by MapLibre's runtime style injection. This is a knowingly accepted deviation, recorded in `security/security-checklist.md` with its justification rather than left as an unexplained weakening.

---

## 9. Error Handling as a Security Control

One function produces every error response (`architecture/low-level-design.md` §5.3). It maps an internal error to a code and a safe message, logs the detail server-side against the request ID, and returns nothing else. There is no code path that serialises an exception to a client.

Verified by TC-SEC-004, which drives every endpoint into its error branches and asserts that no response body contains a stack frame, a SQL keyword, a file path, or a dependency version string.

---

## 10. Declared Security Limitations

Stating these is part of the security posture, not an admission against it. This list is reproduced verbatim from `security/security-checklist.md` §4, which is authoritative; `security/compliance.md` §6 carries the same twelve entries. TC-DOC-018 asserts the three copies agree.

| # | Gap | Impact | Why accepted | Remedy | Target |
|---|---|---|---|---|---|
| G-1 | No authentication | Anyone reaching the URL can use the prototype and select any role | No real data exists; explicitly permitted for the prototype (ADR-019) | OIDC with verified role claims | V1 |
| G-2 | Audit attributes role, not identity | Demonstrates the mechanism, not real accountability | Follows from G-1 | Pseudonymous subject in audit events | V1 |
| G-3 | No multi-tenant isolation | LEA sees the whole corpus | Single synthetic dataset | Row-level security keyed on state | V1 |
| G-4 | No retention policy | `audit_events` and `analytics_events` grow unbounded | Prototype lifespan | Retention plus archival | V1 |
| G-5 | No breach-notification process | No notification capability | No data subjects | Incident response procedure | V1 |
| G-6 | No DPIA | Legal obligation unmet for real data | No personal data processed | Conduct before any real adapter | V1 |
| G-7 | No bias evaluation | Differential impact unknown | Untestable on synthetic data | Requires real labelled outcomes | V2 |
| G-8 | No penetration test | Unknown vulnerabilities | Hackathon scope | Third-party assessment | V1 |
| G-9 | `style-src 'unsafe-inline'` in CSP | Slightly weakened policy | Required by MapLibre's runtime style injection | Track upstream for nonce support | Monitor |
| G-10 | No key rotation process | Static environment secrets | No production secrets exist | Managed secret rotation | V1 |
| G-11 | No data residency guarantee | Possible cross-border processing | Hosting is configurable | India-resident infrastructure | V1 |
| G-12 | Free-text notes could contain personal data | The one non-structural PII risk | Free text cannot be schema-constrained | Guidance, plus departmental record-handling policy | V1 |

G-1 and G-7 are the two that most constrain what this prototype may claim. G-1 is accepted because no real data exists; G-7 is accepted because synthetic data cannot answer it, and it is the most serious open question in the project.
