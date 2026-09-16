import { RATE_LIMITS } from "@cyberpulse/shared/constants";
import { toErrorResponse } from "@/lib/errors";
import { withRateLimit } from "@/lib/rateLimit";
import { getRequestId } from "@/lib/requestId";
import { resolveRole, type RequestContext } from "@/services/lib/auth";
import { getWithContext } from "@/services/complaintService";
import { getLatestForComplaint } from "@/services/predictionService";

// architecture/api-design.md API-002. `latestPrediction` is predictionService's
// concern (Service Layer table) — joined here, at the orchestration point,
// not inside complaintService.
export const GET = withRateLimit<[{ params: Promise<{ complaintId: string }> }]>(RATE_LIMITS.reads)(
  async (req: Request, { params }: { params: Promise<{ complaintId: string }> }) => {
    const requestId = getRequestId(req);
    try {
      const { complaintId } = await params;
      const ctx: RequestContext = { role: resolveRole(req), requestId, origin: "USER" };
      const context = await getWithContext(complaintId, ctx);
      const latestPrediction = await getLatestForComplaint(context.complaint.id);
      return Response.json(
        { ...context, latestPrediction },
        { status: 200, headers: { "x-request-id": requestId } },
      );
    } catch (e) {
      return toErrorResponse(e, requestId);
    }
  },
);
