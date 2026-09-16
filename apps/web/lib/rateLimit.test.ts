import { beforeEach, describe, expect, it, vi } from "vitest";
import { withRateLimit } from "./rateLimit";

function req(path = "/api/health", ip = "203.0.113.1"): Request {
  return new Request(`http://localhost${path}`, { headers: { "x-forwarded-for": ip } });
}

describe("withRateLimit", () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  it("allows requests up to the limit and writes nothing when it does", async () => {
    const handler = vi.fn(async () => Response.json({ ok: true }));
    const wrapped = withRateLimit({ limit: 3, windowMs: 60_000 })(handler);

    for (let i = 0; i < 3; i++) {
      const res = await wrapped(req());
      expect(res.status).toBe(200);
    }
    expect(handler).toHaveBeenCalledTimes(3);
  });

  it("returns 429 with Retry-After and does not call the handler once the limit is exceeded", async () => {
    const handler = vi.fn(async () => Response.json({ ok: true }));
    const wrapped = withRateLimit({ limit: 2, windowMs: 60_000 })(handler);

    await wrapped(req("/api/limited", "203.0.113.2"));
    await wrapped(req("/api/limited", "203.0.113.2"));
    const res = await wrapped(req("/api/limited", "203.0.113.2"));

    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBeTruthy();
    const body = await res.json();
    expect(body.error.code).toBe("RATE_LIMITED");
    expect(handler).toHaveBeenCalledTimes(2);
  });

  it("tracks limits independently per route and per key — one caller's limit does not affect another", async () => {
    const handler = vi.fn(async () => Response.json({ ok: true }));
    const wrapped = withRateLimit({ limit: 1, windowMs: 60_000 })(handler);

    const first = await wrapped(req("/api/a", "203.0.113.3"));
    const second = await wrapped(req("/api/a", "203.0.113.4"));
    const third = await wrapped(req("/api/b", "203.0.113.3"));

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(third.status).toBe(200);
  });
});
