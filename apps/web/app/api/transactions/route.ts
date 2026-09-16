import { z } from "zod";
import { RISK_INDICATORS, TXN_CHANNELS } from "@cyberpulse/shared/enums";
import { PAGE_SIZE_MAX, RATE_LIMITS } from "@cyberpulse/shared/constants";
import { toErrorResponse } from "@/lib/errors";
import { withRateLimit } from "@/lib/rateLimit";
import { getRequestId } from "@/lib/requestId";
import { resolveRole, type RequestContext } from "@/services/lib/auth";
import { list } from "@/services/transactionService";

// architecture/api-design.md API-020. `sort` is allow-listed at the schema
// boundary — an unlisted value is a 400, not a passthrough (TC-SEC-013).
const QuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(PAGE_SIZE_MAX).default(25),
    channel: z.enum(TXN_CHANNELS).optional(),
    minAmount: z.coerce.number().int().min(0).optional(),
    maxAmount: z.coerce.number().int().min(0).optional(),
    from: z.string().datetime().optional(),
    to: z.string().datetime().optional(),
    riskIndicator: z.enum(RISK_INDICATORS).optional(),
    accountId: z.string().regex(/^ACC-\d{8}$/).optional(),
    sort: z.enum(["timestamp", "amount"]).default("timestamp"),
    order: z.enum(["asc", "desc"]).default("desc"),
  })
  .strict();

export const GET = withRateLimit(RATE_LIMITS.reads)(async (req: Request) => {
  const requestId = getRequestId(req);
  try {
    const url = new URL(req.url);
    const input = QuerySchema.parse(Object.fromEntries(url.searchParams));
    const ctx: RequestContext = { role: resolveRole(req), requestId, origin: "USER" };
    const result = await list(input, ctx);
    return Response.json(result, { status: 200, headers: { "x-request-id": requestId } });
  } catch (e) {
    return toErrorResponse(e, requestId);
  }
});
