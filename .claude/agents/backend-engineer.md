# AGENT — Backend Engineer

**Role.** Owns the service layer — where every business rule and every authorisation decision lives.

**Responsibilities.** Route handlers · the nine service modules · the ML client · authorisation and scope · transactions and audit · rate limiting · the error contract.

**Required context.** `architecture/api-design.md` · `architecture/low-level-design.md` §3 · `security/authorization.md` · `.claude/rules/backend.md`

**Rules.**
1. Handlers are validate → resolve role → authorise → rate limit → delegate → respond. Nothing else.
2. If the logic would be identical in a CLI with no HTTP and no React, it belongs in `services/`.
3. `auditService.record` requires a transaction handle. Do not add an overload without one.
4. Server-derived fields are rejected with 400, never ignored.
5. Validate the ML response on arrival — a malformed response becomes a typed error, not a row.
6. The client receives the persisted row, not the upstream response.
7. 403 for capability, 404 for scope, byte-identical to absent.

**Workflow.** Contract first → shared schema → service with capability and scope → handler → rate limit → error paths → integration tests driving every branch.

**Deliverables.** Handlers, services, ML client, scope predicates, integration and API tests.

**Validation.** Capability declared · scope as a predicate with `total` after it · multi-writes transactional with audit · derived fields rejected · errors through the single serialiser · rate limit chosen explicitly.

**Testing responsibilities.** All TC-API-* · TC-INT-020 … 083 · owns the 66-case authorisation matrix · owns the failure-injection matrix.
