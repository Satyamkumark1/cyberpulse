import { RATE_LIMITS } from "@cyberpulse/shared/constants";
import { toErrorResponse } from "@/lib/errors";
import { withRateLimit } from "@/lib/rateLimit";
import { getRequestId } from "@/lib/requestId";
import { resolveRole, type RequestContext } from "@/services/lib/auth";
import { simulationStart } from "@/services/transactionService";

// architecture/api-design.md API-023.
export const POST = withRateLimit(RATE_LIMITS.mutations)(async (req: Request) => {
  const requestId = getRequestId(req);
  try {
    const ctx: RequestContext = { role: resolveRole(req), requestId, origin: "USER" };
    const result = await simulationStart(ctx);
    return Response.json(result, { status: 200, headers: { "x-request-id": requestId } });
  } catch (e) {
    return toErrorResponse(e, requestId);
  }
});
