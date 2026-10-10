import { z } from "zod";
import { NOTIFICATION_CHANNELS } from "@cyberpulse/shared/enums";
import { RATE_LIMITS } from "@cyberpulse/shared/constants";
import { toErrorResponse } from "@/lib/errors";
import { withRateLimit } from "@/lib/rateLimit";
import { getRequestId } from "@/lib/requestId";
import { resolveRole, type RequestContext } from "@/services/lib/auth";
import { list } from "@/services/notificationService";

// architecture/api-design.md API-110, DEC-020. The header bell polls this
// every 10 s (6/min per tab, well inside the reads limit); the outbox page
// reads the WEBHOOK channel.
const QuerySchema = z
  .object({
    channel: z.enum(NOTIFICATION_CHANNELS).default("DASHBOARD"),
    limit: z.coerce.number().int().min(1).max(50).default(20),
  })
  .strict();

export const GET = withRateLimit(RATE_LIMITS.reads)(async (req: Request) => {
  const requestId = getRequestId(req);
  try {
    const input = QuerySchema.parse(Object.fromEntries(new URL(req.url).searchParams));
    const ctx: RequestContext = { role: resolveRole(req), requestId, origin: "USER" };
    return Response.json(await list(input, ctx), {
      status: 200,
      headers: { "Cache-Control": "no-store", "x-request-id": requestId },
    });
  } catch (e) {
    return toErrorResponse(e, requestId);
  }
});
