"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { StatePanel } from "@/components/common/StatePanel";
import { apiFetch, jsonInit } from "@/lib/apiFetch";
import type { HealthResponse } from "@cyberpulse/shared/zod/health";

interface Settings { thresholdHigh: number; thresholdMedium: number; systemMode: string; dataMode: string; activeModelVersion: string; notifyToastOnAlert: boolean | null; notifyAnnouncePrediction: boolean | null; }
type HealthComponent = HealthResponse["web"];

// RULE-frontend.md non-negotiable #2: colour AND text AND icon for any
// status — text alone is not enough, even for an operational (non-risk) status.
const STATUS_STYLES: Record<string, { classes: string; icon: string }> = {
  healthy: { classes: "text-emerald-700", icon: "●" },
  up: { classes: "text-emerald-700", icon: "●" },
  degraded: { classes: "text-amber-700", icon: "▲" },
  unhealthy: { classes: "text-red-700", icon: "✕" },
  down: { classes: "text-red-700", icon: "✕" },
};

function StatusLabel({ status }: { status: string }) {
  const style = STATUS_STYLES[status] ?? { classes: "text-slate-600", icon: "—" };
  return (
    <span className={`inline-flex items-center gap-1 font-mono ${style.classes}`}>
      <span aria-hidden="true">{style.icon}</span>
      {status}
    </span>
  );
}

export function SettingsPanel({ role }: { role: string }) {
  const settings = useQuery({ queryKey: ["settings"], queryFn: () => apiFetch<Settings>("/api/settings") });
  const health = useQuery({ queryKey: ["health"], queryFn: () => apiFetch<HealthResponse>("/api/health") });

  if (settings.isError) return <StatePanel state="error" message="Unable to load settings." onRetry={() => settings.refetch()} />;
  if (settings.isLoading || !settings.data) return <StatePanel state="loading" title="Loading settings" message="Retrieving configuration and service health." />;

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <SettingsForm role={role} initial={settings.data} />
      <section className="rounded-sm border border-slate-200 bg-white p-5">
        <h2 className="text-base font-semibold text-slate-800">System health</h2>
        {health.isLoading ? (
          <p className="mt-3 text-sm text-slate-500">Loading health…</p>
        ) : health.isError || !health.data ? (
          <p className="mt-3 text-sm text-slate-500">Health is unavailable.</p>
        ) : (
          <>
            <p className="mt-1 text-sm text-slate-600">Overall status: <StatusLabel status={health.data.status} /></p>
            <ul className="mt-4 space-y-3 text-sm">
              {([["Web", health.data.web], ["Database", health.data.database], ["ML service", health.data.mlService]] as [string, HealthComponent][]).map(([name, item]) => (
                <li key={name} className="flex justify-between border-b border-slate-100 pb-2">
                  <span>{name}</span>
                  <span><StatusLabel status={item.status} /> · {item.latencyMs} ms</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </div>
  );
}

function SettingsForm({ role, initial }: { role: string; initial: Settings }) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState(initial);
  const [message, setMessage] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (input: Settings) =>
      apiFetch<Settings>(
        "/api/settings",
        jsonInit("PATCH", {
          thresholdHigh: input.thresholdHigh,
          thresholdMedium: input.thresholdMedium,
          notifyToastOnAlert: input.notifyToastOnAlert ?? false,
          notifyAnnouncePrediction: input.notifyAnnouncePrediction ?? false,
        }),
        "Unable to save settings.",
      ),
    onSuccess: (saved) => {
      setDraft(saved);
      queryClient.setQueryData(["settings"], saved);
      setMessage("Settings saved. Stored prediction scores are unchanged.");
    },
    onError: (reason) => setMessage(reason instanceof Error ? reason.message : "Unable to save settings."),
  });

  const change = (key: "thresholdHigh" | "thresholdMedium", value: string) => {
    const next = Number(value);
    if (!Number.isFinite(next)) return;
    setDraft((current) => ({ ...current, [key]: next }));
  };
  const toggle = (key: "notifyToastOnAlert" | "notifyAnnouncePrediction") => setDraft((current) => ({ ...current, [key]: !current[key] }));

  return (
    <form
      onSubmit={(event) => { event.preventDefault(); setMessage(null); mutation.mutate(draft); }}
      className="space-y-4 rounded-sm border border-slate-200 bg-white p-5"
    >
      <h2 className="text-base font-semibold text-slate-800">Configuration</h2>
      <dl className="grid grid-cols-2 gap-3 text-sm">
        <div><dt className="text-slate-500">System Mode</dt><dd className="font-medium text-slate-800">{draft.systemMode}</dd></div>
        <div><dt className="text-slate-500">Data Mode</dt><dd className="font-medium text-slate-800">{draft.dataMode}</dd></div>
        <div className="col-span-2"><dt className="text-slate-500">Model version</dt><dd className="font-mono text-slate-800">{draft.activeModelVersion}</dd></div>
      </dl>
      <fieldset disabled={role !== "ADMIN"} className="grid grid-cols-2 gap-3 border-t border-slate-100 pt-4">
        <legend className="mb-2 text-sm font-semibold text-slate-800">Display thresholds</legend>
        <label className="text-sm text-slate-700">HIGH<input type="number" min="0" max="1" step="0.01" value={draft.thresholdHigh} onChange={(e) => change("thresholdHigh", e.target.value)} className="mt-1 block w-full rounded border border-slate-300 px-2 py-1.5 disabled:bg-slate-100" /></label>
        <label className="text-sm text-slate-700">MEDIUM<input type="number" min="0" max="1" step="0.01" value={draft.thresholdMedium} onChange={(e) => change("thresholdMedium", e.target.value)} className="mt-1 block w-full rounded border border-slate-300 px-2 py-1.5 disabled:bg-slate-100" /></label>
      </fieldset>
      <p className="text-xs text-slate-500">Thresholds change risk-level display only; stored scores are never modified.</p>
      <fieldset disabled={role !== "ADMIN"} className="space-y-2 border-t border-slate-100 pt-4">
        <legend className="mb-2 text-sm font-semibold text-slate-800">Notification preferences</legend>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={draft.notifyToastOnAlert ?? false} onChange={() => toggle("notifyToastOnAlert")} className="rounded border-slate-300" />
          Toast on new alert
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={draft.notifyAnnouncePrediction ?? false} onChange={() => toggle("notifyAnnouncePrediction")} className="rounded border-slate-300" />
          Announce prediction completion
        </label>
      </fieldset>
      {role === "ADMIN" ? (
        <button type="submit" disabled={mutation.isPending} className="rounded bg-sih-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
          {mutation.isPending ? "Saving…" : "Save settings"}
        </button>
      ) : (
        <p className="text-sm text-slate-500">Only ADMIN can change settings.</p>
      )}
      {message && <p role="status" className="text-sm text-slate-700">{message}</p>}
    </form>
  );
}
