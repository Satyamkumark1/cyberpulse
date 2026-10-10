import { z } from "zod";
import { ACTOR_ROLES } from "@cyberpulse/shared/enums";
import { RATE_LIMITS } from "@cyberpulse/shared/constants";
import { toErrorResponse } from "@/lib/errors";
import { withRateLimit } from "@/lib/rateLimit";
import { getRequestId } from "@/lib/requestId";
import { ROLE_COOKIE } from "@/services/lib/auth";

const BodySchema = z.object({ role: z.enum(ACTOR_ROLES) }).strict();

// architecture/api-design.md API-091, security/auth-strategy.md §2. A
// demonstration affordance, not authentication (ADR-019) — the cookie is
// deliberately non-httpOnly so nothing about it looks like a credential.
export const POST = withRateLimit(RATE_LIMITS.mutations)(async (req: Request) => {
  const requestId = getRequestId(req);
  try {
    const { role } = BodySchema.parse(await req.json());
    const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
    return Response.json(
      { role },
      {
        status: 200,
        headers: {
          "x-request-id": requestId,
          "Set-Cookie": `${ROLE_COOKIE}=${role}; Path=/; SameSite=Lax${secure}`,
        },
      },
    );
  } catch (e) {
    return toErrorResponse(e, requestId);
  }
});
