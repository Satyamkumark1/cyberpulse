# SECURITY CHECKLIST — CyberPulse AI

| Field | Value |
|---|---|
| Version | 1.0 |
| Use | Per pull request, per phase exit, and before release |
| Related | `security/threat-model.md`, `security/security-test-cases.md`, `engineering/code-review-checklist.md` |

---

## 1. Per Pull Request

Every item is a yes/no with no partial credit. A "no" blocks merge unless a decision-log entry records the exception.

**Input**
- [ ] Every new or changed endpoint validates query, path and body with a shared Zod schema
- [ ] Schemas are strict — unknown keys are rejected, not stripped
- [ ] Any new sortable column is added to the allow-list, never interpolated
- [ ] Numeric parameters have explicit bounds
- [ ] Any new free-text field has a length cap

**Authorisation**
- [ ] Every new service function declares a capability or is explicitly marked public
- [ ] Capability check returns 403; object-scope failure returns 404
- [ ] Scope is applied as a query predicate, not as a post-filter
- [ ] Pagination `total` is computed after the scope predicate
- [ ] No authorisation logic added to a component or a route handler

**Data**
- [ ] No new column resembling personal data
- [ ] No new field in a graph node payload that could hold a name
- [ ] Money stored as integer paise; time stored as UTC `timestamptz`
- [ ] Any new delete path is scoped and justified in the PR description

**Audit**
- [ ] Any new privileged action calls `auditService.record` with a transaction handle
- [ ] The action and its audit write are in one transaction

**Errors and logging**
- [ ] Errors flow through the single serialiser; nothing bespoke
- [ ] No new log statement emits a request body or a resolved path
- [ ] New error codes are added to the closed set and documented

**Secrets and dependencies**
- [ ] No secret added to a `NEXT_PUBLIC_*` variable
- [ ] `.env.example` updated for any new variable, with a placeholder value
- [ ] New dependencies justified in the PR description and clear of high/critical advisories

**Client**
- [ ] No `dangerouslySetInnerHTML`
- [ ] No user-controlled redirect target
- [ ] No new outbound host without a CSP update and a stated reason

**Domain safety**
- [ ] No hard-coded prediction, score, hotspot name or metric value
- [ ] Terminology lexicon respected; no accusatory language
- [ ] Prototype badge and disclaimer still present on any new route
- [ ] Any new failure path shows no fabricated values

---

## 2. Per Phase Exit

- [ ] All security test cases for the phase pass (`implementation/phase-test-matrix.md`)
- [ ] Threat model reviewed for new attack surface introduced in the phase
- [ ] New endpoints appear in `architecture/api-design.md` §10 with a rate limit
- [ ] New capabilities appear in `security/authorization.md` §2
- [ ] Dependency audit clean
- [ ] Secret scan clean
- [ ] No new declared gap that is absent from §4 of this document

---

## 3. Pre-Release

**Verification**
- [ ] All 29 cases in `security/security-test-cases.md` pass
- [ ] TC-SEC-011 passes across the full 22 × 3 capability matrix
- [ ] TC-SEC-022 confirms zero personal-data columns across all sixteen tables
- [ ] TC-SEC-020 confirms the PII scan blocks a deliberately tainted corpus
- [ ] TC-SEC-018 confirms malformed ML responses are rejected and never persisted
- [ ] TC-SEC-042 confirms demo reset cannot touch seed data
- [ ] TC-UX-012 confirms no prohibited claims in any rendered text
- [ ] TC-UX-013 confirms no accusatory terminology

**Configuration**
- [ ] Security headers verified on the deployed origin (TC-SEC-041)
- [ ] TLS enforced on every hop; HSTS present
- [ ] ML service not reachable from the public internet (TC-SEC-017)
- [ ] Database connection uses `sslmode=require`
- [ ] Model artefact directory read-only; `model_version` matches the image tag
- [ ] Application database role holds `INSERT`/`SELECT` only on `audit_events`

**Documentation**
- [ ] Declared gaps in §4 are identical in `architecture/security-architecture.md` §10, `security/compliance.md` §6 and here
- [ ] `security/privacy-policy-draft.md` still marked NOT OPERATIVE
- [ ] Responsible-use statement present in `PROJECT_BRIEF.md` and in the product

---

## 4. Declared Gaps

This list is authoritative. It is reproduced identically in `architecture/security-architecture.md` §10 and `security/compliance.md` §6, and the pre-release checklist verifies that the three copies agree.

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

G-7 deserves emphasis. It is not a routine gap: whether the model concentrates attention on particular localities in a way that reflects reporting patterns rather than offending patterns is the most serious open question in the project, and synthetic data cannot answer it. It is stated as such in `ai/evaluation-framework.md` §8 and `security/compliance.md` §4.

---

## 5. Incident Response (prototype)

No real incident response process exists. If a security issue is found during the project:

1. Record it in `project-management/risk-register.md` with a severity.
2. If it affects the demonstration path, fix it before any other work.
3. If it is a declared gap, confirm it appears in §4 and move on.
4. If it is a new class of issue, update `security/threat-model.md` and add a test case before fixing, so the fix is verified rather than assumed.

Step 4 is the order that matters. A security fix without a test is a security fix that regresses.

---

## 6. Quick Reference — Non-Negotiables

Six rules that hold regardless of deadline pressure.

1. **No fabricated value ever reaches a screen.** Degraded means numberless.
2. **Authorisation is server-side.** Hiding a button is not a control.
3. **A privileged action without its audit event cannot commit.**
4. **No personal-data column, ever.** Not "for now", not "temporarily".
5. **Errors disclose nothing.** One serialiser, closed code set.
6. **Declared gaps stay declared.** Removing a gap from §4 requires fixing it, not editing the list.
