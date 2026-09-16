import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  AppError,
  ForbiddenError,
  NotFoundError,
  RateLimitedError,
  SAFE_MESSAGES,
  ValidationError,
  toErrorResponse,
} from "./errors";

describe("toErrorResponse", () => {
  it("serialises a typed AppError with its own status, code and message", async () => {
    const res = toErrorResponse(new ForbiddenError(), "req_1");
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body).toEqual({ error: { code: "FORBIDDEN", message: SAFE_MESSAGES.FORBIDDEN, requestId: "req_1" } });
  });

  it("includes the field name for a ValidationError but omits it when absent", async () => {
    const res = toErrorResponse(new ValidationError("pageSize must be between 1 and 100", "pageSize"), "req_2");
    const body = await res.json();
    expect(body.error.field).toBe("pageSize");

    const resNoField = toErrorResponse(new NotFoundError(), "req_3");
    const bodyNoField = await resNoField.json();
    expect(bodyNoField.error).not.toHaveProperty("field");
  });

  it("returns 429 with RATE_LIMITED for a RateLimitedError", async () => {
    const res = toErrorResponse(new RateLimitedError(), "req_4");
    expect(res.status).toBe(429);
    expect((await res.json()).error.code).toBe("RATE_LIMITED");
  });

  it("maps a ZodError to a 400 VALIDATION_ERROR naming the offending path", async () => {
    const schema = z.object({ pageSize: z.number().max(100) });
    const result = schema.safeParse({ pageSize: 500 });
    expect(result.success).toBe(false);
    if (result.success) throw new Error("expected failure");

    const res = toErrorResponse(result.error, "req_5");
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(body.error.field).toBe("pageSize");
  });

  it("never leaks the original message of an unrecognised exception — NFR-13, TC-SEC-004", async () => {
    const secret = new Error("password=hunter2 at /Users/leaked/path.ts:42");
    const res = toErrorResponse(secret, "req_6");
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error.code).toBe("INTERNAL_ERROR");
    expect(body.error.message).toBe(SAFE_MESSAGES.INTERNAL_ERROR);
    expect(JSON.stringify(body)).not.toContain("hunter2");
    expect(JSON.stringify(body)).not.toContain("/Users/leaked");
  });

  it("always echoes the requestId it was given, for correlation", async () => {
    const res = toErrorResponse(new AppError("TIMEOUT"), "req_correlate_me");
    const body = await res.json();
    expect(body.error.requestId).toBe("req_correlate_me");
  });
});
