import { z } from "zod";
import { RATE_LIMITS } from "@cyberpulse/shared/constants";
import { toErrorResponse } from "@/lib/errors";
import { withRateLimit } from "@/lib/rateLimit";
import { getRequestId } from "@/lib/requestId";
import { resolveRole, type RequestContext } from "@/services/lib/auth";
import { simulationGetEvents } from "@/services/transactionService";

// architecture/api-design.md API-023.
const QuerySchema = z.object({ since: z.string().datetime().optional() }).strict();

export const GET = withRateLimit(RATE_LIMITS.mutations)(async (req: Request) => {
  const requestId = getRequestId(req);
  try {
    const url = new URL(req.url);
    const input = QuerySchema.parse(Object.fromEntries(url.searchParams));
    const ctx: RequestContext = { role: resolveRole(req), requestId, origin: "USER" };
    const result = await simulationGetEvents(input.since, ctx);
    return Response.json(result, { status: 200, headers: { "x-request-id": requestId } });
  } catch (e) {
    return toErrorResponse(e, requestId);
  }
});
