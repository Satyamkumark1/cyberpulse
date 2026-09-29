import { z } from "zod";
import { RATE_LIMITS } from "@cyberpulse/shared/constants";
import { toErrorResponse } from "@/lib/errors";
import { withRateLimit } from "@/lib/rateLimit";
import { getRequestId } from "@/lib/requestId";
import { resolveRole, type RequestContext } from "@/services/lib/auth";
import { acknowledge, get } from "@/services/alertService";

const PatchSchema = z
  .object({
    status: z.enum(["ACKNOWLEDGED"]),
  })
  .strict();

export const GET = withRateLimit<[{ params: Promise<{ alertId: string }> }]>(RATE_LIMITS.reads)(
  async (req: Request, { params }: { params: Promise<{ alertId: string }> }) => {
    const requestId = getRequestId(req);
    try {
      const { alertId } = await params;
      const ctx: RequestContext = { role: resolveRole(req), requestId, origin: "USER" };
      const alert = await get(alertId, ctx);
      return Response.json(alert, {
        status: 200,
        headers: { "Cache-Control": "no-store", "x-request-id": requestId },
      });
    } catch (e) {
      return toErrorResponse(e, requestId);
    }
  },
);

export const PATCH = withRateLimit<[{ params: Promise<{ alertId: string }> }]>(RATE_LIMITS.mutations)(
  async (req: Request, { params }: { params: Promise<{ alertId: string }> }) => {
    const requestId = getRequestId(req);
    try {
      const { alertId } = await params;
      const body: unknown = await req.json();
      PatchSchema.parse(body);

      const ctx: RequestContext = { role: resolveRole(req), requestId, origin: "USER" };
      const updated = await acknowledge(alertId, ctx);

      return Response.json(updated, {
        status: 200,
        headers: { "Cache-Control": "no-store", "x-request-id": requestId },
      });
    } catch (e) {
      return toErrorResponse(e, requestId);
    }
  },
);
