# PROMPT — API Generator

Generates an endpoint contract entry consistent with `architecture/api-design.md`.

---

```text
Write the contract for [METHOD] [ROUTE] in CyberPulse AI.

Read first: architecture/api-design.md §1 (conventions and error envelope),
security/authorization.md §2 (capability matrix), .claude/rules/backend.md.

Produce:
API ID · Method · Route · Purpose · Auth (per role, with scoping) ·
Rate limit · Request headers · Request body/params with validation rules ·
Success response with a realistic example · Error responses with codes ·
Logging · Security considerations · Test cases

Rules:
- Collections use { data, page, pageSize, total, totalPages }. Singletons are
  returned directly, unwrapped.
- Errors use the single envelope: { error: { code, message, field?, requestId } }.
- Error codes come from the closed set. A new code requires updating the set,
  the client handling map and §1.2.
- Sortable columns are allow-listed by name in the contract.
- Server-derived fields are listed explicitly as rejected-if-supplied.
- Out-of-scope objects return 404, never 403.
- Rate limit is chosen explicitly, not inherited.
- Add the endpoint's row to §10 of api-design.md.
```

---

## Checks before accepting

- [ ] Every parameter has a validation rule with bounds
- [ ] Every error branch the implementation can reach is documented
- [ ] Auth is per role, with BANK scoping stated
- [ ] Rate limit chosen deliberately
- [ ] `no-store` if the response is model-derived
- [ ] Test case IDs listed and added to `test-cases/api-tests.md`
- [ ] §10 row added
