# /create-api

## Purpose
Add or modify an API endpoint so that it matches the documented contract exactly, with validation, authorisation, rate limiting and the standard error envelope.

## Inputs
- Endpoint (method + route), or `API-xxx` from the contract
- The feature and requirement IDs it serves

## Required reading
1. `architecture/api-design.md` → conventions, envelope, error codes, the endpoint's row in §10
2. `security/authorization.md` → the capability matrix
3. `architecture/low-level-design.md` §3 → service layer patterns
4. `.claude/rules/backend.md` and `.claude/rules/security.md`

## Execution
1. Define or confirm the contract in `architecture/api-design.md` — request, response, errors, auth, rate limit, tests. If the endpoint is new, add its row to §10 first.
2. Add the JSON Schema to `packages/shared`; regenerate Zod and Pydantic.
3. Implement the service function; declare its capability; apply the scope predicate.
4. Write the handler in the four-line shape. No business logic, no SQL.
5. Choose the rate limit explicitly via `withRateLimit`.
6. Ensure every failure path returns through `toErrorResponse`.
7. Write API tests: happy path, each validation failure with the field named, each role, each error branch.

## Validation
- [ ] Contract documented before implementation
- [ ] Zod schema strict; unknown keys rejected
- [ ] Sortable columns allow-listed
- [ ] Server-derived fields rejected with 400, not ignored
- [ ] Capability + scope both checked; 403 / 404 correct
- [ ] `total` computed after the scope predicate
- [ ] Rate limit chosen and applied
- [ ] `Cache-Control: no-store` if the response is model-derived
- [ ] Error bodies carry no internal detail

## Test requirements
TC-API-style cases for: 200 shape, 400 per invalid parameter, 403 per denied role, 404 for absent and for out-of-scope (byte-identical), 429 above the limit, and the error-envelope check.

## Expected output
Endpoint implemented, contract document updated, tests passing, `architecture/api-design.md` §10 row present.
