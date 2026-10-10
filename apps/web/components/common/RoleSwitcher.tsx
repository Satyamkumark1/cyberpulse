"use client"; // interaction: posts the role change and refreshes the current route

import { useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { ACTOR_ROLES, type ActorRole } from "@cyberpulse/shared/enums";

// security/auth-strategy.md §2: labelled "Prototype role", never "Signed in
// as" — role switching is a demonstration affordance, not authentication
// (TC-UI-080). Authorisation is still enforced server-side for whatever role
// this sets. One click per role; ADMIN alone asks for the demo access code,
// which the server shows here so judges can use it (ADR-023 amendment). The
// server still decides whether a submitted code is right.
type Switch = { next: ActorRole; accessCode?: string; keep?: boolean };

export function RoleSwitcher({ role, dark = false, demoCode }: { role: ActorRole; dark?: boolean; demoCode?: string }) {
  const router = useRouter();
  const adminButtonRef = useRef<HTMLButtonElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [askingCode, setAskingCode] = useState(false);
  const [rejection, setRejection] = useState<string | null>(null);
  // A mutation (not a bare fetch) so the global request indicator sees it.
  const { mutate, isPending: pending } = useMutation({
    mutationFn: ({ next, accessCode, keep }: Switch) =>
      fetch("/api/role", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(accessCode === undefined ? { role: next } : { role: next, accessCode, keep }),
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
    adminButtonRef.current?.focus();
  };

  const submitCode = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const accessCode = String(data.get("accessCode") ?? "");
    if (accessCode) mutate({ next: "ADMIN", accessCode, keep: data.get("keep") === "on" });
  };

  const useDemoCode = () => {
    const form = formRef.current;
    const input = form?.elements.namedItem("accessCode");
    if (!form || !(input instanceof HTMLInputElement) || !demoCode) return;
    input.value = demoCode;
    form.requestSubmit();
  };

  const onFormKeyDown = (e: KeyboardEvent<HTMLFormElement>) => {
    if (e.key === "Escape") cancel();
  };

  const text = dark ? "text-slate-200" : "text-slate-600";
  const control = "rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs font-medium text-slate-800 disabled:opacity-50";
  const persona = (active: boolean) =>
    `rounded-md border px-2 py-1.5 text-xs font-medium disabled:opacity-50 ${
      active ? "border-sih-blue-600 bg-sih-blue-600 text-white" : "border-slate-200 bg-slate-50 text-slate-800 hover:bg-slate-100"
    }`;

  return (
    <div className="flex flex-col gap-2">
      <div role="group" aria-labelledby="prototype-role-label" className={`flex flex-wrap items-center gap-1.5 text-xs ${text}`}>
        <span id="prototype-role-label" className="mr-1">Prototype role</span>
        {ACTOR_ROLES.map((r) => (
          <button
            key={r}
            ref={r === "ADMIN" ? adminButtonRef : undefined}
            type="button"
            aria-pressed={r === role}
            disabled={pending}
            onClick={() => change(r)}
            className={persona(r === role)}
          >
            {r}
          </button>
        ))}
      </div>
      {askingCode && (
        <form ref={formRef} onSubmit={submitCode} onKeyDown={onFormKeyDown} className={`flex flex-wrap items-center gap-2 text-xs ${text}`}>
          {/* Lets the browser or a password manager save the code as an "ADMIN" login. */}
          <input type="text" name="username" autoComplete="username" value="ADMIN" readOnly hidden />
          <label htmlFor="admin-access-code">ADMIN access code</label>
          <input
            id="admin-access-code"
            name="accessCode"
            type="password"
            autoComplete="current-password"
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
          <label className="flex items-center gap-1">
            <input type="checkbox" name="keep" disabled={pending} />
            Keep ADMIN on this device for 7 days
          </label>
          {demoCode && (
            <span className="flex flex-wrap items-center gap-2">
              <span>
                Demo code: <code className="font-mono">{demoCode}</code>
              </span>
              <button type="button" onClick={useDemoCode} disabled={pending} className={control}>
                Use demo code
              </button>
            </span>
          )}
          <span role="status" aria-live="polite" className="font-medium">
            {rejection}
          </span>
        </form>
      )}
    </div>
  );
}
