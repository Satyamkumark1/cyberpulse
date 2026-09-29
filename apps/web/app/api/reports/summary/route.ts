import { z } from "zod";
import { FRAUD_TYPES, RATE_LIMITS } from "@cyberpulse/shared";
import { toErrorResponse } from "@/lib/errors";
import { withRateLimit } from "@/lib/rateLimit";
import { getRequestId } from "@/lib/requestId";
import { resolveRole, type RequestContext } from "@/services/lib/auth";
import { summary } from "@/services/reportService";

const QuerySchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  city: z.string().trim().min(1).max(120).optional(),
  state: z.string().trim().min(1).max(120).optional(),
  fraudType: z.enum(FRAUD_TYPES).optional(),
}).strict();

export const GET = withRateLimit(RATE_LIMITS.reads)(async (req: Request) => {
  const requestId = getRequestId(req);
  try {
    const input = QuerySchema.parse(Object.fromEntries(new URL(req.url).searchParams));
    const ctx: RequestContext = { role: resolveRole(req), requestId, origin: "USER" };
    return Response.json(await summary(input, ctx), {
      headers: { "Cache-Control": "no-store", "x-request-id": requestId },
    });
  } catch (error) {
    return toErrorResponse(error, requestId);
  }
});
