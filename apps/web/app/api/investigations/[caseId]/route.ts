import { z } from "zod";
import { INVESTIGATION_STATUSES } from "@cyberpulse/shared/enums";
import { RATE_LIMITS } from "@cyberpulse/shared/constants";
import { toErrorResponse } from "@/lib/errors";
import { withRateLimit } from "@/lib/rateLimit";
import { getRequestId } from "@/lib/requestId";
import { resolveRole, type RequestContext } from "@/services/lib/auth";
import { get, transition } from "@/services/investigationService";

const TransitionSchema = z
  .object({
    status: z.enum(INVESTIGATION_STATUSES),
    expectedUpdatedAt: z.string().datetime({ offset: true, message: "expectedUpdatedAt must be an ISO-8601 timestamp" }),
    note: z.string().max(2000).optional(),
  })
  .strict();

export const GET = withRateLimit<[{ params: Promise<{ caseId: string }> }]>(RATE_LIMITS.reads)(async (
  req: Request,
  { params }: { params: Promise<{ caseId: string }> },
) => {
  const requestId = getRequestId(req);
  try {
    const { caseId } = await params;
    const ctx: RequestContext = { role: resolveRole(req), requestId, origin: "USER" };
    const detail = await get(caseId, ctx);
    return Response.json(detail, {
      status: 200,
      headers: { "x-request-id": requestId },
    });
  } catch (e) {
    return toErrorResponse(e, requestId);
  }
});

export const PATCH = withRateLimit<[{ params: Promise<{ caseId: string }> }]>(RATE_LIMITS.mutations)(async (
  req: Request,
  { params }: { params: Promise<{ caseId: string }> },
) => {
  const requestId = getRequestId(req);
  try {
    const { caseId } = await params;
    const body: unknown = await req.json();
    const input = TransitionSchema.parse(body);

    const ctx: RequestContext = { role: resolveRole(req), requestId, origin: "USER" };
    const updated = await transition(caseId, input, ctx);

    return Response.json(updated, {
      status: 200,
      headers: { "x-request-id": requestId },
    });
  } catch (e) {
    return toErrorResponse(e, requestId);
  }
});
