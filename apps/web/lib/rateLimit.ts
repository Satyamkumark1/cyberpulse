import { getRequestId } from "./requestId";
import { RateLimitedError, toErrorResponse } from "./errors";

// architecture/security-architecture.md §7. Every endpoint's limit is an
// explicit decision made where the route is defined — see @cyberpulse/shared
// RATE_LIMITS for the numbers by endpoint class.
//
// ponytail: in-memory, per-instance bucket — correct for this prototype's
// single-process topology (no cache tier, ADR-017), not for a horizontally
// scaled deployment. Upgrade to a shared store (Upstash/Redis) if the ML
// service or web app ever runs more than one instance.
interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

export interface RateLimitConfig {
  limit: number;
  windowMs: number;
}

function checkRateLimit(key: string, config: RateLimitConfig): { allowed: boolean; retryAfterSeconds: number } {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + config.windowMs });
    return { allowed: true, retryAfterSeconds: 0 };
  }
  if (bucket.count >= config.limit) {
    return { allowed: false, retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000) };
  }
  bucket.count += 1;
  return { allowed: true, retryAfterSeconds: 0 };
}

// Extra args (e.g. Next's dynamic-route `{ params }`) are forwarded
// untouched — the wrapper only inspects `req`, the first argument.
export type RateLimitedHandler<A extends unknown[]> = (req: Request, ...rest: A) => Promise<Response>;

/**
 * A 429 carries Retry-After and writes no data (architecture/security-architecture.md §7).
 * `keyFn` defaults to the client IP; pass one that includes role for
 * per-role limits once role resolution exists.
 */
export function withRateLimit<A extends unknown[] = []>(
  config: RateLimitConfig,
  keyFn: (req: Request) => string = defaultKey,
) {
  return (handler: RateLimitedHandler<A>): RateLimitedHandler<A> =>
    async (req, ...rest) => {
      const key = `${new URL(req.url).pathname}:${keyFn(req)}`;
      const result = checkRateLimit(key, config);

      if (!result.allowed) {
        // Through the one serialiser (RULE-backend.md §Errors), plus Retry-After.
        const res = toErrorResponse(new RateLimitedError(), getRequestId(req));
        res.headers.set("Retry-After", String(result.retryAfterSeconds));
        return res;
      }

      return handler(req, ...rest);
    };
}

function defaultKey(req: Request): string {
  return req.headers.get("x-forwarded-for") ?? "unknown";
}
