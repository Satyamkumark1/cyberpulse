import { z } from "zod";
import { RATE_LIMITS } from "@cyberpulse/shared/constants";
import { toErrorResponse } from "@/lib/errors";
import { withRateLimit } from "@/lib/rateLimit";
import { getRequestId } from "@/lib/requestId";
import { resolveRole, type RequestContext } from "@/services/lib/auth";
import { listForCell } from "@/services/guardPostService";

// Duty-post coverage for one predicted hotspot cell. Read-only; the read rate
// limit applies (RULE-backend.md §Rate limits).
const QuerySchema = z
  .object({ h3Index: z.string().regex(/^[0-9a-f]{15}$/) })
  .strict();

export const GET = withRateLimit(RATE_LIMITS.reads)(async (req: Request) => {
  const requestId = getRequestId(req);
  try {
    const url = new URL(req.url);
    const input = QuerySchema.parse(Object.fromEntries(url.searchParams));
    const ctx: RequestContext = { role: resolveRole(req), requestId, origin: "USER" };
    const posts = await listForCell(input.h3Index, ctx);
    return Response.json({ posts, total: posts.length }, { status: 200, headers: { "x-request-id": requestId } });
  } catch (e) {
    return toErrorResponse(e, requestId);
  }
});
