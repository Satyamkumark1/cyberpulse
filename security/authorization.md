# AUTHORIZATION — CyberPulse AI

| Field | Value |
|---|---|
| Version | 1.0 |
| Model | Role-based capability checks plus object-level scope checks, both evaluated server-side |
| Roles | LEA · BANK · ADMIN · GUARD · I4C · CITIZEN (GUARD/I4C added by ADR-021, CITIZEN by ADR-022 — same asserted-not-verified mechanism, no new identity stored) |
| Related | `security/auth-strategy.md` (how a role is asserted — and why that is not authentication) |

---

## 1. The Two-Stage Check

Every protected operation passes through two independent decisions.

```
Stage 1 — CAPABILITY : may this role perform this kind of action at all?   → 403 FORBIDDEN
Stage 2 — SCOPE      : may this role act on this specific object?          → 404 NOT_FOUND
```

Both run in the service layer. Neither runs in a component, and neither is implemented by hiding UI.

**Why Stage 2 returns 404 rather than 403.** A 403 confirms that the object exists. In an enforcement context that is a meaningful disclosure — it tells a BANK-scoped caller which complaint IDs are real. Returning 404 makes "exists but not yours" indistinguishable from "does not exist" (TC-SEC-012).

---

## 2. Capability Matrix

| Capability | LEA | BANK | ADMIN | GUARD | I4C | CITIZEN | Enforced at |
|---|:--:|:--:|:--:|:--:|:--:|:--:|---|
| `complaints:list` | ✅ | ⚠ | ✅ | ❌ | ✅ | ❌ | `complaintService.list` |
| `complaints:read` | ✅ | ⚠ | ✅ | ❌ | ✅ | ❌ | `complaintService.getWithContext` |
| `complaints:updateStatus` | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | `complaintService.updateStatus` |
| `transactions:list` | ✅ | ⚠ | ✅ | ❌ | ✅ | ❌ | `transactionService.list` |
| `transactions:network` | ✅ | ⚠ | ✅ | ❌ | ✅ | ❌ | `transactionService.getNetwork` |
| `prediction:run` | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | `predictionService.predict` |
| `hotspots:read` | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | `hotspotService.list` |
| `alerts:create` | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | `alertService.create` |
| `alerts:read` | ✅ | ⚠ | ✅ | ❌ | ✅ | ❌ | `alertService.list` |
| `alerts:acknowledge` | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | `alertService.acknowledge` |
| `alerts:close` | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | `alertService.close` |
| `investigations:create` | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | `investigationService.create` |
| `investigations:read` | ✅ | ⚠ | ✅ | ❌ | ✅ | ❌ | `investigationService.get` |
| `investigations:transition` | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | `investigationService.transition` |
| `investigations:addNote` | ✅ | ⚠ | ✅ | ❌ | ❌ | ❌ | `investigationService.addNote` |
| `reports:read` | ✅ | ⚠ | ✅ | ❌ | ✅ | ❌ | `reportService.summary` |
| `metrics:read` | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | `reportService.metrics` |
| `settings:read` | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | `settingsService.get` |
| `settings:write` | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | `settingsService.update` |
| `simulation:control` | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | `transactionService.simulation` |
| `demo:reset` | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | demo route handler |
| `health:read` | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | health handler |
| `citizenReports:create` | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | `citizenReportService.submit`, `.cities` |
| `citizenReports:status` | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | `citizenReportService.status` |

✅ full · ⚠ scoped (see §3) · ❌ denied with 403

GUARD (ADR-021) is read-only and identity-free: only `hotspots:read`, `metrics:read`,
`settings:read`, `health:read`. It deliberately lacks `complaints:read`, which is why it does
not reach `/risk-map` — the hotspot drawer behind that route returns complaint-linked data
(`fraudType`, `amountPaise`) gated only by `hotspots:read`. I4C (PER-02, national-scope
analyst) is a strict subset of LEA's profile with every write/case-management capability
denied; it is unscoped, in the same bucket as LEA/ADMIN in §3, not BANK's.

CITIZEN (ADR-022, FEAT-17) is denied all 22 officer capabilities and is the only role holding the
two citizen-report capabilities. Its object scope is not a query predicate on a role but a secret:
status lookup requires the one-time tracking code, compared as a hash, and a mismatch is the same
404 as an unknown ID. The matrix is 24 × 6 = 144 cases (`services/lib/auth.test.ts`).

---

## 3. Object Scope Rules

Scope applies only to BANK. LEA and ADMIN see the full single-tenant corpus in v1.0 — a limitation, not a design goal, and the reason state-level partitioning is V1 scope.

### BANK scope definition

A BANK caller may act on an object if and only if it is reachable from an alert addressed to a destination the bank acts on — `BANK` or `ATM_SITE`.

`ATM_SITE` is in that set because the bank operates the ATM site and performs the cascade to its duty post (`decision-log.md` DEC-010). A bank cannot perform that cascade for an alert it cannot see. The set is defined once, as `BANK_VISIBLE_RECIPIENTS` in `services/lib/scope.ts`, and every BANK scope site consumes it; LEA and ADMIN retain their documented access.

```
visible_alerts        := alerts where recipients && ARRAY['BANK','ATM_SITE']
visible_predictions   := predictions referenced by visible_alerts
visible_complaints    := complaints referenced by visible_predictions
visible_investigations:= investigations referenced by visible_alerts
visible_transactions  := transactions whose complaint_id ∈ visible_complaints
visible_graph_roots   := visible_complaints
```

Implemented as a reusable scope predicate composed into each query, not as a post-filter on results. Post-filtering would still perform the unscoped query, which leaks through timing and through `total` counts in pagination metadata.

```ts
// services/lib/scope.ts
export function complaintScope(role: ActorRole) {
  if (role === 'BANK') {
    return inArray(complaints.id,
      db.select({ id: predictions.complaintId })
        .from(alerts)
        .innerJoin(predictions, eq(alerts.predictionId, predictions.id))
        .where(bankRecipientPredicate()));   // BANK_VISIBLE_RECIPIENTS
  }
  return undefined;   // LEA and ADMIN: unscoped in v1.0
}
```

Pagination `total` is computed **after** the scope predicate, so a BANK caller's row count reveals nothing about the wider corpus.

---

## 4. Implementation Pattern

Every service function that needs authorisation takes a `RequestContext` and calls the guard explicitly. There is no implicit or ambient authorisation.

```ts
export async function create(input: CreateInvestigationInput, ctx: RequestContext) {
  requireCapability(ctx.role, 'investigations:create');      // Stage 1 → 403

  const complaint = await db.complaints.getByBusinessId(
    input.complaintId, complaintScope(ctx.role),             // Stage 2 → 404
  );
  if (!complaint) throw new NotFoundError('complaint');

  ...
}
```

`requireCapability` throws `ForbiddenError`; a missing scoped row throws `NotFoundError`. Both map through the single error serialiser (`architecture/low-level-design.md` §5.3), so neither can accidentally return a body that discloses more than its code.

### 4.1 Rules

| # | Rule | Enforcement |
|---|---|---|
| 1 | No authorisation logic in a component | ESLint: components cannot import `services/lib/auth` |
| 2 | No authorisation logic in a route handler | Review: handlers validate, resolve role, delegate |
| 3 | Scope is a query predicate, never a post-filter | Review + TC-SEC-012 asserts `total` is scoped |
| 4 | Every new service function declares a capability or is explicitly marked public | Review checklist |
| 5 | Unknown role resolves to LEA, never ADMIN | TC-SEC-010 |
| 6 | 403 for capability, 404 for scope — never the reverse | TC-SEC-012 |

Rule 4 is the one that decays without help. `.claude/rules/security.md` requires that adding a service function without a capability decision is treated as an incomplete change.

---

## 5. Sensitive Action Rules

Some operations carry additional requirements beyond the capability check.

| Action | Additional requirement |
|---|---|
| `alerts:create` | Severity and exposure are server-derived; client-supplied values are rejected with 400, not ignored |
| `alerts:acknowledge` | Idempotent — a repeat leaves `acknowledged_at` unchanged |
| `investigations:transition` | Validated against the state machine; optimistic concurrency via `expectedUpdatedAt`; backward moves require a note |
| `settings:write` | ADMIN only; `thresholdHigh > thresholdMedium` enforced by a database `CHECK` as well as validation |
| `demo:reset` | Scoped to `origin = 'DEMO'`, including rows that depend on a DEMO complaint; cannot touch seed data; requires confirmation in the UI |
| `citizenReports:create` | Strict body, no free text; server-derived fields rejected with 400; 5/min per IP; complaint, report and audit event in one transaction |
| `citizenReports:status` | Tracking code only in a POST body, hashed at rest, compared in constant time; wrong code ≡ unknown ID (404) |
| All of the above | Audit event written inside the same transaction |

---

## 6. Authorisation Failure Behaviour

| Condition | Status | Body | Logged |
|---|---|---|---|
| Capability denied | 403 | `{ code: "FORBIDDEN" }` — no object detail | role, capability, route |
| Object out of scope | 404 | `{ code: "NOT_FOUND" }` — identical to genuinely absent | role, object type, route |
| Object genuinely absent | 404 | Identical body | role, object type, route |
| Role unparseable | falls back to LEA | — | warning with the raw value |

The 403 body never names the object, and the two 404 cases are byte-identical. A caller cannot distinguish them, which is the property that makes enumeration fail.

---

## 7. What Authorisation Does Not Protect Against in v1.0

| Gap | Why | Remedy |
|---|---|---|
| A caller choosing a privileged role | No authentication exists (ADR-019) | V1: role from verified identity |
| Cross-state data visibility for LEA | Single-tenant prototype | V1: row-level security keyed on state |
| Per-user accountability | Audit carries role, not identity | V1: pseudonymous subject in audit events |
| Time-bounded access | No sessions | V1: token expiry |

These are the same gaps listed in `security/auth-strategy.md` §3 and `architecture/security-architecture.md` §10, stated identically in all three places.

---

## 8. Verification

| Check | Test |
|---|---|
| Every capability in §2 behaves as tabulated for all five roles | TC-SEC-011 (parameterised across the matrix) |
| BANK cannot read an out-of-scope complaint, and `total` is scoped | TC-SEC-012 |
| 403 bodies contain no object detail | TC-SEC-004 |
| Scoped and absent objects are indistinguishable | TC-SEC-012 |
| Client-supplied derived fields are rejected | TC-SEC-014 |
| Every audited action has its event | TC-SEC-030, TC-SEC-032, TC-SEC-033 |
| No component imports the authorisation module | TC-INT-030 |
