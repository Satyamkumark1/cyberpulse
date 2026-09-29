import { RATE_LIMITS } from "@cyberpulse/shared/constants";
import { PredictRequest } from "@cyberpulse/shared/zod/predict-request";
import { toErrorResponse } from "@/lib/errors";
import { withRateLimit } from "@/lib/rateLimit";
import { getRequestId } from "@/lib/requestId";
import { resolveOrigin, resolveRole, type RequestContext } from "@/services/lib/auth";
import { predict } from "@/services/predictionService";

// architecture/api-design.md API-010. Handler shape per RULE-backend.md:
// validate -> authorise (inside the service) -> delegate -> respond. No
// business logic, no SQL here.
export const POST = withRateLimit(RATE_LIMITS.predict, (req) => `${resolveRole(req)}`)(async (req: Request) => {
  const requestId = getRequestId(req);
  try {
    const input = PredictRequest.parse(await req.json());
    const ctx: RequestContext = { role: resolveRole(req), requestId, origin: resolveOrigin(req) };

    const { prediction, created } = await predict(input, ctx);
    return Response.json(prediction, {
      status: created ? 201 : 200,
      headers: { "Cache-Control": "no-store", "x-request-id": requestId },
    });
  } catch (e) {
    return toErrorResponse(e, requestId);
  }
});
