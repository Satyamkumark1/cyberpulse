import { z } from "zod";
import { RATE_LIMITS } from "@cyberpulse/shared/constants";
import { toErrorResponse } from "@/lib/errors";
import { withRateLimit } from "@/lib/rateLimit";
import { getRequestId } from "@/lib/requestId";
import { resolveRole, type RequestContext } from "@/services/lib/auth";
import { get, update } from "@/services/settingsService";

const UpdateSchema = z.object({
  thresholdHigh: z.number().min(0).max(1),
  thresholdMedium: z.number().min(0).max(1),
  notifyToastOnAlert: z.boolean().optional(),
  notifyAnnouncePrediction: z.boolean().optional(),
}).strict().refine((value) => value.thresholdHigh > value.thresholdMedium, {
  message: "HIGH threshold must be greater than MEDIUM threshold",
  path: ["thresholdHigh"],
});

export const GET = withRateLimit(RATE_LIMITS.reads)(async (req: Request) => {
  const requestId = getRequestId(req);
  try {
    const ctx: RequestContext = { role: resolveRole(req), requestId, origin: "USER" };
    return Response.json(await get(ctx), { headers: { "Cache-Control": "no-store", "x-request-id": requestId } });
  } catch (error) {
    return toErrorResponse(error, requestId);
  }
});

export const PATCH = withRateLimit(RATE_LIMITS.mutations)(async (req: Request) => {
  const requestId = getRequestId(req);
  try {
    const input = UpdateSchema.parse(await req.json());
    const ctx: RequestContext = { role: resolveRole(req), requestId, origin: "USER" };
    return Response.json(await update(input, ctx), { headers: { "Cache-Control": "no-store", "x-request-id": requestId } });
  } catch (error) {
    return toErrorResponse(error, requestId);
  }
});
