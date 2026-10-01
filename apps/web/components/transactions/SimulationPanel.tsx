"use client"; // mutation with in-flight state + polling (RULE-frontend.md §Server vs client)

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { StatePanel } from "@/components/common/StatePanel";
import { formatPaise, formatTimestampIst } from "@/lib/formatters";
import { apiFetch } from "@/lib/apiFetch";

interface SimulationEvent {
  eventRef: string;
  emittedAt: string;
  channel: string;
  amountPaise: number;
}

interface SimulationEventsResponse {
  status: "RUNNING" | "PAUSED";
  events: SimulationEvent[];
}

const POLL_INTERVAL_MS = 3_000;
const VISIBLE_ROW_CAP = 50;
const EVENTS_QUERY_KEY = ["simulation-events"];

async function postAction(action: "start" | "pause" | "reset"): Promise<void> {
  await apiFetch(`/api/simulation/${action}`, { method: "POST" });
}

async function fetchEvents(): Promise<SimulationEventsResponse> {
  return apiFetch("/api/simulation/events", undefined, "Failed to load simulation events");
}

// FEAT-03 §Simulation panel, architecture/api-design.md API-023.
export function SimulationPanel() {
  const queryClient = useQueryClient();
  const eventsQuery = useQuery({ queryKey: EVENTS_QUERY_KEY, queryFn: fetchEvents, refetchInterval: POLL_INTERVAL_MS });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: EVENTS_QUERY_KEY });
  const startMutation = useMutation({ mutationFn: () => postAction("start"), onSuccess: invalidate });
  const pauseMutation = useMutation({ mutationFn: () => postAction("pause"), onSuccess: invalidate });
  const resetMutation = useMutation({ mutationFn: () => postAction("reset"), onSuccess: invalidate });

  const isRunning = eventsQuery.data?.status === "RUNNING";
  // Newest first, capped — "appends rows... capped at 50 visible rows" (FEAT-03).
  const events = (eventsQuery.data?.events ?? []).slice(-VISIBLE_ROW_CAP).reverse();

  return (
    <section aria-labelledby="simulation-heading" className="rounded-sm border border-slate-200 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="simulation-heading" className="text-base font-semibold text-slate-800">
          Simulated event stream
        </h2>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => startMutation.mutate()}
            disabled={isRunning || startMutation.isPending}
            className="rounded-sm bg-sih-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-sih-blue-700 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sih-blue-600"
          >
            Start
          </button>
          <button
            type="button"
            onClick={() => pauseMutation.mutate()}
            disabled={!isRunning || pauseMutation.isPending}
            className="rounded-sm border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sih-blue-600"
          >
            Pause
          </button>
          <button
            type="button"
            onClick={() => resetMutation.mutate()}
            disabled={resetMutation.isPending}
            className="rounded-sm border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sih-blue-600"
          >
            Reset
          </button>
        </div>
      </div>

      <p className="mt-2 text-xs text-slate-500">
        {isRunning ? "Running" : "Paused"} — synthetic events for demonstration only; nothing here is written to the transaction ledger.
      </p>

      <div aria-live="polite" className="mt-3 max-h-64 space-y-1 overflow-y-auto">
        {eventsQuery.isLoading ? (
          <StatePanel state="loading" title="Loading stream" message="Fetching simulated events." />
        ) : eventsQuery.isError ? (
          <StatePanel state="error" onRetry={() => eventsQuery.refetch()} />
        ) : events.length === 0 ? (
          <StatePanel state="empty" message="No simulated events yet. Click Start." />
        ) : (
          <ul className="space-y-1">
            {events.map((e) => (
              <li
                key={e.eventRef}
                className="flex justify-between gap-2 rounded-sm bg-slate-50 px-2 py-1 text-xs text-slate-700"
                style={{ animation: "fadeIn 200ms ease-out" }}
              >
                <span>{formatTimestampIst(e.emittedAt)}</span>
                <span>{e.channel}</span>
                <span>{formatPaise(e.amountPaise)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
