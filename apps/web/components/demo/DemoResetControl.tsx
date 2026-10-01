"use client"; // confirmation dialog with in-flight state

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError, apiFetch } from "@/lib/apiFetch";

interface ResetCounts {
  alertsCleared: number;
  investigationsCleared: number;
  complaintsCleared: number;
}

function plural(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}

const DEMO_HEADERS = { "x-cyberpulse-origin": "DEMO" } as const;

/** Demo reset is an ADMIN capability; the role selector sits beside this
 *  control, so naming the required role is actionable rather than a dead end. */
function reasonFor(error: unknown): string {
  if (error instanceof ApiError && error.code === "FORBIDDEN") {
    return "Demo reset requires the ADMIN role.";
  }
  return error instanceof Error ? error.message : "Unable to check what would be cleared.";
}

// FR-18.1, FR-18.2 / AC-P7-06, AC-P7-07: the confirmation names the exact
// counts before the user commits — it previews via GET before ever calling
// the destructive POST.
export function DemoResetControl() {
  const [confirming, setConfirming] = useState(false);
  const queryClient = useQueryClient();

  const preview = useQuery({
    queryKey: ["demo-reset-preview"],
    queryFn: () => apiFetch<ResetCounts>("/api/demo/reset", { headers: DEMO_HEADERS }),
    enabled: confirming,
    // Never retry a 4xx: a role that cannot reset will not gain the capability
    // on the second attempt, and the backoff only delays telling the user why
    // (RULE-backend §Errors — connection errors only).
    retry: (failureCount, error) => failureCount < 2 && (!(error instanceof ApiError) || error.code === "INTERNAL_ERROR"),
  });

  const mutation = useMutation({
    mutationFn: () => apiFetch<ResetCounts>("/api/demo/reset", { method: "POST", headers: DEMO_HEADERS }),
    retry: false,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alerts"] });
      queryClient.invalidateQueries({ queryKey: ["investigations"] });
      queryClient.invalidateQueries({ queryKey: ["recent-alerts"] });
      setConfirming(false);
    },
  });

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="rounded-sm border border-white/40 px-3 py-1.5 text-sm text-white hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
      >
        Reset Demo
      </button>
    );
  }

  return (
    <div role="alertdialog" aria-labelledby="demo-reset-heading" className="flex items-center gap-3 rounded-sm bg-white px-3 py-2 text-slate-800 shadow-lg">
      <div className="text-sm">
        <p id="demo-reset-heading" className="font-semibold">
          Reset demo data?
        </p>
        {preview.isFetching ? (
          <p className="text-slate-600">Checking what will be cleared…</p>
        ) : preview.isError || !preview.data ? (
          <p className="text-red-700">{reasonFor(preview.error)}</p>
        ) : (
          <p className="text-slate-600">
            Clears {plural(preview.data.alertsCleared, "demo alert")}, {plural(preview.data.investigationsCleared, "demo investigation")} and{" "}
            {plural(preview.data.complaintsCleared, "citizen report")}. Seed data is never touched.
          </p>
        )}
        {mutation.isError ? <p className="text-red-700">{reasonFor(mutation.error)}</p> : null}
      </div>
      <button
        type="button"
        onClick={() => mutation.mutate()}
        disabled={mutation.isPending || preview.isFetching || !preview.isSuccess || !preview.data}
        className="rounded-sm bg-red-700 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
      >
        {mutation.isPending ? "Resetting…" : "Confirm reset"}
      </button>
      <button type="button" onClick={() => setConfirming(false)} className="text-sm text-slate-600 hover:underline">
        Cancel
      </button>
    </div>
  );
}
