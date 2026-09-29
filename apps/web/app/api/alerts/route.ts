import { z } from "zod";
import { ALERT_SEVERITIES, ALERT_STATUSES, RECIPIENT_KINDS } from "@cyberpulse/shared/enums";
import { PAGE_SIZE_MAX, RATE_LIMITS } from "@cyberpulse/shared/constants";
import { toErrorResponse, ValidationError } from "@/lib/errors";
import { withRateLimit } from "@/lib/rateLimit";
import { getRequestId } from "@/lib/requestId";
import { resolveOrigin, resolveRole, type RequestContext } from "@/services/lib/auth";
import { create, list } from "@/services/alertService";

const QuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(PAGE_SIZE_MAX).default(25),
    status: z.enum(ALERT_STATUSES).optional(),
    severity: z.enum(ALERT_SEVERITIES).optional(),
    from: z.string().datetime().optional(),
    to: z.string().datetime().optional(),
  })
  .strict();

const CreateSchema = z
  .object({
    predictionRef: z.string().min(1, "predictionRef is required"),
    recipients: z.array(z.enum(RECIPIENT_KINDS)).min(1, "Select at least one recipient"),
    notes: z.string().max(2000).optional(),
  })
  .strict();

const DERIVED_FIELDS = [
  "severity",
  "exposurePaise",
  "locationName",
  "windowStart",
  "windowEnd",
  "latitude",
  "longitude",
  "status",
  "alertId",
] as const;

export const GET = withRateLimit(RATE_LIMITS.reads)(async (req: Request) => {
  const requestId = getRequestId(req);
  try {
    const url = new URL(req.url);
    const input = QuerySchema.parse(Object.fromEntries(url.searchParams));
    const ctx: RequestContext = { role: resolveRole(req), requestId, origin: "USER" };
    const result = await list(input, ctx);
    return Response.json(result, {
      status: 200,
      headers: { "Cache-Control": "no-store", "x-request-id": requestId },
    });
  } catch (e) {
    return toErrorResponse(e, requestId);
  }
});

export const POST = withRateLimit(RATE_LIMITS.alerts, (req) => `${resolveRole(req)}`)(async (req: Request) => {
  const requestId = getRequestId(req);
  try {
    const rawBody: unknown = await req.json();

    // FR-14.2 / TC-API-042 / TC-INT-044: Client-supplied derived fields return 400
    if (rawBody && typeof rawBody === "object") {
      for (const field of DERIVED_FIELDS) {
        if (field in rawBody) {
          throw new ValidationError(`Field '${field}' is server-derived and cannot be supplied by the client`, field);
        }
      }
    }

    const input = CreateSchema.parse(rawBody);
    const ctx: RequestContext = { role: resolveRole(req), requestId, origin: resolveOrigin(req) };
    const result = await create(input, ctx);

    return Response.json(result, {
      status: 201,
      headers: { "Cache-Control": "no-store", "x-request-id": requestId },
    });
  } catch (e) {
    return toErrorResponse(e, requestId);
  }
});
