import { z } from "zod";
import { ACTOR_ROLES, type ActorRole } from "@cyberpulse/shared/enums";
import { ForbiddenError } from "@/lib/errors";

// security/auth-strategy.md §2.2. Not authentication (ADR-019) — a role is
// asserted, never verified. An unrecognised value falls back to LEA, the
// least-privileged valid role, never ADMIN (TC-SEC-010).
const ActorRoleSchema = z.enum(ACTOR_ROLES);
const ROLE_COOKIE = "cyberpulse_role";
const ROLE_HEADER = "x-cyberpulse-role";

export function resolveRole(req: Request): ActorRole {
  const header = req.headers.get(ROLE_HEADER);
  const cookie = getCookie(req, ROLE_COOKIE);
  return parseRole(header ?? cookie);
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
  | "health:read";

const CAPABILITY_MATRIX: Record<Capability, Record<ActorRole, boolean>> = {
  "complaints:list": { LEA: true, BANK: true, ADMIN: true },
  "complaints:read": { LEA: true, BANK: true, ADMIN: true },
  "complaints:updateStatus": { LEA: true, BANK: false, ADMIN: true },
  "transactions:list": { LEA: true, BANK: true, ADMIN: true },
  "transactions:network": { LEA: true, BANK: true, ADMIN: true },
  "prediction:run": { LEA: true, BANK: false, ADMIN: true },
  "hotspots:read": { LEA: true, BANK: true, ADMIN: true },
  "alerts:create": { LEA: true, BANK: false, ADMIN: true },
  "alerts:read": { LEA: true, BANK: true, ADMIN: true },
  "alerts:acknowledge": { LEA: true, BANK: true, ADMIN: true },
  "alerts:close": { LEA: true, BANK: false, ADMIN: true },
  "investigations:create": { LEA: true, BANK: false, ADMIN: true },
  "investigations:read": { LEA: true, BANK: true, ADMIN: true },
  "investigations:transition": { LEA: true, BANK: false, ADMIN: true },
  "investigations:addNote": { LEA: true, BANK: true, ADMIN: true },
  "reports:read": { LEA: true, BANK: true, ADMIN: true },
  "metrics:read": { LEA: true, BANK: true, ADMIN: true },
  "settings:read": { LEA: true, BANK: true, ADMIN: true },
  "settings:write": { LEA: false, BANK: false, ADMIN: true },
  "simulation:control": { LEA: false, BANK: false, ADMIN: true },
  "demo:reset": { LEA: false, BANK: false, ADMIN: true },
  "health:read": { LEA: true, BANK: true, ADMIN: true },
};

/** Stage 1 of two (security/authorization.md §1). Throws ForbiddenError —
 * never returns false — so a caller cannot forget to check the result. */
export function requireCapability(role: ActorRole, capability: Capability): void {
  if (!CAPABILITY_MATRIX[capability][role]) {
    throw new ForbiddenError();
  }
}

/** architecture/api-design.md API-023: simulation endpoints are "ADMIN and
 * the demo route only" — a role-only capability check can't express the
 * second clause, so this checks `ctx.origin` too. */
export function requireAdminOrDemo(ctx: RequestContext): void {
  if (ctx.role !== "ADMIN" && ctx.origin !== "DEMO") {
    throw new ForbiddenError();
  }
}
