import { z } from "zod";
import { ACTOR_ROLES, INVESTIGATION_STATUSES, PRIORITY_LEVELS } from "@cyberpulse/shared/enums";
import { PAGE_SIZE_MAX, RATE_LIMITS } from "@cyberpulse/shared/constants";
import { toErrorResponse } from "@/lib/errors";
import { withRateLimit } from "@/lib/rateLimit";
import { getRequestId } from "@/lib/requestId";
import { resolveRole, type RequestContext } from "@/services/lib/auth";
import { create, list } from "@/services/investigationService";

const QuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(PAGE_SIZE_MAX).default(25),
    status: z.enum(INVESTIGATION_STATUSES).optional(),
    priority: z.enum(PRIORITY_LEVELS).optional(),
    assignedRole: z.enum(ACTOR_ROLES).optional(),
    sort: z.enum(["updatedAt", "priority"]).optional(),
    order: z.enum(["asc", "desc"]).optional(),
  })
  .strict();

const CreateSchema = z
  .object({
    complaintId: z.string().min(1, "complaintId is required"),
    priority: z.enum(PRIORITY_LEVELS).optional(),
  })
  .strict();

export const GET = withRateLimit(RATE_LIMITS.reads)(async (req: Request) => {
  const requestId = getRequestId(req);
  try {
    const url = new URL(req.url);
    const input = QuerySchema.parse(Object.fromEntries(url.searchParams));
    const ctx: RequestContext = { role: resolveRole(req), requestId, origin: "USER" };
    const result = await list(input, ctx);
    return Response.json(result, {
      status: 200,
      headers: { "x-request-id": requestId },
    });
  } catch (e) {
    return toErrorResponse(e, requestId);
  }
});

export const POST = withRateLimit(RATE_LIMITS.mutations)(async (req: Request) => {
  const requestId = getRequestId(req);
  try {
    const body: unknown = await req.json();
    const input = CreateSchema.parse(body);
    const ctx: RequestContext = { role: resolveRole(req), requestId, origin: "USER" };
    const result = await create(input, ctx);

    return Response.json(result, {
      status: 201,
      headers: { "x-request-id": requestId },
    });
  } catch (e) {
    return toErrorResponse(e, requestId);
  }
});
