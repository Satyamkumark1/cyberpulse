# THREAT MODEL — CyberPulse AI

| Field | Value |
|---|---|
| Version | 1.0 |
| Method | STRIDE per trust boundary, plus domain-specific threats that STRIDE does not cover |
| Scope | The prototype as deployed: no authentication, synthetic data only, three roles |
| Related | `architecture/security-architecture.md`, `security/security-test-cases.md` |

---

## 1. Assets

| # | Asset | Value | Notes |
|---|---|---|---|
| A-1 | Prediction integrity | **Highest** | A wrong or fabricated prediction sends a field team to the wrong place. This is the asset the product exists to protect. |
| A-2 | Explanation integrity | High | An explanation that does not describe the actual model output is worse than no explanation |
| A-3 | Audit record completeness | High | The record of who dispatched what, when |
| A-4 | Alert integrity | High | Severity and exposure must reflect the model, not the sender |
| A-5 | Case data | Medium (prototype) / Critical (real) | Synthetic today; the controls must be shaped for the real case |
| A-6 | Availability during evaluation | High | A failed demonstration is a total project failure |
| A-7 | Model artefacts | Medium | Replaceable from training, but a swapped artefact is a silent integrity failure |
| A-8 | The absence of personal data | **Highest** | The single property that makes the prototype safe to demonstrate publicly |

A-8 is unusual as an asset because it is a *negative* property, and negative properties are the easiest to lose accidentally. It is protected structurally: no column exists, and the seeding pipeline blocks on a scan.

---

## 2. Trust Boundaries

| ID | Boundary | Crossing |
|---|---|---|
| TB-1 | Browser → Next.js | All user input |
| TB-2 | Next.js → PostgreSQL | All queries |
| TB-3 | Next.js → ML service | Prediction payloads |
| TB-4 | Build pipeline → ML image | Model artefacts |
| TB-5 | Generator → Database | Seed data |

---

## 3. STRIDE Analysis

### TB-1 · Browser → Next.js

| STRIDE | Threat | Likelihood | Impact | Control | Test |
|---|---|:--:|:--:|---|---|
| **S**poofing | Caller selects an arbitrary role via `x-cyberpulse-role` | High | Medium | **Accepted in the prototype** (ADR-019). No real data exists. Authorisation is still enforced server-side so the boundary is demonstrably real. V1 replaces this with verified identity. | TC-SEC-010 |
| **T**ampering | Client supplies `severity` or `exposurePaise` on alert creation | Medium | High | Server-derived fields are **rejected with 400**, not ignored | TC-SEC-014 |
| **T**ampering | Sort parameter used to inject an ordering clause | Medium | High | Allow-listed sort columns mapped to column references | TC-SEC-013 |
| **R**epudiation | Officer denies dispatching an alert | Low | High | Audit event written in the same transaction; no application path amends it | TC-SEC-030 |
| **I**nformation disclosure | Error response leaks SQL, paths or versions | Medium | Medium | One error-serialisation function; detail logged server-side only | TC-SEC-004 |
| **I**nformation disclosure | BANK role enumerates out-of-scope complaints | Medium | High | Object-scope check returning **404, not 403** | TC-SEC-012 |
| **D**enial of service | Prediction endpoint flooded, exhausting the ML service | Medium | High | 20/min/role rate limit; 8 s timeout; bounded candidate generation | TC-SEC-031 |
| **D**enial of service | Unbounded graph traversal | Medium | High | Depth bound + visited set + `LIMIT 500` + time budget | TC-PERF-005 |
| **D**enial of service | Huge `pageSize` or 365-day report range | Medium | Medium | `pageSize` max 100; range capped server-side | TC-API-005 |
| **E**levation | BANK performs an LEA-only action | High | High | Capability check in the service layer, not the UI | TC-SEC-011 |

### TB-2 · Next.js → PostgreSQL

| STRIDE | Threat | Control | Test |
|---|---|---|---|
| Tampering | SQL injection through any input | Drizzle parameterisation; no string-built SQL; the one raw CTE is parameterised and reviewed | TC-SEC-002 |
| Information disclosure | Mass assignment writing unintended columns | Strict Zod schemas reject unknown keys rather than stripping them | TC-SEC-015 |
| Repudiation | Audit record altered or removed | Application database role holds `INSERT` and `SELECT` on `audit_events` only | TC-SEC-016 |
| Denial of service | Runaway query | 5 s statement timeout; indexed predicates; `EXPLAIN ANALYZE` evidence required in review | TC-PERF-011 |

### TB-3 · Next.js → ML service

| STRIDE | Threat | Likelihood | Impact | Control | Test |
|---|---|:--:|:--:|---|---|
| Spoofing | A third party calls the ML service directly | Low | Medium | Service not publicly routable; origin allow-listed | TC-SEC-017 |
| Tampering | Compromised ML service returns crafted predictions | Low | **High** | Response validated against the shared schema on arrival; schema refinements enforce factor count and sum; service holds no DB credentials so it cannot write state | TC-SEC-018 |
| Information disclosure | Payload carries personal data | — | — | Structurally impossible: no source field exists | TC-SEC-020 |
| Denial of service | ML service saturated | Medium | High | Rate limit upstream; timeout; degraded mode never fabricates | TC-INT-020 |

The tampering row is the most architecturally significant in this document. A compromised ML service is constrained to returning *wrong* answers, and even that is narrowed by schema validation. It cannot exfiltrate, cannot delete, and cannot persist anything the web application did not author.

### TB-4 · Build pipeline → ML image

| Threat | Control | Test |
|---|---|---|
| Model artefact swapped after training | Artefacts baked into the image; `model_version` is a property of the image tag; reported on every prediction and in Settings | TC-SEC-019 |
| Training on a corpus that failed validation | `signal_check` and `pii_scan` gates are non-bypassable in CI | TC-DATA-009 |
| Model below metric gates released | `evaluate.py` exits non-zero; release blocked | TC-ML-050 |
| Artefact directory writable at runtime | Mounted read-only in Compose; baked immutably in the image | TC-SEC-019 |

### TB-5 · Generator → Database

| Threat | Control | Test |
|---|---|---|
| Real or realistic personal data enters the corpus | `pii_scan.py` blocks seeding on any match | TC-SEC-020 |
| Corrupted or substituted data files | `manifest.json` SHA-256 verified before insert | TC-DATA-002 |
| Non-reproducible corpus | Explicit RNG seeding; byte-identical regeneration asserted | TC-DATA-002 |

---

## 4. Domain-Specific Threats

STRIDE does not cover these, and for this product they matter more than most of the categories above.

### DT-1 · Fabricated intelligence

**Threat.** The system displays a prediction, hotspot or window that no model produced — a hard-coded placeholder, a cached stale value, or an optimistic UI value.

**Why it is the worst case.** It is undetectable to the user, it is exactly what an officer would act on, and it destroys the product's only real claim.

**Controls.** `no_hardcode_check.sh` scans `apps/web` for hotspot names and risk literals outside fixtures (TC-INT-010); the response returned to the client is the persisted row (TC-INT-013); predictions are never cached; optimistic UI is forbidden for prediction values; degraded mode renders no numbers at all (TC-UX-006); model metrics are read from the database (TC-INT-011).

### DT-2 · Misrepresentation of the system's status

**Threat.** UI text or documentation implies official endorsement, real data access, guaranteed prevention or guaranteed recovery.

**Controls.** Prohibited-phrase scan across all rendered text (TC-UX-012); fixed disclosure strings asserted character-for-character (TC-UX-011); the synthetic badge on every route; the classification gate in `architecture/integrations.md` §3.1.

### DT-3 · Accusatory output

**Threat.** The interface characterises an individual as criminal on the basis of a model score.

**Controls.** Terminology lexicon enforced by text scan (TC-UX-013); no personal-name field exists in any graph node payload (TC-SEC-021); the neutrality note on node detail and alert modal; no autonomous action anywhere (NG-02).

### DT-4 · Automation bias

**Threat.** Officers stop exercising judgement and treat the ranked list as instruction.

**Controls.** Confidence is displayed on every prediction; factors are always present and are the product's most prominent secondary element; alternatives are ranked and visible, so the top result is visibly one of several; published metrics state real error rates; the supervisor review path exists (UC-03). This is a *design* mitigation, not a technical one, and it is the honest limit of what software can do about it.

### DT-5 · Demonstration-time failure

**Threat.** Cold start, venue network failure or a missing artefact causes the demonstration to fail or — worse — to appear to succeed with stale values.

**Controls.** Warm-up ping; health polling; T−30 rehearsal; local Docker stack standby; degraded mode that is explicit and numberless.

### DT-6 · Prototype mistaken for a real reporting channel (FEAT-17)

**Threat.** A real victim finds `/safety`, files a report, and believes police or their bank have been told — losing the first hour in which the money could be held.

**Controls.** Every `/safety` route carries the fixed notice that the prototype does not forward reports; Report Now puts 1930 before the form; the confirmation repeats it. Asserted by TC-SAFE-035.

### DT-7 · Abuse of the public write (FEAT-17)

**Threat.** `POST /api/citizen/reports` is the only write reachable without choosing a role: spam complaints, attempts to smuggle personal data or server-derived fields, and guessing other citizens' tracking codes.

**Controls.** 5/min per IP; strict schema with no free-text field; derived fields rejected with 400; all rows `DEMO`-origin and cleared by reset; 80-bit tracking codes stored as SHA-256 hashes and never in URLs; wrong code ≡ unknown ID. TC-SAFE-011 … TC-SAFE-017.

---

## 5. Attack Trees

### AT-1 · Cause an officer to act on false intelligence

```
Goal: officer deploys to the wrong location
├── Fabricated value reaches the UI
│   ├── Hard-coded placeholder ........... BLOCKED: no_hardcode_check (TC-INT-010)
│   ├── Stale cached prediction .......... BLOCKED: predictions never cached
│   ├── Optimistic UI .................... BLOCKED: forbidden for prediction values
│   └── UI recomputes a displayed figure . BLOCKED: render only from the response (TC-INT-013)
├── Model manipulated
│   ├── Artefact swapped ................. MITIGATED: baked into the image, version reported
│   ├── Poisoned training data ........... MITIGATED: deterministic generator, signal check
│   └── Compromised ML service ........... MITIGATED: response schema validation; no write access
└── Alert altered in transit
    ├── Client sets severity ............. BLOCKED: rejected with 400 (TC-SEC-014)
    └── Client sets exposure ............. BLOCKED: rejected with 400 (TC-SEC-014)
```

### AT-2 · Read case data outside your scope

```
Goal: BANK role reads an unrelated complaint
├── Direct API call ...................... BLOCKED: object scope check → 404 (TC-SEC-012)
├── Enumerate IDs via 403/404 difference . BLOCKED: both return 404
├── Aggregate endpoint leakage ........... MITIGATED: aggregates scoped; no per-record enumeration
├── Graph traversal to out-of-scope nodes . MITIGATED: traversal scoped to permitted roots
└── Error message disclosure ............. BLOCKED: single error serialiser (TC-SEC-004)
```

---

## 6. Risk Register (security subset)

| ID | Threat | L | I | Risk | Treatment |
|---|---|:--:|:--:|:--:|---|
| SR-01 | Fabricated intelligence (DT-1) | Low | Critical | **High** | Mitigate — five independent controls, all tested |
| SR-02 | Role spoofing | High | Medium | **High** | **Accept** for the prototype; documented in four places; V1 remedy scoped |
| SR-03 | Elevation across roles | Medium | High | **High** | Mitigate — server-side capability checks |
| SR-04 | Prediction endpoint DoS | Medium | High | **High** | Mitigate — rate limit, timeout, bounds |
| SR-05 | Misrepresentation (DT-2) | Medium | High | **High** | Mitigate — automated text scans |
| SR-06 | Accusatory output (DT-3) | Low | Critical | **High** | Mitigate — lexicon scan, schema-level absence of names |
| SR-07 | Personal data ingress | Low | Critical | **High** | Mitigate — no columns, blocking scan |
| SR-08 | SQL injection | Low | Critical | Medium | Mitigate — parameterisation, allow-lists |
| SR-09 | Audit gap | Low | High | Medium | Mitigate — transactional audit, restricted grants |
| SR-10 | Automation bias (DT-4) | Medium | High | **High** | Mitigate by design; residual risk accepted and stated |
| SR-11 | Demonstration failure (DT-5) | Medium | High | **High** | Mitigate — warm-up, rehearsal, local fallback |
| SR-12 | No penetration test | — | — | Medium | **Accept** — declared limitation; V1 remedy |
| SR-13 | Prototype mistaken for a real reporting channel (DT-6) | Medium | High | **High** | Mitigate — fixed notice on every citizen route, 1930 first |
| SR-14 | Public write abuse (DT-7) | Medium | Medium | Medium | Mitigate — rate limit, strict schema, hashed codes, DEMO origin |

---

## 7. Residual Risk Statement

After all controls, three risks remain materially open.

**SR-02, role spoofing.** Accepted deliberately. Its consequence is bounded by the absence of real data, and the mechanism is labelled as a prototype affordance in the UI, in ADR-019, in `security/auth-strategy.md` and in `architecture/security-architecture.md` §10. It is not presented anywhere as a security control.

**SR-10, automation bias.** Only partially addressable in software. Confidence display, always-present explanations, visible alternatives and published error rates all push against it, but the residual risk is a training and doctrine question rather than an engineering one. The product's refusal to take autonomous action (NG-02) is the structural limit on how much damage it can do.

**SR-12, no independent assessment.** Declared. A hackathon prototype has not been penetration tested, and saying so is more useful than implying otherwise.

Every other identified threat has at least one control with at least one test case.
