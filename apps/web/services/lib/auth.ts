import { z } from "zod";
import { ACTOR_ROLES, type ActorRole } from "@cyberpulse/shared/enums";
import { ForbiddenError } from "@/lib/errors";

// security/auth-strategy.md §2.2. Not authentication (ADR-019) — a role is
// asserted, never verified. An unrecognised value falls back to LEA — not
// the most restrictive role (GUARD is, per ADR-021), but the safe default
// this prototype's cookie-less experience is built around: existing demo/map
// E2E specs navigate with no role cookie set and expect full LEA-level
// capability, and TC-SEC-010's actual intent is "never escalate to ADMIN on
// bad input," which LEA satisfies regardless of what else exists.
const ActorRoleSchema = z.enum(ACTOR_ROLES);
export const ROLE_COOKIE = "cyberpulse_role";
const ROLE_HEADER = "x-cyberpulse-role";

export function resolveRole(req: Request): ActorRole {
  const header = req.headers.get(ROLE_HEADER);
  const cookie = getCookie(req, ROLE_COOKIE);
  return parseRole(header ?? cookie);
}

// FEAT-14 / FR-19.2: the only signal that tags a write as demo-generated
// (`origin = 'DEMO'`), which is what `POST /api/demo/reset` scopes against.
// Not a security boundary — same asserted-not-verified status as the role
// header (ADR-019) — a mislabelled request only affects which rows a demo
// reset clears, never authorisation.
const ORIGIN_HEADER = "x-cyberpulse-origin";

export function resolveOrigin(req: Request): "USER" | "DEMO" {
  return req.headers.get(ORIGIN_HEADER) === "DEMO" ? "DEMO" : "USER";
}

/** Same resolution, for Server Components/pages that have no raw Request
 * (Next's `cookies()`/`headers()` instead) — e.g. the complaints pages
 * calling services directly rather than through a route handler. */
export async function resolveRoleFromNextHeaders(): Promise<ActorRole> {
  const { cookies, headers } = await import("next/headers");
  const [cookieStore, headerStore] = await Promise.all([cookies(), headers()]);
  return parseRole(headerStore.get(ROLE_HEADER) ?? cookieStore.get(ROLE_COOKIE)?.value);
}

function parseRole(raw: string | null | undefined): ActorRole {
  const parsed = ActorRoleSchema.safeParse(raw ?? "LEA");
  return parsed.success ? parsed.data : "LEA";
}

function getCookie(req: Request, name: string): string | undefined {
  const header = req.headers.get("cookie");
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return undefined;
}

export interface RequestContext {
  role: ActorRole;
  requestId: string;
  origin: "USER" | "DEMO";
}

// security/authorization.md §2. Full capability matrix; ⚠ (scoped) entries
// are still `true` here — scope is enforced separately, as a query
// predicate (services/lib/scope.ts), never by narrowing the capability
// check itself (Rule 3, §4.1).
type Capability =
  | "complaints:list"
  | "complaints:read"
  | "complaints:updateStatus"
  | "transactions:list"
  | "transactions:network"
  | "prediction:run"
  | "hotspots:read"
  | "alerts:create"
  | "alerts:read"
  | "alerts:acknowledge"
  | "alerts:close"
  | "investigations:create"
  | "investigations:read"
  | "investigations:transition"
  | "investigations:addNote"
  | "reports:read"
  | "metrics:read"
  | "settings:read"
  | "settings:write"
  | "simulation:control"
  | "demo:reset"
  | "health:read"
  | "citizenReports:create"
  | "citizenReports:status";

// GUARD: read-only, identity-free (ADR-021) — only what a duty-post landing
// view needs. I4C: national-scope reader (PER-02) with no case-management
// writes — unscoped, same bucket as LEA/ADMIN in services/lib/scope.ts.
// CITIZEN (ADR-022): the public Scam Shield caller — denied every officer
// capability, and the only role that may file or track a citizen report.
const CAPABILITY_MATRIX: Record<Capability, Record<ActorRole, boolean>> = {
  "complaints:list": { LEA: true, BANK: true, ADMIN: true, GUARD: false, I4C: true, CITIZEN: false },
  "complaints:read": { LEA: true, BANK: true, ADMIN: true, GUARD: false, I4C: true, CITIZEN: false },
  "complaints:updateStatus": { LEA: true, BANK: false, ADMIN: true, GUARD: false, I4C: false, CITIZEN: false },
  "transactions:list": { LEA: true, BANK: true, ADMIN: true, GUARD: false, I4C: true, CITIZEN: false },
  "transactions:network": { LEA: true, BANK: true, ADMIN: true, GUARD: false, I4C: true, CITIZEN: false },
  "prediction:run": { LEA: true, BANK: false, ADMIN: true, GUARD: false, I4C: false, CITIZEN: false },
  "hotspots:read": { LEA: true, BANK: true, ADMIN: true, GUARD: true, I4C: true, CITIZEN: false },
  "alerts:create": { LEA: true, BANK: false, ADMIN: true, GUARD: false, I4C: false, CITIZEN: false },
  "alerts:read": { LEA: true, BANK: true, ADMIN: true, GUARD: false, I4C: true, CITIZEN: false },
  "alerts:acknowledge": { LEA: true, BANK: true, ADMIN: true, GUARD: false, I4C: false, CITIZEN: false },
  "alerts:close": { LEA: true, BANK: false, ADMIN: true, GUARD: false, I4C: false, CITIZEN: false },
  "investigations:create": { LEA: true, BANK: false, ADMIN: true, GUARD: false, I4C: false, CITIZEN: false },
  "investigations:read": { LEA: true, BANK: true, ADMIN: true, GUARD: false, I4C: true, CITIZEN: false },
  "investigations:transition": { LEA: true, BANK: false, ADMIN: true, GUARD: false, I4C: false, CITIZEN: false },
  "investigations:addNote": { LEA: true, BANK: true, ADMIN: true, GUARD: false, I4C: false, CITIZEN: false },
  "reports:read": { LEA: true, BANK: true, ADMIN: true, GUARD: false, I4C: true, CITIZEN: false },
  "metrics:read": { LEA: true, BANK: true, ADMIN: true, GUARD: true, I4C: true, CITIZEN: false },
  "settings:read": { LEA: true, BANK: true, ADMIN: true, GUARD: true, I4C: true, CITIZEN: false },
  "settings:write": { LEA: false, BANK: false, ADMIN: true, GUARD: false, I4C: false, CITIZEN: false },
  "simulation:control": { LEA: false, BANK: false, ADMIN: true, GUARD: false, I4C: false, CITIZEN: false },
  "demo:reset": { LEA: false, BANK: false, ADMIN: true, GUARD: false, I4C: false, CITIZEN: false },
  "health:read": { LEA: true, BANK: true, ADMIN: true, GUARD: true, I4C: true, CITIZEN: false },
  "citizenReports:create": { LEA: false, BANK: false, ADMIN: false, GUARD: false, I4C: false, CITIZEN: true },
  "citizenReports:status": { LEA: false, BANK: false, ADMIN: false, GUARD: false, I4C: false, CITIZEN: true },
};

/** For server-rendered UI that hides an action the role lacks. Never an
 * authorisation decision — services still call requireCapability. */
export function hasCapability(role: ActorRole, capability: Capability): boolean {
  return CAPABILITY_MATRIX[capability][role];
}

/** Stage 1 of two (security/authorization.md §1). Throws ForbiddenError —
 * never returns false — so a caller cannot forget to check the result. */
export function requireCapability(role: ActorRole, capability: Capability): void {
  if (!hasCapability(role, capability)) {
    throw new ForbiddenError();
  }
}

/** Origin labels are caller-controlled metadata; privileged access requires ADMIN. */
export function requireAdminOrDemo(ctx: RequestContext): void {
  if (ctx.role !== "ADMIN") {
    throw new ForbiddenError();
  }
}
