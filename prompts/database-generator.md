# PROMPT — Database Generator

Generates a schema addition or change consistent with `architecture/database-design.md`.

---

```text
Design [TABLE OR CHANGE] for CyberPulse AI.

Read first: architecture/database-design.md (rules, existing tables, index
justifications), diagrams/database-erd.md, .claude/rules/database.md.

Produce:
- Table definition: columns, types, nullability, defaults
- Constraints: primary key, foreign keys with ON DELETE behaviour, CHECKs, UNIQUEs
- Indexes, each naming the query it serves
- Relationships and their cardinality
- Audit fields (created_at; updated_at if mutable)
- Origin column if the rows can be demo-generated
- Migration SQL, additive-first, with a rollback note
- ERD update
- Seed impact

Rules:
1. Money is bigint paise. Time is timestamptz UTC.
2. No personal-data column. No name, address, phone, email, government ID,
   real account number or IP. Not temporarily.
3. If it is an invariant, express it as a database constraint — not only in Zod.
4. Every index names its query. An index without one is rejected.
5. No hard deletes except demo reset scoped by origin.
6. Business keys get a UNIQUE index alongside the bigserial surrogate.
7. Enums are Postgres enums so an invalid value cannot be written by any client.
```

---

## Checks before accepting

- [ ] No personal-data column
- [ ] Every invariant has a constraint, not just validation
- [ ] `ON DELETE` behaviour stated for every FK (CASCADE only where the child is meaningless alone)
- [ ] Every index names its query
- [ ] Migration additive-first with a rollback note
- [ ] `EXPLAIN ANALYZE` provided for any new query on a table above 10,000 rows
- [ ] ERD and `architecture/database-design.md` updated in the same change
