import { ACTOR_ROLES, type ActorRole } from "@cyberpulse/shared/enums";

// security/auth-strategy.md §2: labelled "Prototype role", never "Signed in
// as" — role switching is a demonstration affordance, not authentication
// (TC-UI-080). Each role opens its home page in a new tab carrying ?as=ROLE,
// so every tab keeps its own role (ADR-024). Authorisation is still enforced
// server-side for whatever role a request claims.
const HOME: Record<ActorRole, string> = {
  LEA: "/dashboard",
  BANK: "/dashboard",
  ADMIN: "/dashboard",
  I4C: "/dashboard",
  GUARD: "/guard",
  CITIZEN: "/safety",
};

export function roleHref(role: ActorRole): string {
  return `${HOME[role]}?as=${role}`;
}

export function RoleSwitcher({ role, dark = false }: { role: ActorRole; dark?: boolean }) {
  return (
    <nav aria-label="Prototype role" className={`flex flex-wrap items-center gap-1.5 text-xs ${dark ? "text-slate-200" : "text-slate-600"}`}>
      <span className="mr-1">Prototype role</span>
      {ACTOR_ROLES.map((r) => (
        <a
          key={r}
          href={roleHref(r)}
          target="_blank"
          rel="noopener"
          aria-current={r === role ? "true" : undefined}
          className={`rounded-md border px-2 py-1.5 font-medium ${
            r === role ? "border-sih-blue-600 bg-sih-blue-600 text-white" : "border-slate-200 bg-slate-50 text-slate-800 hover:bg-slate-100"
          }`}
        >
          {r}
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
      ))}
    </nav>
  );
}
