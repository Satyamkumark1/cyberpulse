# RULE — SECURITY

Read with `architecture/security-architecture.md`, `security/authorization.md` and `security/security-checklist.md`.

---

## Six non-negotiables

1. **No fabricated value ever reaches a screen.** Degraded means numberless.
2. **Authorisation is server-side.** A hidden button is not a control.
3. **A privileged action without its audit event cannot commit.**
4. **No personal-data column. Ever.** Not "for now".
5. **Errors disclose nothing.** One serialiser, closed code set.
6. **Declared gaps stay declared.** Removing one from the list requires fixing it, not editing the list.

---

## Two-stage authorisation

```
Capability check → may this role do this at all?       → 403
Scope check      → may this role act on this object?   → 404
```

**404, not 403, for out-of-scope objects.** A 403 confirms the object exists, which is an information leak in an enforcement context. The two 404 bodies must be byte-identical.

Scope is a **query predicate**, never a post-filter — a post-filter still runs the unscoped query and leaks through `total` and through timing. `total` is computed after the predicate.

---

## Input

- Zod on everything. Strict schemas: unknown keys rejected, not stripped.
- Sort columns allow-listed. This is the ordering-injection control.
- Bounds on every numeric: `pageSize` ≤ 100, `depth` ≤ 6, date span ≤ 365 days, bbox clamped to India.
- **Server-derived fields rejected with 400**, never ignored.

---

## Audit

Six actions are audited: alert dispatch, alert acknowledgement, investigation status change, settings update, demo reset, role switch.

`auditService.record` requires a transaction handle **by signature**. There is no overload that writes outside one, and adding one would be a Critical defect. The application's database role holds `INSERT` and `SELECT` on `audit_events` only.

---

## Data protection

- The schema has nowhere to put personal data. Adding a column requires a migration, a review, a threat-model update and a decision-log entry.
- `pii_scan.py` blocks seeding. Non-bypassable in CI.
- Logs carry route **patterns**, never resolved paths — so a complaint ID never enters the log store.
- Analytics carry role, never identity; buckets, never raw values; `bodyLength`, never body.
- No secret in a `NEXT_PUBLIC_*` variable. The build asserts it.

---

## The ML boundary

The ML service holds no database credentials and cannot write state. A compromise yields wrong predictions — detectable by response-schema validation in the client — but not exfiltration, deletion or persistence.

**Validate the ML response on arrival.** This is a security control, not a type nicety.

---

## Authentication — read this before assuming

**There is no authentication.** The role selector is a demonstration affordance (ADR-019). Never describe it as authentication, never make it look like a credential, never add `httpOnly` to the role cookie — dressing a non-security value in security clothing makes reviewers trust it more than they should.

Authorisation over an asserted role is still enforced and still tested (66 cases). That is what makes the boundary demonstrable.

---

## Adding a security fix

**Write the test first.** A security fix without a reproducing test is a security fix that regresses, and regressions in this category are the ones nobody notices.

Then update `security/threat-model.md` if the threat is new.

---

## Before you finish

- [ ] Input validated; schema strict
- [ ] New sortable column allow-listed
- [ ] Capability declared; 403 for capability, 404 for scope
- [ ] Scope as a predicate; `total` scoped
- [ ] Privileged action audited inside its transaction
- [ ] No new personal-data column or node-payload name field
- [ ] Errors through the single serialiser
- [ ] No secret in a public variable
- [ ] New outbound host has a CSP entry and a stated reason
- [ ] Rate limit chosen explicitly
