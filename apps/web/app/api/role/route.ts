import { z } from "zod";
import { ACTOR_ROLES } from "@cyberpulse/shared/enums";
import { RATE_LIMITS } from "@cyberpulse/shared/constants";
import { toErrorResponse } from "@/lib/errors";
import { withRateLimit } from "@/lib/rateLimit";
import { getRequestId } from "@/lib/requestId";
import { issueRoleCookie, ROLE_COOKIE } from "@/services/lib/auth";

const BodySchema = z.object({ role: z.enum(ACTOR_ROLES), accessCode: z.string().min(1).max(128).optional() }).strict();

// architecture/api-design.md API-091, security/auth-strategy.md §2. Still not
// authentication (ADR-019): no person is identified. ADMIN needs the demo
// access code, and its cookie is signed and expiring (ADR-023), so it is
// httpOnly — page script has no reason to read it.
export const POST = withRateLimit(RATE_LIMITS.mutations)(async (req: Request) => {
  const requestId = getRequestId(req);
  try {
    const { role, accessCode } = BodySchema.parse(await req.json());
    const cookie = issueRoleCookie(role, accessCode, Date.now());
    const maxAge = cookie.maxAgeSeconds === undefined ? "" : `; Max-Age=${cookie.maxAgeSeconds}`;
    const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
    return Response.json(
      { role },
      {
        status: 200,
        headers: {
          "x-request-id": requestId,
          "Set-Cookie": `${ROLE_COOKIE}=${cookie.value}; Path=/; HttpOnly; SameSite=Lax${maxAge}${secure}`,
        },
      },
    );
  } catch (e) {
    return toErrorResponse(e, requestId);
  }
});
