import { RATE_LIMITS } from "@cyberpulse/shared/constants";
import { toErrorResponse } from "@/lib/errors";
import { withRateLimit } from "@/lib/rateLimit";
import { getRequestId } from "@/lib/requestId";
import { resolveRole, type RequestContext } from "@/services/lib/auth";
import { getDetail } from "@/services/hotspotService";

// architecture/api-design.md API-031 — exactly the hotspot drawer's payload,
// one request, one screen.
export const GET = withRateLimit<[{ params: Promise<{ h3: string }> }]>(RATE_LIMITS.reads)(
  async (req: Request, { params }: { params: Promise<{ h3: string }> }) => {
    const requestId = getRequestId(req);
    try {
      const { h3 } = await params;
      const ctx: RequestContext = { role: resolveRole(req), requestId, origin: "USER" };
      const result = await getDetail(h3, ctx);
      return Response.json(result, { status: 200, headers: { "x-request-id": requestId } });
    } catch (e) {
      return toErrorResponse(e, requestId);
    }
  },
);
