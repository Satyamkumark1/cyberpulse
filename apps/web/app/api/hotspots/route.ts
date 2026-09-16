import { z } from "zod";
import { RISK_LEVELS } from "@cyberpulse/shared/enums";
import { RATE_LIMITS } from "@cyberpulse/shared/constants";
import { toErrorResponse } from "@/lib/errors";
import { withRateLimit } from "@/lib/rateLimit";
import { getRequestId } from "@/lib/requestId";
import { resolveRole, type RequestContext } from "@/services/lib/auth";
import { parseBbox } from "@/services/lib/geo";
import { list } from "@/services/hotspotService";

// architecture/api-design.md API-030.
const QuerySchema = z
  .object({
    state: z.string().max(64).optional(),
    riskLevel: z.enum(RISK_LEVELS).optional(),
    from: z.string().datetime().optional(),
    to: z.string().datetime().optional(),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    bbox: z.string().optional(),
  })
  .strict();

export const GET = withRateLimit(RATE_LIMITS.reads)(async (req: Request) => {
  const requestId = getRequestId(req);
  try {
    const url = new URL(req.url);
    const input = QuerySchema.parse(Object.fromEntries(url.searchParams));
    const ctx: RequestContext = { role: resolveRole(req), requestId, origin: "USER" };
    const result = await list(
      { state: input.state, riskLevel: input.riskLevel, from: input.from, to: input.to, limit: input.limit, bbox: input.bbox ? parseBbox(input.bbox) : undefined },
      ctx,
    );
    return Response.json(result, { status: 200, headers: { "x-request-id": requestId } });
  } catch (e) {
    return toErrorResponse(e, requestId);
  }
});
