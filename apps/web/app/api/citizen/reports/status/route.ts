import { RATE_LIMITS } from "@cyberpulse/shared/constants";
import { CitizenStatusRequest } from "@cyberpulse/shared/citizen";
import { toErrorResponse } from "@/lib/errors";
import { withRateLimit } from "@/lib/rateLimit";
import { getRequestId } from "@/lib/requestId";
import { resolveRole, type RequestContext } from "@/services/lib/auth";
import { status } from "@/services/citizenReportService";

// architecture/api-design.md API-101 (ADR-022). POST, not GET: the tracking
// code travels in the body so it never lands in a URL, a log line or history.
export const POST = withRateLimit(RATE_LIMITS.reads)(async (req: Request) => {
  const requestId = getRequestId(req);
  try {
    const input = CitizenStatusRequest.parse(await req.json());
    const ctx: RequestContext = { role: resolveRole(req), requestId, origin: "USER" };
    return Response.json(await status(input, ctx), {
      status: 200,
      headers: { "Cache-Control": "no-store", "x-request-id": requestId },
    });
  } catch (e) {
    return toErrorResponse(e, requestId);
  }
});
