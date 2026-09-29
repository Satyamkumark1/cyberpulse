import { RATE_LIMITS } from "@cyberpulse/shared/constants";
import { toErrorResponse } from "@/lib/errors";
import { withRateLimit } from "@/lib/rateLimit";
import { getRequestId } from "@/lib/requestId";
import { resolveRole, type RequestContext } from "@/services/lib/auth";
import { metrics } from "@/services/reportService";

export const GET = withRateLimit(RATE_LIMITS.reads)(async (req: Request) => {
  const requestId = getRequestId(req);
  try {
    const ctx: RequestContext = { role: resolveRole(req), requestId, origin: "USER" };
    return Response.json({ data: await metrics(ctx) }, { headers: { "Cache-Control": "no-store", "x-request-id": requestId } });
  } catch (error) {
    return toErrorResponse(error, requestId);
  }
});
