import { z } from "zod";
import { COMPLAINT_STATUSES, FRAUD_TYPES, RISK_LEVELS } from "@cyberpulse/shared/enums";
import { RATE_LIMITS, PAGE_SIZE_MAX, DATE_SPAN_MAX_DAYS } from "@cyberpulse/shared/constants";
import { toErrorResponse, ValidationError } from "@/lib/errors";
import { withRateLimit } from "@/lib/rateLimit";
import { getRequestId } from "@/lib/requestId";
import { resolveRole, type RequestContext } from "@/services/lib/auth";
import { list } from "@/services/complaintService";

// architecture/api-design.md API-001. `sort` is allow-listed at the schema
// boundary — an unlisted value is a 400, not a passthrough (TC-SEC-013).
const QuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(PAGE_SIZE_MAX).default(25),
    q: z.string().max(64).optional(),
    fraudType: z.enum(FRAUD_TYPES).optional(),
    status: z.enum(COMPLAINT_STATUSES).optional(),
    riskLevel: z.enum([...RISK_LEVELS, "NONE"]).optional(),
    from: z.string().datetime().optional(),
    to: z.string().datetime().optional(),
    city: z.string().max(64).optional(),
    state: z.string().max(64).optional(),
    sort: z.enum(["complaintTimestamp", "amount", "riskScore"]).default("complaintTimestamp"),
    order: z.enum(["asc", "desc"]).default("desc"),
  })
  .strict();

export const GET = withRateLimit(RATE_LIMITS.reads)(async (req: Request) => {
  const requestId = getRequestId(req);
  try {
    const url = new URL(req.url);
    const input = QuerySchema.parse(Object.fromEntries(url.searchParams));
    if (input.from && input.to) {
      const spanDays = (new Date(input.to).getTime() - new Date(input.from).getTime()) / 86_400_000;
      if (spanDays < 0 || spanDays > DATE_SPAN_MAX_DAYS) {
        throw new ValidationError(`date span must be between 0 and ${DATE_SPAN_MAX_DAYS} days`, "to");
      }
    }

    const ctx: RequestContext = { role: resolveRole(req), requestId, origin: "USER" };
    const result = await list(input, ctx);
    return Response.json(result, { status: 200, headers: { "x-request-id": requestId } });
  } catch (e) {
    return toErrorResponse(e, requestId);
  }
});
