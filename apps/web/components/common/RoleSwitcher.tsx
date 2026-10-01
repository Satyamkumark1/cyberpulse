"use client"; // interaction: posts the role change and refreshes the current route

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ACTOR_ROLES, type ActorRole } from "@cyberpulse/shared/enums";

// security/auth-strategy.md §2: labelled "Prototype role", never "Signed in
// as" — role switching is a demonstration affordance, not authentication
// (TC-UI-080). Authorisation is still enforced server-side for whatever role
// this sets; this control only asserts which one a request claims.
export function RoleSwitcher({ role, dark = false }: { role: ActorRole; dark?: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  const change = async (next: ActorRole) => {
    if (next === role || pending) return;
    setPending(true);
    try {
      const res = await fetch("/api/role", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ role: next }),
      });
      // ADR-022: CITIZEN has no officer page, so go to the citizen pages.
      if (res.ok && next === "CITIZEN") router.push("/safety");
      else router.refresh();
    } finally {
      setPending(false);
    }
  };

  return (
    <label className={`flex items-center gap-2 text-xs ${dark ? "text-slate-200" : "text-slate-600"}`}>
      <span>Prototype role</span>
      <select
        value={role}
        disabled={pending}
        onChange={(e) => void change(e.target.value as ActorRole)}
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
