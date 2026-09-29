import { RATE_LIMITS } from "@cyberpulse/shared/constants";
import { CITIZEN_REPORT_DERIVED_FIELDS, CitizenReportRequest } from "@cyberpulse/shared/citizen";
import { toErrorResponse, ValidationError } from "@/lib/errors";
import { withRateLimit } from "@/lib/rateLimit";
import { getRequestId } from "@/lib/requestId";
import { resolveRole, type RequestContext } from "@/services/lib/auth";
import { submit } from "@/services/citizenReportService";

// architecture/api-design.md API-100 (FEAT-17 Report Now, ADR-022). The only
// public write: per-IP rate limit, strict body, server-derived fields → 400.
export const POST = withRateLimit(RATE_LIMITS.citizenReport)(async (req: Request) => {
  const requestId = getRequestId(req);
  try {
    const rawBody: unknown = await req.json();
    if (rawBody && typeof rawBody === "object") {
      for (const field of CITIZEN_REPORT_DERIVED_FIELDS) {
        if (field in rawBody) {
          throw new ValidationError(`Field '${field}' is server-derived and cannot be supplied by the client`, field);
        }
      }
    }

    const input = CitizenReportRequest.parse(rawBody);
    const ctx: RequestContext = { role: resolveRole(req), requestId, origin: "DEMO" };
    return Response.json(await submit(input, ctx), {
      status: 201,
      headers: { "Cache-Control": "no-store", "x-request-id": requestId },
    });
  } catch (e) {
    return toErrorResponse(e, requestId);
  }
});
