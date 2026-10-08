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
const MAX_BUCKETS = 10_000;
const CLEANUP_INTERVAL_MS = 1_000;
let nextCleanupAt = 0;

export interface RateLimitConfig {
  limit: number;
  windowMs: number;
}

function checkRateLimit(key: string, config: RateLimitConfig): { allowed: boolean; retryAfterSeconds: number } {
  const now = Date.now();
  // Requests can introduce unbounded keys (for example, spoofed forwarded
  // addresses). Cleanup is periodic so ordinary requests do not scan the
  // entire map; an expired entry is also replaced lazily when its key returns.
  if (now >= nextCleanupAt) {
    for (const [bucketKey, value] of buckets) {
      if (value.resetAt <= now) buckets.delete(bucketKey);
    }
    nextCleanupAt = now + CLEANUP_INTERVAL_MS;
  }
  if (buckets.size >= MAX_BUCKETS && !buckets.has(key)) {
    // Preserve every active bucket. A new key waits for periodic expiry
    // rather than evicting an existing caller's count under pressure.
    return { allowed: false, retryAfterSeconds: Math.ceil(CLEANUP_INTERVAL_MS / 1000) };
  }
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
