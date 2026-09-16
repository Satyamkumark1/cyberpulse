# RULE — DATABASE

Applies to `packages/db/**` and every migration.
Read with `architecture/database-design.md`.

---

## Invariants

1. **Money is `bigint` paise.** Never float, never numeric-with-decimals. Formatting happens at the presentation edge.
2. **Time is `timestamptz` UTC.** IST rendering happens at the edge.
3. **No personal-data column. Ever.** No name, address, phone, email, government ID, real account number or IP. Not "temporarily". TC-SEC-022 introspects the whole schema.
4. **Constraints live in the database**, not only in Zod. If it is an invariant, Postgres enforces it.
5. **No hard deletes** except the demo reset, scoped by `origin = 'DEMO'`.
6. **Every index names the query it serves.** An index whose query is deleted is deleted with it.

---

## Constraints that are correctness, not decoration

| Constraint | Prevents |
|---|---|
| `predicted_end - predicted_start <= interval '4 hours'` | An over-wide window reaching a user |
| `UNIQUE (investigations.complaint_id)` | Two cases for one complaint under concurrency |
| `array_length(recipients, 1) >= 1` | An alert addressed to nobody |
| `threshold_high > threshold_medium` | An incoherent risk scale |
| `length(trim(body)) > 0` | An empty note |
| `from_account_id <> to_account_id` | A self-transfer |
| India-bounds `CHECK` on coordinates | A generator bug silently breaking the map |

Each is also validated in application code. The database copy is the backstop for when validation has a bug — which is the case they exist for.

---

## Queries

- Drizzle only. No string-built SQL. The one raw recursive CTE lives in `queries/network.ts`, is parameterised, and is individually reviewed.
- Explicit joins; fetch sets, not items in a loop.
- Every query that can return many rows takes a limit.
- Prepared statements for the hot list and detail paths.
- `EXPLAIN (ANALYZE, BUFFERS)` in the PR for any new query on a table above 10,000 rows. A `Seq Scan` on an indexed predicate is rejected.
- Never `SELECT *`.

### The traversal CTE

Three independent protections, all required: depth bound (≤ 6), visited-set cycle guard, `LIMIT 500`. Any one alone is insufficient — a cyclic chain within the depth bound loops without the visited set; a wide fan-out within both bounds returns unbounded rows without the limit.

Changing it requires a fresh `EXPLAIN ANALYZE` against a 10× corpus and a re-run of TC-PERF-005 and TC-INT-060.

---

## Transactions

| Operation | Boundary |
|---|---|
| Prediction | `predictions` + `risk_factors` |
| Alert dispatch | `alerts` + `audit_events` + investigation upsert |
| Investigation transition | `investigations` + `audit_events` |
| Demo reset | Scoped delete, all or nothing |
| Seeding | Truncate and insert in dependency order |

Concurrency is optimistic: `investigations.updated_at` is supplied as `expectedUpdatedAt` and a mismatch returns 409. No pessimistic locking anywhere — no operation has contention that justifies it.

---

## Migrations

- `drizzle-kit generate` → review the SQL → commit → `drizzle-kit migrate`.
- Name `NNNN_verb_subject.sql`.
- **Additive first.** A required column arrives in three steps: add nullable → backfill → set not null. This is what lets a web rollback happen without stranding the schema.
- Every migration has a documented rollback.
- Destructive changes require a `project-management/decision-log.md` entry.
- Enums extend with `ALTER TYPE ... ADD VALUE`; removal needs a type rebuild and is documented as such.
- CI applies every migration to a clean database on every PR.

---

## Seeding

Idempotent. Truncate in reverse dependency order inside one transaction, then insert. Verify every `manifest.json` SHA-256 before inserting — a substituted file is rejected, not loaded.

Pipeline gates, non-bypassable in CI: `signal_check.py` before training, `pii_scan.py` before seeding.

---

## Before you finish

- [ ] No new personal-data column
- [ ] Invariants expressed as constraints, not only validation
- [ ] New index names its query
- [ ] New query has a limit and an `EXPLAIN ANALYZE`
- [ ] Multi-write wrapped in a transaction
- [ ] Migration additive-first with a rollback note
- [ ] ERD and `architecture/database-design.md` updated in the same PR
