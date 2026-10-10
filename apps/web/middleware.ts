import { NextResponse, type NextRequest } from "next/server";
import { ACTOR_ROLES, type ActorRole } from "@cyberpulse/shared/enums";

// ADR-024: each tab carries its own prototype role in its address (?as=ROLE),
// so a presenter can keep an LEA tab and a BANK tab open side by side. A
// cookie cannot do this — every tab shares it. The role is still asserted,
// never verified (ADR-019); services enforce authorisation for whatever role
// arrives. Precedence: an explicit role header (the /safety pages, tests) →
// ?as= on this request → ?as= on the page that made the request → cookie.
const ROLE_PARAM = "as";
const ROLE_HEADER = "x-cyberpulse-role";

function asRole(value: string | null): ActorRole | null {
  return value !== null && (ACTOR_ROLES as readonly string[]).includes(value) ? (value as ActorRole) : null;
}

// Browsers send the full address of the page as Referer on same-site
// requests (no Referrer-Policy is set), which is how a fetch or a link click
// inherits its tab's role. Another site's address never counts.
function refererRole(req: NextRequest): ActorRole | null {
  const referer = req.headers.get("referer");
  if (!referer) return null;
  try {
    const url = new URL(referer);
    return url.origin === req.nextUrl.origin ? asRole(url.searchParams.get(ROLE_PARAM)) : null;
  } catch {
    return null;
  }
}

export function middleware(req: NextRequest): NextResponse {
  if (req.headers.has(ROLE_HEADER)) return NextResponse.next();

  const fromAddress = asRole(req.nextUrl.searchParams.get(ROLE_PARAM));
  const role = fromAddress ?? refererRole(req);
  if (!role) return NextResponse.next();

  // A page reached by a link from a role tab keeps the role in its own
  // address, so a reload or a further link still knows it.
  if (!fromAddress && req.method === "GET" && !req.nextUrl.pathname.startsWith("/api/")) {
    const url = req.nextUrl.clone();
    url.searchParams.set(ROLE_PARAM, role);
    return NextResponse.redirect(url);
  }

  const headers = new Headers(req.headers);
  headers.set(ROLE_HEADER, role);
  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: ["/((?!_next/|favicon\\.ico|.*\\.(?:png|svg|ico|mjs|js|css|map|webmanifest)$).*)"],
};
