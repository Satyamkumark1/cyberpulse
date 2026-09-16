import { RATE_LIMITS } from "@cyberpulse/shared/constants";
import { toErrorResponse } from "@/lib/errors";
import { withRateLimit } from "@/lib/rateLimit";
import { getRequestId } from "@/lib/requestId";
import { composeHealth } from "@/services/healthService";

// architecture/api-design.md API-080. Never throws — a failing component is
// reported, not propagated — but the try/catch stays because the route
// handler contract (RULE-backend.md) requires the single serialiser on any
// path, including a bug in composeHealth itself.
export const GET = withRateLimit(RATE_LIMITS.health)(async (req: Request) => {
  const requestId = getRequestId(req);
  try {
    const health = await composeHealth();
    return Response.json(health, {
      status: 200,
      headers: { "Cache-Control": "no-store", "x-request-id": requestId },
    });
  } catch (e) {
    return toErrorResponse(e, requestId);
  }
});
