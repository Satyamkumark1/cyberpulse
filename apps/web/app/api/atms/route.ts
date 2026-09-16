import { z } from "zod";
import { RATE_LIMITS } from "@cyberpulse/shared/constants";
import { toErrorResponse } from "@/lib/errors";
import { withRateLimit } from "@/lib/rateLimit";
import { getRequestId } from "@/lib/requestId";
import { resolveRole, type RequestContext } from "@/services/lib/auth";
import { parseBbox } from "@/services/lib/geo";
import { list } from "@/services/atmService";

// architecture/api-design.md API-032. `bbox` is required — the map must
// never issue an unbounded ATM query.
const QuerySchema = z
  .object({
    bbox: z.string(),
    limit: z.coerce.number().int().min(1).max(2000).default(500),
  })
  .strict();

export const GET = withRateLimit(RATE_LIMITS.reads)(async (req: Request) => {
  const requestId = getRequestId(req);
  try {
    const url = new URL(req.url);
    const input = QuerySchema.parse(Object.fromEntries(url.searchParams));
    const ctx: RequestContext = { role: resolveRole(req), requestId, origin: "USER" };
    const result = await list({ bbox: parseBbox(input.bbox), limit: input.limit }, ctx);
    return Response.json(result, { status: 200, headers: { "x-request-id": requestId } });
  } catch (e) {
    return toErrorResponse(e, requestId);
  }
});
