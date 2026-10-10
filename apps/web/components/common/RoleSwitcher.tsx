"use client"; // interaction: posts the role change and refreshes the current route

import { useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { ACTOR_ROLES, type ActorRole } from "@cyberpulse/shared/enums";

// security/auth-strategy.md §2: labelled "Prototype role", never "Signed in
// as" — role switching is a demonstration affordance, not authentication
// (TC-UI-080). Authorisation is still enforced server-side for whatever role
// this sets. ADMIN alone asks for the demo access code (ADR-023); the server
// decides whether the code is right.
export function RoleSwitcher({ role, dark = false }: { role: ActorRole; dark?: boolean }) {
  const router = useRouter();
  const selectRef = useRef<HTMLSelectElement>(null);
  const [askingCode, setAskingCode] = useState(false);
  const [rejection, setRejection] = useState<string | null>(null);
  // A mutation (not a bare fetch) so the global request indicator sees it.
  const { mutate, isPending: pending } = useMutation({
    mutationFn: ({ next, accessCode }: { next: ActorRole; accessCode?: string }) =>
      fetch("/api/role", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(accessCode === undefined ? { role: next } : { role: next, accessCode }),
      }),
    onSuccess: (res, { next }) => {
      if (next === "ADMIN" && !res.ok) {
        setRejection(res.status === 403 ? "Access code not accepted." : "Role not changed. Try again.");
        return;
      }
      setAskingCode(false);
      // ADR-022: CITIZEN has no officer page, so go to the citizen pages.
      if (res.ok && next === "CITIZEN") router.push("/safety");
      else router.refresh();
    },
    onError: () => router.refresh(),
  });

  const change = (next: ActorRole) => {
    if (next === role || pending) return;
    if (next === "ADMIN") {
      setRejection(null);
      setAskingCode(true);
      return;
    }
    mutate({ next });
  };

  const cancel = () => {
    setAskingCode(false);
    setRejection(null);
    selectRef.current?.focus();
  };

  const submitCode = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const accessCode = String(new FormData(e.currentTarget).get("accessCode") ?? "");
    if (accessCode) mutate({ next: "ADMIN", accessCode });
  };

  const onFormKeyDown = (e: KeyboardEvent<HTMLFormElement>) => {
    if (e.key === "Escape") cancel();
  };

  const text = dark ? "text-slate-200" : "text-slate-600";
  const control = "rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs font-medium text-slate-800 disabled:opacity-50";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className={`flex items-center gap-2 text-xs ${text}`}>
        <span>Prototype role</span>
        <select
          ref={selectRef}
          value={role}
          disabled={pending || askingCode}
          onChange={(e) => change(e.target.value as ActorRole)}
          className={control}
        >
          {ACTOR_ROLES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </label>
      {askingCode && (
        <form onSubmit={submitCode} onKeyDown={onFormKeyDown} className={`flex flex-wrap items-center gap-2 text-xs ${text}`}>
          <label htmlFor="admin-access-code">ADMIN access code</label>
          <input
            id="admin-access-code"
            name="accessCode"
            type="password"
            autoComplete="off"
            required
            autoFocus
            disabled={pending}
            className={`${control} w-36`}
          />
          <button type="submit" disabled={pending} className={control}>
            Switch
          </button>
          <button type="button" onClick={cancel} disabled={pending} className={control}>
            Cancel
          </button>
          <span role="status" aria-live="polite" className="font-medium">
            {rejection}
          </span>
        </form>
      )}
    </div>
  );
}
