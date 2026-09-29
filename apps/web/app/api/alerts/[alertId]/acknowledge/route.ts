import { RATE_LIMITS } from "@cyberpulse/shared/constants";
import { toErrorResponse } from "@/lib/errors";
import { withRateLimit } from "@/lib/rateLimit";
import { getRequestId } from "@/lib/requestId";
import { resolveRole, type RequestContext } from "@/services/lib/auth";
import { acknowledge } from "@/services/alertService";

/**
 * POST /api/alerts/:alertId/acknowledge
 *
 * Convenience endpoint used by the UI — idempotent by design (TC-API-046).
 */
export const POST = withRateLimit<[{ params: Promise<{ alertId: string }> }]>(RATE_LIMITS.mutations)(
  async (req: Request, { params }: { params: Promise<{ alertId: string }> }) => {
    const requestId = getRequestId(req);
    try {
      const { alertId } = await params;
      const ctx: RequestContext = { role: resolveRole(req), requestId, origin: "USER" };
      const updated = await acknowledge(alertId, ctx);

      return Response.json(updated, {
        status: 200,
        headers: { "Cache-Control": "no-store", "x-request-id": requestId },
      });
    } catch (e) {
      return toErrorResponse(e, requestId);
    }
  },
);
