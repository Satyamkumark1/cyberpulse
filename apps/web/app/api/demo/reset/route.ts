import { RATE_LIMITS } from "@cyberpulse/shared/constants";
import { toErrorResponse } from "@/lib/errors";
import { withRateLimit } from "@/lib/rateLimit";
import { getRequestId } from "@/lib/requestId";
import { resolveRole, type RequestContext } from "@/services/lib/auth";
import { previewReset, reset } from "@/services/demoService";

// architecture/api-design.md API-090. GET previews the exact counts the
// reset confirmation names (AC-P7-07) without deleting anything; POST
// performs the scoped delete. Both operations require ADMIN.
export const GET = withRateLimit(RATE_LIMITS.reads)(async (req: Request) => {
  const requestId = getRequestId(req);
  try {
    const ctx: RequestContext = { role: resolveRole(req), requestId, origin: "USER" };
    return Response.json(await previewReset(ctx), { headers: { "Cache-Control": "no-store", "x-request-id": requestId } });
  } catch (e) {
    return toErrorResponse(e, requestId);
  }
});

export const POST = withRateLimit(RATE_LIMITS.mutations)(async (req: Request) => {
  const requestId = getRequestId(req);
  try {
    const ctx: RequestContext = { role: resolveRole(req), requestId, origin: "USER" };
    return Response.json(await reset(ctx), { headers: { "Cache-Control": "no-store", "x-request-id": requestId } });
  } catch (e) {
    return toErrorResponse(e, requestId);
  }
});
