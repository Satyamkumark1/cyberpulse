# RULE — BACKEND

Applies to `apps/web/app/api/**`, `apps/web/services/**`, `apps/ml-service/app/**`.
Read with `architecture/api-design.md` and `architecture/low-level-design.md`.

---

## Route handler shape — every one

```ts
export async function POST(req: Request) {
  const requestId = getRequestId(req);
  try {
    const input = SomeSchema.parse(await req.json());   // 1 validate
    const ctx   = { role: resolveRole(req), requestId, origin: resolveOrigin(req) };
    return Response.json(await someService.doThing(input, ctx), { status: 201 });  // 2 delegate
  } catch (e) {
    return toErrorResponse(e, requestId);               // 3 one serialiser
  }
}
```

No business logic. No SQL. No bespoke error responses. A handler that does more than validate → authorise → delegate → respond fails review.

---

## Service layer

**The test:** if the logic would be identical in a CLI with no HTTP and no React, it belongs here.

- No `Request`/`Response` types. No React imports.
- Services compose through the data layer, not through each other, except the documented compositions (`alertService` → `investigationService`, `auditService`).
- Every function that needs authorisation calls `requireCapability` explicitly. There is no ambient authorisation.
- Multi-write operations run in one transaction.
- `auditService.record` **requires a transaction handle** as its first argument. Do not add an overload that does not.

---

## Validation

- Zod on query, path and body. Schemas strict — unknown keys rejected, not stripped.
- Identifiers regex-bound (`^C-\d{5}$`, `^ACC-\d{8}$`, …).
- Sort columns **allow-listed** and mapped to column references. This is a security control, not a convenience.
- Server-derived fields — `severity`, `exposurePaise`, coordinates, window bounds — are **rejected with 400** when a client supplies them. Silently ignoring lets the client believe it set something it did not.

---

## Errors

Typed classes only, never strings. One serialiser produces every response. `SAFE_MESSAGES` is a static map, so an exception's text can never reach a client. Never swallow; the only permitted catch-and-continue records a deliberate degradation with an explicit response flag (`explanationAvailable: false`).

Retry: connection errors only, once. Never a timeout, never a 4xx. One documented exception (DEC-016): `lib/groq.ts` may resend a request refused for a key-level reason (401/403/429/5xx) once, with the second Groq key.

---

## ML client

- 8-second timeout via `AbortController`.
- **Validate the response against the shared schema on arrival.** A malformed ML response becomes a typed error, never a database row.
- Map failures to `MlUnavailableError`, `MlTimeoutError`, `MlInferenceError`.
- Never return a default score.

---

## ML service

- Artefacts loaded once at startup in the lifespan handler. A load failure sets `model_loaded = False` rather than crashing, so `/health` can report it.
- `assert_schema` before every inference. A mismatch aborts — scoring a misaligned vector produces a confident wrong answer.
- No database credentials. Ever. Everything needed arrives in the request body.
- Vectorised feature construction; batch scoring; SHAP on the **top cell only**.
- Type hints on every signature in `engine/`; mypy strict.

---

## Persistence

- Response returned to the client is the **persisted row**, not the upstream response.
- Prediction and its factors commit or roll back together.
- Alert, audit event and investigation upsert commit or roll back together.
- Money `bigint` paise. Timestamps `timestamptz` UTC.

---

## Rate limits

Applied via `withRateLimit(limit, windowMs)`, so adding an endpoint forces an explicit decision. Predict 30/min (raised from 20 — the demo's "RUN DEMO SCENARIO" control fires ten real predict calls per run, `DEMO_COMPLAINT_IDS`; 30 covers three runs inside one window), alerts 10/min, mutations 30/min, reads 120/min, health 600/min, citizen report submission 5/min per IP (the only public write, FEAT-17). A 429 writes nothing.

---

## Before you finish

- [ ] Handler is validate → authorise → delegate → respond
- [ ] Capability declared for any new service function
- [ ] Scope applied as a query predicate; `total` computed after it
- [ ] Multi-write in one transaction with its audit event
- [ ] Derived fields rejected, not ignored
- [ ] ML response validated on arrival
- [ ] Errors typed and routed through the single serialiser
- [ ] Rate limit chosen explicitly
- [ ] `EXPLAIN ANALYZE` in the PR for any new query on a large table
