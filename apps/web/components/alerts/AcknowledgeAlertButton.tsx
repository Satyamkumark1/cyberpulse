"use client";

import { useState } from "react";
import { ApiError, apiFetch } from "@/lib/apiFetch";

interface Props {
  alertId: string;
}

export function AcknowledgeAlertButton({ alertId }: Props) {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAcknowledge() {
    setLoading(true);
    setError(null);
    try {
      await apiFetch(`/api/alerts/${encodeURIComponent(alertId)}/acknowledge`, { method: "POST" }, "Failed to acknowledge alert.");
      setDone(true);
      // Reload page to reflect new status
      window.location.reload();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Network error — please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (done) return null;

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        id={`ack-alert-${alertId}`}
        onClick={handleAcknowledge}
        disabled={loading}
        className="rounded border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sih-blue-600 disabled:opacity-50"
      >
        {loading ? "Acknowledging…" : "Acknowledge"}
      </button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
