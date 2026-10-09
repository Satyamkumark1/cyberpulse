"use client"; // interaction: posts the role change and refreshes the current route

import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { ACTOR_ROLES, type ActorRole } from "@cyberpulse/shared/enums";

// security/auth-strategy.md §2: labelled "Prototype role", never "Signed in
// as" — role switching is a demonstration affordance, not authentication
// (TC-UI-080). Authorisation is still enforced server-side for whatever role
// this sets; this control only asserts which one a request claims.
export function RoleSwitcher({ role, dark = false }: { role: ActorRole; dark?: boolean }) {
  const router = useRouter();
  // A mutation (not a bare fetch) so the global request indicator sees it.
  const { mutate, isPending: pending } = useMutation({
    mutationFn: (next: ActorRole) =>
      fetch("/api/role", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ role: next }),
      }),
    // ADR-022: CITIZEN has no officer page, so go to the citizen pages.
    onSuccess: (res, next) => (res.ok && next === "CITIZEN" ? router.push("/safety") : router.refresh()),
    onError: () => router.refresh(),
  });

  const change = (next: ActorRole) => {
    if (next === role || pending) return;
    mutate(next);
  };

  return (
    <label className={`flex items-center gap-2 text-xs ${dark ? "text-slate-200" : "text-slate-600"}`}>
      <span>Prototype role</span>
      <select
        value={role}
        disabled={pending}
        onChange={(e) => change(e.target.value as ActorRole)}
        className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs font-medium text-slate-800 disabled:opacity-50"
      >
        {ACTOR_ROLES.map((r) => (
          <option key={r} value={r}>
            {r}
          </option>
        ))}
      </select>
    </label>
  );
}
