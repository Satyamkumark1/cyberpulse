import { RATE_LIMITS } from "@cyberpulse/shared/constants";
import { toErrorResponse } from "@/lib/errors";
import { withRateLimit } from "@/lib/rateLimit";
import { getRequestId } from "@/lib/requestId";
import { resolveRole, type RequestContext } from "@/services/lib/auth";
import { getById } from "@/services/transactionService";

// architecture/api-design.md API-021.
export const GET = withRateLimit<[{ params: Promise<{ transactionId: string }> }]>(RATE_LIMITS.reads)(
  async (req: Request, { params }: { params: Promise<{ transactionId: string }> }) => {
    const requestId = getRequestId(req);
    try {
      const { transactionId } = await params;
      const ctx: RequestContext = { role: resolveRole(req), requestId, origin: "USER" };
      const result = await getById(transactionId, ctx);
      return Response.json(result, { status: 200, headers: { "x-request-id": requestId } });
    } catch (e) {
      return toErrorResponse(e, requestId);
    }
  },
);
