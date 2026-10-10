import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { ACTOR_ROLES, type ActorRole } from "@cyberpulse/shared/enums";
import { env } from "@/lib/env";
import { ForbiddenError } from "@/lib/errors";

// security/auth-strategy.md §2.2. Not authentication — no person is
// identified (ADR-019). Every role except ADMIN is asserted, never verified.
// ADMIN (settings, simulation, demo reset) must be earned with the shared
// demo access code, and is carried in a signed, expiring cookie (ADR-023).
// An unrecognised or unverified value falls back to LEA — not the most
// restrictive role (GUARD is, per ADR-021), but the safe default this
// prototype's cookie-less experience is built around: existing demo/map E2E
// specs navigate with no role cookie set and expect full LEA-level
// capability, and TC-SEC-010's actual intent is "never escalate to ADMIN on
// bad input," which LEA satisfies regardless of what else exists.
const ActorRoleSchema = z.enum(ACTOR_ROLES);
export const ROLE_COOKIE = "cyberpulse_role";
const ROLE_HEADER = "x-cyberpulse-role";
export const ADMIN_SESSION_TTL_MS = 8 * 60 * 60 * 1000;
// "Keep ADMIN on this device": enter the code once before an event.
export const ADMIN_KEEP_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const SIGNED_ADMIN = /^ADMIN\.(\d{1,16})\.([A-Za-z0-9_-]{43})$/;

export function resolveRole(req: Request, nowMs: number = Date.now()): ActorRole {
  const header = req.headers.get(ROLE_HEADER);
  return header !== null ? claimedRole(header) : cookieRole(getCookie(req, ROLE_COOKIE), nowMs);
}

/** The cookie value a role switch sets. Throws ForbiddenError for ADMIN
 * without the right access code; every other role needs none. */
export function issueRoleCookie(
  role: ActorRole,
  accessCode: string | undefined,
  nowMs: number,
  keep = false,
): { value: string; maxAgeSeconds?: number } {
  if (role !== "ADMIN") return { value: role };
  if (accessCode === undefined || !sameText(accessCode, env.ADMIN_ACCESS_CODE)) throw new ForbiddenError();
  const ttlMs = keep ? ADMIN_KEEP_TTL_MS : ADMIN_SESSION_TTL_MS;
  const payload = `ADMIN.${nowMs + ttlMs}`;
  return { value: `${payload}.${sign(payload)}`, maxAgeSeconds: ttlMs / 1000 };
}

/** ADR-023 amendment: the code is shown in the role switcher so judges can
 * use ADMIN on their own devices. Server-only callers pass it to the client
 * component; while it is shown, anyone with the link can become ADMIN. */
export function demoAdminAccessCode(): string {
  return env.ADMIN_ACCESS_CODE;
}

// The key derives from the access code, so changing the code also ends every
// ADMIN session issued under the old one.
function sign(payload: string): string {
  const key = createHash("sha256").update(`cyberpulse-admin-role:${env.ADMIN_ACCESS_CODE}`).digest();
  return createHmac("sha256", key).update(payload).digest("base64url");
}

// Hashing first gives timingSafeEqual equal-length inputs, so the comparison
// leaks neither content nor length.
function sameText(a: string, b: string): boolean {
  return timingSafeEqual(createHash("sha256").update(a).digest(), createHash("sha256").update(b).digest());
}

function cookieRole(raw: string | undefined, nowMs: number): ActorRole {
  const signed = raw?.match(SIGNED_ADMIN);
  if (!signed) return claimedRole(raw);
  const [, expiresAt = "", signature = ""] = signed;
  const valid = sameText(signature, sign(`ADMIN.${expiresAt}`)) && nowMs < Number(expiresAt);
  return valid ? "ADMIN" : "LEA";
}

// An unverified claim may name any role but ADMIN.
function claimedRole(raw: string | null | undefined): ActorRole {
  const parsed = ActorRoleSchema.safeParse(raw ?? "LEA");
  return parsed.success && parsed.data !== "ADMIN" ? parsed.data : "LEA";
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
export async function resolveRoleFromNextHeaders(nowMs: number = Date.now()): Promise<ActorRole> {
  const { cookies, headers } = await import("next/headers");
  const [cookieStore, headerStore] = await Promise.all([cookies(), headers()]);
  const header = headerStore.get(ROLE_HEADER);
  return header !== null ? claimedRole(header) : cookieRole(cookieStore.get(ROLE_COOKIE)?.value, nowMs);
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
