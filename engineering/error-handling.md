# ERROR HANDLING — CyberPulse AI

| Field | Value |
|---|---|
| Version | 1.0 |
| Principle | **One serialiser, closed code set, nothing internal ever crosses the wire.** |
| Related | `architecture/low-level-design.md` §5.3, `architecture/api-design.md` §1.2 |

---

## 1. The Three Rules

1. **Errors are typed, never strings.** Every throw is an instance of a class deriving from `AppError`.
2. **One function turns an error into a response.** There is no second place where a status code is chosen.
3. **A failure never produces a fabricated value.** Degraded means numberless (`ai/guardrails.md` §4).

Rule 3 is specific to this product. In most systems, falling back to a cached or default value on failure is a kindness. Here it is the worst thing the software can do, because an officer cannot tell a fallback from a finding.

---

## 2. Error Taxonomy

```ts
export abstract class AppError extends Error {
  abstract readonly code: ErrorCode;
  abstract readonly status: number;
}

export class ValidationError  extends AppError { code = 'VALIDATION_ERROR' as const; status = 400; constructor(public field: string) { super(); } }
export class ForbiddenError   extends AppError { code = 'FORBIDDEN' as const;        status = 403; }
export class NotFoundError    extends AppError { code = 'NOT_FOUND' as const;        status = 404; constructor(public resource: string) { super(); } }
export class InvalidTransition extends AppError{ code = 'INVALID_TRANSITION' as const;status = 409; constructor(public from: string, public to: string) { super(); } }
export class ConflictError    extends AppError { code = 'CONFLICT' as const;         status = 409; }
export class RateLimitError   extends AppError { code = 'RATE_LIMITED' as const;     status = 429; constructor(public retryAfterSec: number) { super(); } }
export class MlUnavailableError extends AppError{ code = 'ML_UNAVAILABLE' as const;  status = 503; }
export class MlTimeoutError   extends AppError { code = 'TIMEOUT' as const;          status = 504; }
export class MlInferenceError extends AppError { code = 'INTERNAL_ERROR' as const;   status = 500; }
```

The code set is closed. Adding a code requires updating the shared enum, the client's handling map, and `architecture/api-design.md` §1.2 — which is the point: a new failure mode should be a deliberate act, not an accident of a new `throw`.

---

## 3. The Single Serialiser

```ts
export function toErrorResponse(e: unknown, requestId: string): Response {
  const err = e instanceof AppError ? e : new InternalError();

  logger.error({
    requestId, code: err.code, status: err.status,
    name: (e as Error)?.name, message: (e as Error)?.message,
    stack: (e as Error)?.stack,           // server-side only, always
  });

  const headers: HeadersInit = { 'content-type': 'application/json' };
  if (err instanceof RateLimitError) headers['retry-after'] = String(err.retryAfterSec);

  return new Response(JSON.stringify({
    error: {
      code: err.code,
      message: SAFE_MESSAGES[err.code],                       // from a static map, never from the error
      field: err instanceof ValidationError ? err.field : undefined,
      requestId,
    },
  }), { status: err.status, headers });
}
```

Two properties do the work. `SAFE_MESSAGES` is a static lookup, so a message can never carry a value from the original exception. And an unrecognised error becomes `InternalError` before anything is read from it, so an unexpected throw cannot leak its own text.

Verified by TC-SEC-004, which drives every endpoint into every error branch and asserts that no response body contains a stack frame, a SQL keyword, a file path or a dependency version.

---

## 4. Where Errors Are Thrown

| Layer | Throws | Never |
|---|---|---|
| Route handler | `ValidationError` from a Zod parse | Business errors |
| Service | Domain errors — `NotFoundError`, `InvalidTransition`, `ConflictError`, `ForbiddenError` | HTTP status codes |
| Data access | Lets driver errors propagate; maps unique violations to `ConflictError` | Swallowing |
| ML client | `MlUnavailableError`, `MlTimeoutError`, `MlInferenceError` | Returning a default |
| Components | Nothing — they render states | Throwing for control flow |

```ts
// Route handler: the whole pattern
export async function POST(req: Request) {
  const requestId = getRequestId(req);
  try {
    const input = PredictInput.parse(await req.json());
    const ctx   = { role: resolveRole(req), requestId, origin: resolveOrigin(req) };
    return Response.json(await predictionService.predict(input, ctx), { status: 201 });
  } catch (e) {
    return toErrorResponse(e, requestId);
  }
}
```

Every handler is this shape. A handler that catches selectively, or that builds its own response, fails review.

---

## 5. Never Swallow

```ts
// Forbidden
try { await riskyThing(); } catch { /* ignore */ }
try { await riskyThing(); } catch (e) { console.log(e); }

// Correct — handle with a reason, or let it propagate
try {
  await auditService.record(tx, event);
} catch (e) {
  throw new AuditWriteError({ cause: e });   // an alert must not dispatch unaudited
}
```

The only permitted catch-and-continue is one that records a deliberate degradation with an explicit flag on the response — for example a SHAP failure setting `explanationAvailable: false`. Even then, the failure is logged and surfaced; it is never invisible.

---

## 6. ML Failures Specifically

| Failure | Client behaviour | User sees |
|---|---|---|
| Connection refused | `MlUnavailableError` → 503 | Degraded panel, capability named, retry |
| Timeout at 8 s | `MlTimeoutError` → 504 | Timeout message, retry |
| 503 from the service | `MlUnavailableError` → 503 | Degraded panel |
| Malformed response | Schema parse fails → 500 | Generic error, retry |
| SHAP failure inside the service | 201 with `explanationAvailable: false` | Score shown, explanation stated as unavailable |

**Retry policy: one retry on connection error only.** Never on 4xx, and never on timeout — retrying a timeout doubles the user's wait to reach the same failure.

Nothing is persisted on any of these paths except the last, which is a successful prediction with an honest gap in it.

---

## 7. Database Failures

| Failure | Mapping | Behaviour |
|---|---|---|
| Connection lost | Retry with backoff (3 attempts, 100/400/1600 ms), then 503 | Health reports `degraded` |
| Statement timeout (5 s) | 504 | Retryable error |
| Unique violation | `ConflictError` → 409 | Meaningful message, e.g. one investigation per complaint |
| Foreign key violation | `InternalError` → 500 | Indicates an application bug; logged loudly |
| Check constraint violation | `InternalError` → 500 | Same — validation should have caught it upstream |

The last two are deliberately 500 rather than 400. A check-constraint violation reaching Postgres means application validation failed to do its job, and reporting it as a client error would hide a real defect.

---

## 8. Client-Side Handling

```tsx
const { data, error, isLoading, refetch } = usePrediction(complaintId);

if (isLoading) return <StatePanel variant="loading" />;
if (error?.code === 'ML_UNAVAILABLE' || error?.code === 'TIMEOUT')
  return <StatePanel variant="degraded" capability="Prediction service" onRetry={refetch} />;
if (error) return <StatePanel variant="error" message={error.message} onRetry={refetch} />;
return <PredictionResults data={data} />;
```

Three properties: the degraded branch renders no derived values at all; prior data is retained on refetch failure rather than blanked; and every error branch offers an action rather than a dead end.

Error boundaries wrap each major region — map, graph, prediction panel, each chart — so a failure in one never blanks the page (NFR-06).

---

## 9. ML Service Errors

```python
class CyberPulseError(Exception):
    code: str = "INTERNAL_ERROR"
    status: int = 500

class FeatureSchemaMismatch(CyberPulseError):
    code, status = "FEATURE_SCHEMA_MISMATCH", 500

class ModelNotLoaded(CyberPulseError):
    code, status = "MODEL_NOT_LOADED", 503

@app.exception_handler(CyberPulseError)
async def handle(request: Request, exc: CyberPulseError):
    logger.error("request failed", extra={
        "request_id": request.headers.get("x-request-id"),
        "code": exc.code, "detail": str(exc),
    })
    return JSONResponse({"error": {"code": exc.code, "message": SAFE_MESSAGES[exc.code]}}, exc.status)
```

`FeatureSchemaMismatch` aborts **before inference**, never after. Scoring a misaligned vector produces a confident, plausible, wrong number, which is precisely the class of failure this system is built to prevent.

---

## 10. Logging Errors

| Logged | Never logged |
|---|---|
| `requestId`, code, status | Request bodies |
| Exception name, message, stack | User-entered text |
| Route pattern, role, duration | Resolved paths with IDs |
| Model version, feature schema version | Feature values |

The request ID is the join. A user reporting an error quotes the ID from the response, and the full detail is one query away in the logs — without any of it ever having been on their screen.

---

## 11. Verification

| Property | Test |
|---|---|
| Every error branch returns the typed envelope | TC-SEC-004 |
| No internal detail in any body | TC-SEC-004 |
| ML unavailability renders no numbers | TC-UX-006, TC-FAB-004 |
| No fabricated value on any failure path | TC-FAB-005 |
| Nothing persists on a failed transaction | TC-SEC-030 |
| Retry does not fire on timeout or 4xx | TC-INT-022 |
| One region's failure does not blank the page | TC-UX-007 |
