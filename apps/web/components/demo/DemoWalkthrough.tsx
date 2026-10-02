"use client"; // step navigation, live prediction/alert calls with in-flight state

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { DEMO_COMPLAINT_IDS } from "@cyberpulse/shared/constants";
import type { PredictionResponse } from "@cyberpulse/shared/zod/prediction";
import { StatePanel } from "@/components/common/StatePanel";
import { RiskBadge } from "@/components/common/RiskBadge";
import { AlertModal } from "@/components/alerts/AlertModal";
import { PredictionFactors, PredictionSummary } from "@/components/prediction/PredictionPanel";
import { HotspotMapLazy } from "@/components/prediction/HotspotMapLoader";
import { usePrediction } from "@/components/prediction/usePrediction";
import { ANALYSIS_STEP, nextAutoStep } from "@/components/demo/autoAdvance";
import { formatPaise, formatScorePercent, formatTimestampIst, formatWindowIst } from "@/lib/formatters";
import { apiFetch } from "@/lib/apiFetch";

const DEMO_HEADERS = { "x-cyberpulse-origin": "DEMO" } as const;

const STEPS = ["Complaint", "Money trail", "AI analysis", "Hotspot prediction", "Explanation", "Alert"] as const;
const STEP_DESCRIPTIONS = [
  "Review the complaint context",
  "Trace how the funds moved",
  "Run the predictive model",
  "Inspect the forecast area",
  "Understand the risk factors",
  "Prepare the response alert",
] as const;
const STEP_COUNT = STEPS.length;

// Maps the ML service's internal stage keys (apps/ml-service/app/routers/predict.py)
// to judge-facing copy. An unmapped key still renders — see the `??` fallback below.
const PIPELINE_STAGE_INFO: Record<string, { label: string; description: string }> = {
  features: { label: "Feature extraction", description: "Builds the 13 numeric signals from the complaint and its linked transactions." },
  risk_model: { label: "Risk scoring", description: "XGBoost risk classifier scores every candidate withdrawal cell." },
  hotspot: { label: "Hotspot ranking", description: "Unsupervised hotspot engine ranks candidate cash-out locations." },
  temporal: { label: "Temporal window", description: "XGBoost temporal classifier predicts the likely withdrawal window." },
  explain: { label: "Explanation (SHAP)", description: "Exact SHAP attribution computed for the top-ranked cell." },
};

interface DemoComplaint {
  complaint: {
    complaintId: string;
    fraudType: string;
    amountPaise: number;
    complaintTimestamp: string;
    city: string;
    district: string;
    state: string;
    status: string;
  };
  transactions: unknown[];
  linkedAccounts: unknown[];
}

async function fetchDemoComplaint(complaintId: string): Promise<DemoComplaint> {
  return apiFetch(`/api/complaints/${complaintId}`);
}

function useDemoNav() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const raw = Number(searchParams.get("step"));
  const step = Number.isInteger(raw) && raw >= 1 && raw <= STEP_COUNT ? raw : 1;
  const auto = searchParams.get("auto") === "1";
  const runId = searchParams.get("run") ?? "manual";

  const go = (next: number, keepAuto: boolean) => {
    const clamped = Math.min(STEP_COUNT, Math.max(1, next));
    const params = new URLSearchParams(searchParams);
    params.set("step", String(clamped));
    if (keepAuto) params.set("auto", "1");
    else params.delete("auto");
    const href = `${pathname}?${params.toString()}`;
    // A run drives itself through four steps; pushing each one would make the
    // browser Back button walk backwards through the run instead of leaving it.
    if (auto) router.replace(href, { scroll: false });
    else router.push(href, { scroll: false });
  };

  const start = () => {
    const params = new URLSearchParams(searchParams);
    params.set("step", "1");
    params.set("auto", "1");
    params.set("run", globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  return { step, auto, runId, go, start };
}

/**
 * One complaint's slice of the run: its own detail fetch and its own
 * prediction mutation, fired independently of the other nine rows so a fast
 * complaint never waits on a slow one (FR-19.1 — ten complaints "at the same
 * time", not staggered).
 */
function useDemoRow(complaintId: string, shouldAnalyze: boolean, runId: string) {
  const complaintQuery = useQuery({
    queryKey: ["demo-complaint", complaintId],
    queryFn: () => fetchDemoComplaint(complaintId),
  });
  const prediction = usePrediction(complaintId, DEMO_HEADERS);
  const resetPrediction = prediction.reset;
  const fired = useRef(false);
  useEffect(() => {
    fired.current = false;
    resetPrediction();
  }, [runId, resetPrediction]);
  useEffect(() => {
    // Fires exactly once per row per demo run (AC-P7-03, generalised to ten
    // rows). Two guards, because they stop different things: `isIdle` is
    // captured at render, so StrictMode's second invocation against this same
    // instance still reads it as idle — the ref is what makes the call once
    // per mount. `isIdle` is what makes it once per run, so returning to this
    // step issues no second POST for this row.
    if (!shouldAnalyze || fired.current || !prediction.isIdle) return;
    fired.current = true;
    prediction.mutate(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldAnalyze, runId, prediction.isIdle]);
  return { complaintId, complaintQuery, prediction };
}

type DemoRow = ReturnType<typeof useDemoRow>;

const [C0, C1, C2, C3, C4, C5, C6, C7, C8, C9] = DEMO_COMPLAINT_IDS;

export function DemoWalkthrough() {
  const { step, auto, runId, go, start } = useDemoNav();
  const [dispatchedAlertIds, setDispatchedAlertIds] = useState<Record<string, string>>({});
  const [openAlertFor, setOpenAlertFor] = useState<string | null>(null);

  // Dashboard navigation predates run IDs; assign one to that first run so
  // its mutation and alert state are isolated exactly like later reruns.
  useEffect(() => {
    if (auto && !new URLSearchParams(window.location.search).has("run")) start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auto]);

  useEffect(() => {
    setDispatchedAlertIds({});
    setOpenAlertFor(null);
  }, [runId]);

  // FR-18.3 / AC-P7-02: fires once, before step 1 is interactive, and reads
  // nothing back into render — a mount-time side effect, not a data fetch.
  useEffect(() => {
    void fetch("/api/health");
  }, []);

  const shouldAnalyze = step >= ANALYSIS_STEP;
  // Ten explicit, unconditional call sites — `DEMO_COMPLAINT_IDS.map(id =>
  // useDemoRow(...))` trips `react-hooks/rules-of-hooks` regardless of the
  // array's fixed length: the rule is syntactic (no hook inside a loop or
  // callback), not value-aware. This is the lint-clean way to call a hook a
  // fixed N times.
  const rows: DemoRow[] = [
    useDemoRow(C0, shouldAnalyze, runId),
    useDemoRow(C1, shouldAnalyze, runId),
    useDemoRow(C2, shouldAnalyze, runId),
    useDemoRow(C3, shouldAnalyze, runId),
    useDemoRow(C4, shouldAnalyze, runId),
    useDemoRow(C5, shouldAnalyze, runId),
    useDemoRow(C6, shouldAnalyze, runId),
    useDemoRow(C7, shouldAnalyze, runId),
    useDemoRow(C8, shouldAnalyze, runId),
    useDemoRow(C9, shouldAnalyze, runId),
  ];

  const complaintReady = rows.every((r) => r.complaintQuery.isSuccess);
  // "Settled" means every row has an answer, success or failure — a run
  // advances once all ten have one, not once all ten have succeeded.
  const predictionSettled = rows.every((r) => r.prediction.isSuccess || r.prediction.isError);
  // The run only freezes (autoAdvance's "stop") on a total outage. One of ten
  // complaints failing degrades that one row; it does not block the guided
  // narrative for the other nine.
  const predictionFailed = rows.every((r) => r.prediction.isError);

  // FR-19.1 / AC-014-01: the scenario plays itself through. `nextAutoStep`
  // owns the decision; this only runs the timer and moves the URL.
  useEffect(() => {
    if (!auto) return;
    const action = nextAutoStep({ step, complaintReady, predictionSettled, predictionFailed });
    if (action.kind === "wait") return;
    if (action.kind === "stop") {
      go(step, false);
      return;
    }
    if (action.dwellMs === 0) {
      go(action.step, true);
      return;
    }
    const timer = setTimeout(() => go(action.step, true), action.dwellMs);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auto, step, complaintReady, predictionSettled, predictionFailed]);

  const anyComplaintLoading = rows.some((r) => r.complaintQuery.isLoading);
  const firstErroredComplaint = rows.find((r) => r.complaintQuery.isError);

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-600">Guided investigation</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-navy-900">Follow the fraud response workflow</h1>
          <p className="mt-2 text-sm text-slate-600">{DEMO_COMPLAINT_IDS.length} complaints · synthetic demonstration scenario</p>
        </div>
        <div className="flex items-center gap-3">
          {/* TC-UI-070. Doubles as the pause control an auto-advancing region
              needs (WCAG 2.2.2) — while a run is in flight there is no Run
              button to press again. */}
          <button
            type="button"
            onClick={() => (auto ? go(step, false) : start())}
            className="inline-flex min-h-11 items-center gap-2 rounded-md border border-sih-blue-600 bg-white px-4 py-2 text-sm font-semibold text-sih-blue-600 shadow-sm transition-colors hover:bg-sih-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sih-blue-600"
          >
            {auto ? "Pause" : "Run scenario"}
          </button>
          <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600">Step {step} of {STEP_COUNT}</span>
        </div>
      </div>

      <nav className="overflow-x-auto rounded-lg border border-slate-200 bg-white p-2 shadow-sm" aria-label="Demonstration progress">
      <ol className="flex min-w-max items-center" aria-label="Demonstration steps">
        {STEPS.map((label, index) => {
          const n = index + 1;
          const state = n === step ? "current" : n < step ? "done" : "upcoming";
          return (
            <li key={label} className="flex items-center">
              <button
                type="button"
                onClick={() => go(n, false)}
                aria-current={state === "current" ? "step" : undefined}
                className={`group flex items-center gap-2 rounded-md px-3 py-2 text-left text-xs font-medium transition-colors ${
                  state === "current"
                    ? "bg-navy-900 text-white shadow-sm"
                    : state === "done"
                      ? "text-emerald-700 hover:bg-emerald-50"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-800"
                }`}
              >
                <span className={`flex h-6 w-6 items-center justify-center rounded-full border text-[11px] font-semibold ${state === "current" ? "border-white/30 bg-white/10" : state === "done" ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-slate-50"}`}>{state === "done" ? "✓" : n}</span>
                <span className="whitespace-nowrap">{label}</span>
              </button>
              {n < STEP_COUNT ? <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-1 h-4 w-4 text-slate-300"><path d="m9 18 6-6-6-6"/></svg> : null}
            </li>
          );
        })}
      </ol>
      </nav>

      <div aria-live="polite">
        {anyComplaintLoading ? (
          <StatePanel state="loading" title="Loading demonstration" message={`Fetching ${DEMO_COMPLAINT_IDS.length} complaints.`} />
        ) : firstErroredComplaint ? (
          <StatePanel
            state="error"
            message={(firstErroredComplaint.complaintQuery.error as Error).message}
            onRetry={() => firstErroredComplaint.complaintQuery.refetch()}
          />
        ) : (
          <DemoStep
            step={step}
            rows={rows}
            runId={runId}
            dispatchedAlertIds={dispatchedAlertIds}
            openAlertFor={openAlertFor}
            onOpenAlert={setOpenAlertFor}
            onAlertDispatched={(complaintId, alertId) =>
              setDispatchedAlertIds((prev) => ({ ...prev, [complaintId]: alertId }))
            }
          />
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 pt-5">
        <button type="button" onClick={() => go(step - 1, false)} disabled={step === 1} className="inline-flex min-h-11 items-center gap-2 rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">
          <span aria-hidden="true">←</span> Back
        </button>
        <p className="hidden text-xs text-slate-600 sm:block">{STEP_DESCRIPTIONS[step - 1]}</p>
        <button
          type="button"
          onClick={() => go(step + 1, false)}
          disabled={step === STEP_COUNT}
          className="inline-flex min-h-11 items-center gap-2 rounded-md bg-sih-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-navy-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next: {STEPS[step] ?? "Done"} <span aria-hidden="true">→</span>
        </button>
      </div>
    </div>
  );
}

function DemoStep({
  step,
  rows,
  runId,
  dispatchedAlertIds,
  openAlertFor,
  onOpenAlert,
  onAlertDispatched,
}: {
  step: number;
  rows: DemoRow[];
  runId: string;
  dispatchedAlertIds: Record<string, string>;
  openAlertFor: string | null;
  onOpenAlert: (complaintId: string | null) => void;
  onAlertDispatched: (complaintId: string, alertId: string) => void;
}) {
  switch (step) {
    case 1:
      return <ComplaintListStep rows={rows} />;
    case 2:
      return <MoneyTrailListStep rows={rows} />;
    case 3:
      return <AnalysisListStep rows={rows} runId={runId} />;
    case 4:
      return <HotspotListStep rows={rows} />;
    case 5:
      return <ExplanationListStep rows={rows} />;
    case 6:
      return (
        <div className="space-y-4">
          <AlertListStep
            rows={rows}
            dispatchedAlertIds={dispatchedAlertIds}
            openAlertFor={openAlertFor}
            onOpenAlert={onOpenAlert}
            onAlertDispatched={onAlertDispatched}
          />
          <RunSummary rows={rows} dispatchedAlertIds={dispatchedAlertIds} />
        </div>
      );
    default:
      return null;
  }
}

function ComplaintListStep({ rows }: { rows: DemoRow[] }) {
  return (
    <section className="overflow-hidden rounded-md border border-slate-200 bg-white" aria-labelledby="complaint-step-heading">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-5">
        <h2 id="complaint-step-heading" className="text-lg font-semibold tracking-tight text-navy-900">Complaint</h2>
        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600">{rows.length} complaints loaded</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
            <tr>
              <th scope="col" className="px-4 py-2">Complaint</th>
              <th scope="col" className="px-4 py-2">Fraud type</th>
              <th scope="col" className="px-4 py-2">Amount reported</th>
              <th scope="col" className="px-4 py-2">Filed</th>
              <th scope="col" className="px-4 py-2">Reported location</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row) => {
              const c = row.complaintQuery.data!.complaint;
              return (
                <tr key={row.complaintId}>
                  <td className="px-4 py-2 font-mono text-slate-800">{c.complaintId}</td>
                  <td className="px-4 py-2 text-slate-700">{c.fraudType.replaceAll("_", " ")}</td>
                  <td className="px-4 py-2 font-mono text-slate-800">{formatPaise(c.amountPaise)}</td>
                  <td className="px-4 py-2 font-mono text-slate-700">{formatTimestampIst(c.complaintTimestamp)}</td>
                  <td className="px-4 py-2 text-slate-700">{c.city}, {c.district}, {c.state}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function MoneyTrailListStep({ rows }: { rows: DemoRow[] }) {
  return (
    <section className="overflow-hidden rounded-md border border-slate-200 bg-white" aria-labelledby="money-trail-demo-heading">
      <div className="border-b border-slate-200 p-5">
        <h2 id="money-trail-demo-heading" className="text-lg font-semibold tracking-tight text-navy-900">Money trail</h2>
        <p className="mt-1 text-sm text-slate-600">
          Transfers from each reported complaint through linked mule accounts. Open a
          complaint&apos;s own page for the full interactive graph.
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
            <tr>
              <th scope="col" className="px-4 py-2">Complaint</th>
              <th scope="col" className="px-4 py-2">Transactions</th>
              <th scope="col" className="px-4 py-2">Linked accounts</th>
              <th scope="col" className="px-4 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row) => {
              const d = row.complaintQuery.data!;
              return (
                <tr key={row.complaintId}>
                  <td className="px-4 py-2 font-mono text-slate-800">{d.complaint.complaintId}</td>
                  <td className="px-4 py-2 text-slate-700">{d.transactions.length}</td>
                  <td className="px-4 py-2 text-slate-700">{d.linkedAccounts.length}</td>
                  <td className="px-4 py-2">
                    <a href={`/complaints/${d.complaint.complaintId}`} className="text-sih-blue-600 hover:underline" target="_blank" rel="noreferrer">
                      View money trail →
                    </a>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function AnalysisListStep({ rows, runId }: { rows: DemoRow[]; runId?: string }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Reset inspection state when runId changes
  useEffect(() => {
    setExpandedId(null);
  }, [runId]);

  // Reset inspection state if the selected row no longer has prediction.data
  useEffect(() => {
    if (!expandedId) return;
    const selected = rows.find((r) => r.complaintId === expandedId);
    if (!selected?.prediction.data) {
      setExpandedId(null);
    }
  }, [expandedId, rows]);

  // Classify each row exclusively: isError -> isPending/isIdle -> data
  const erroredRows: DemoRow[] = [];
  const pendingRows: DemoRow[] = [];
  const completedRows: DemoRow[] = [];

  for (const r of rows) {
    if (r.prediction.isError) {
      erroredRows.push(r);
    } else if (r.prediction.isPending || r.prediction.isIdle) {
      pendingRows.push(r);
    } else if (r.prediction.data != null) {
      completedRows.push(r);
    }
  }

  const completedCount = completedRows.length;
  const totalCount = rows.length;

  const latencies = completedRows
    .map((r) => r.prediction.data?.inferenceMs)
    .filter((ms): ms is number => typeof ms === "number");
  const avgLatency =
    latencies.length > 0
      ? Math.round(latencies.reduce((sum, val) => sum + val, 0) / latencies.length)
      : null;

  const highRiskCount = completedRows.filter((r) => r.prediction.data?.riskLevel === "HIGH").length;
  const mediumRiskCount = completedRows.filter((r) => r.prediction.data?.riskLevel === "MEDIUM").length;
  const lowRiskCount = completedRows.filter((r) => r.prediction.data?.riskLevel === "LOW").length;

  const activeModelVersion = completedRows[0]?.prediction.data?.modelVersion ?? "XGBoost + SHAP";

  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm" aria-labelledby="ai-analysis-heading">
      {/* Header with Title and Model Status */}
      <div className="border-b border-slate-200 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2.5">
              <h2 id="ai-analysis-heading" className="text-lg font-semibold tracking-tight text-navy-900">
                AI analysis
              </h2>
              {pendingRows.length > 0 ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-800">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse" />
                  Live ML Inference Active
                </span>
              ) : null}
            </div>
            <p className="mt-1 text-sm text-slate-600">
              The prototype scores every candidate cash-out location and time window for all{" "}
              {totalCount} complaints at once, with three tabular models, then explains each
              top prediction with exact SHAP attribution.
            </p>
          </div>
          <div className="text-right">
            <span className="inline-block rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 font-mono text-xs text-slate-600">
              Model: {activeModelVersion}
            </span>
          </div>
        </div>

        {/* Executive Batch Inference Summary */}
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-lg border border-slate-200/80 bg-slate-50/70 p-3">
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Evaluated</dt>
            <dd className="mt-1 flex items-baseline gap-1.5">
              <span className="text-xl font-bold tracking-tight text-navy-900">{completedCount}</span>
              <span className="text-xs text-slate-500">/ {totalCount} complaints</span>
            </dd>
          </div>

          <div className="rounded-lg border border-slate-200/80 bg-slate-50/70 p-3">
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Mean Latency</dt>
            <dd className="mt-1 flex items-baseline gap-1">
              <span className="font-mono text-xl font-bold tracking-tight text-navy-900">
                {avgLatency != null ? `${avgLatency}` : "—"}
              </span>
              <span className="text-xs text-slate-500">{avgLatency != null ? "ms / run" : ""}</span>
            </dd>
          </div>

          <div className="rounded-lg border border-slate-200/80 bg-slate-50/70 p-3">
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Risk Distribution</dt>
            <dd className="mt-1.5 flex items-center gap-1.5 text-xs font-medium">
              <span className="rounded bg-red-100 px-1.5 py-0.5 text-red-800">{highRiskCount} High</span>
              <span className="rounded bg-amber-100 px-1.5 py-0.5 text-amber-800">{mediumRiskCount} Med</span>
              <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-emerald-800">{lowRiskCount} Low</span>
            </dd>
          </div>

          <div className="rounded-lg border border-slate-200/80 bg-slate-50/70 p-3">
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Pipeline State</dt>
            <dd className="mt-1 flex items-center gap-1.5 text-xs font-medium text-slate-700">
              {erroredRows.length > 0 ? (
                <span className="text-red-700 font-semibold">⚠ {erroredRows.length} Degraded</span>
              ) : pendingRows.length > 0 ? (
                <span className="text-sih-blue-600 font-semibold animate-pulse">Running {pendingRows.length}…</span>
              ) : (
                <span className="text-emerald-700 font-semibold">✓ 100% Settled</span>
              )}
            </dd>
          </div>
        </div>

        {/* 5-Stage Pipeline Visualizer */}
        <div className="mt-4 rounded-lg border border-slate-200 bg-white p-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Ensemble Architecture</p>
          <div className="mt-2 grid grid-cols-2 gap-2 text-xs sm:grid-cols-5">
            <div className="flex items-center gap-2 rounded bg-slate-50 p-2 border border-slate-100">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-200 text-[10px] font-bold text-slate-700">1</span>
              <div>
                <p className="font-medium text-slate-800">Features</p>
                <p className="text-[10px] text-slate-500">13 Numeric Signals</p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded bg-slate-50 p-2 border border-slate-100">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-200 text-[10px] font-bold text-slate-700">2</span>
              <div>
                <p className="font-medium text-slate-800">XGBoost Risk</p>
                <p className="text-[10px] text-slate-500">Cash-out Scorer</p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded bg-slate-50 p-2 border border-slate-100">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-200 text-[10px] font-bold text-slate-700">3</span>
              <div>
                <p className="font-medium text-slate-800">Hotspot Engine</p>
                <p className="text-[10px] text-slate-500">Spatial H3 Clusters</p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded bg-slate-50 p-2 border border-slate-100">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-200 text-[10px] font-bold text-slate-700">4</span>
              <div>
                <p className="font-medium text-slate-800">Temporal Window</p>
                <p className="text-[10px] text-slate-500">Withdrawal Time</p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded bg-slate-50 p-2 border border-slate-100">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-200 text-[10px] font-bold text-slate-700">5</span>
              <div>
                <p className="font-medium text-slate-800">SHAP Attrib</p>
                <p className="text-[10px] text-slate-500">Exact Explainability</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Structured Inference Matrix */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
            <tr>
              <th scope="col" className="px-4 py-2.5">Complaint</th>
              <th scope="col" className="px-4 py-2.5">Inference Status &amp; Time</th>
              <th scope="col" className="px-4 py-2.5">Risk Score</th>
              <th scope="col" className="px-4 py-2.5">Predicted Hotspot</th>
              <th scope="col" className="px-4 py-2.5">Temporal Window</th>
              <th scope="col" className="px-4 py-2.5 text-right">Inspection</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row) => {
              const c = row.complaintQuery.data?.complaint;
              const isError = row.prediction.isError;
              const isPending = !isError && (row.prediction.isPending || row.prediction.isIdle);
              const p = !isError && !isPending ? row.prediction.data : null;
              const isExpanded = expandedId === row.complaintId;

              return (
                <tr key={row.complaintId} className={isExpanded ? "bg-slate-50/60" : "hover:bg-slate-50/40 transition-colors"}>
                  <td className="px-4 py-3 align-top">
                    <p className="font-mono text-sm font-semibold text-slate-900">{row.complaintId}</p>
                    {c ? (
                      <p className="mt-0.5 text-xs text-slate-500">
                        {c.fraudType.replaceAll("_", " ")} · {c.city}
                      </p>
                    ) : null}
                  </td>

                  <td className="px-4 py-3 align-top">
                    {isError ? (
                      <div className="max-w-xs">
                        <StatePanel
                          state="degraded"
                          message={row.prediction.error.message}
                          onRetry={() => row.prediction.mutate(true)}
                        />
                      </div>
                    ) : isPending ? (
                      <div className="flex items-center gap-2 text-xs text-sih-blue-600">
                        <span className="h-2 w-2 rounded-full bg-sih-blue-500 animate-ping" />
                        <span>Scoring candidate locations…</span>
                      </div>
                    ) : p ? (
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-emerald-700 font-semibold text-xs">✓</span>
                          <span className="text-xs font-medium text-emerald-800">Analysis complete.</span>
                        </div>
                        {p.inferenceMs != null ? (
                          <p className="mt-0.5 font-mono text-xs text-slate-500">{p.inferenceMs} ms latency</p>
                        ) : null}
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400">Idle</span>
                    )}
                  </td>

                  <td className="px-4 py-3 align-top">
                    {p ? (
                      <div className="flex items-center gap-2">
                        <RiskBadge level={p.riskLevel} />
                        <span className="font-mono text-xs font-semibold text-slate-700">
                          {formatScorePercent(p.riskScore)}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </td>

                  <td className="px-4 py-3 align-top">
                    {p ? (
                      <div>
                        <p className="font-medium text-slate-800 text-xs">{p.predictedLocation.name}</p>
                        <p className="text-[11px] text-slate-500">
                          {p.predictedLocation.district} · {p.likelyAtms} ATMs in radius
                        </p>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </td>

                  <td className="px-4 py-3 align-top">
                    {p ? (
                      <span className="font-mono text-xs text-slate-700">
                        {formatWindowIst(p.expectedWindow.start, p.expectedWindow.end)}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </td>

                  <td className="px-4 py-3 text-right align-top">
                    {p ? (
                      <button
                        type="button"
                        onClick={() => setExpandedId(isExpanded ? null : row.complaintId)}
                        aria-expanded={isExpanded}
                        aria-controls={`inspection-drawer-${row.complaintId}`}
                        className="inline-flex items-center gap-1 rounded border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50"
                      >
                        {isExpanded ? "Collapse" : "Inspect"}
                        <span aria-hidden="true">{isExpanded ? "▲" : "▼"}</span>
                      </button>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Expanded Quick Inspection Drawer */}
      {expandedId && (() => {
        const selected = rows.find((r) => r.complaintId === expandedId && r.prediction.data);
        if (!selected?.prediction.data) return null;
        const p = selected.prediction.data;

        return (
          <div
            id={`inspection-drawer-${selected.complaintId}`}
            className="border-t border-slate-200 bg-slate-50/70 p-5"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-navy-900">
                  Detailed Inference Breakdown: {selected.complaintId}
                </h3>
                <p className="text-xs text-slate-500">
                  Pipeline stage latencies &amp; exact SHAP attribution factors.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setExpandedId(null)}
                className="text-xs text-slate-500 hover:text-slate-800"
              >
                Close ✕
              </button>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-600 mb-2">
                  Pipeline Stage Timings
                </h4>
                <PipelineStages prediction={p} />
              </div>

              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-600 mb-2">
                  Top SHAP Signal Contributions
                </h4>
                <PredictionFactors prediction={p} />
              </div>
            </div>
          </div>
        );
      })()}
    </section>
  );
}

function HotspotListStep({ rows }: { rows: DemoRow[] }) {
  const [selectedId, setSelectedId] = useState<string>(() => {
    return rows.find((r) => r.prediction.data)?.complaintId ?? rows[0]?.complaintId ?? "";
  });

  const activeRow =
    rows.find((r) => r.complaintId === selectedId && r.prediction.data) ??
    rows.find((r) => r.prediction.data);

  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm" aria-labelledby="hotspot-demo-heading">
      <div className="border-b border-slate-200 p-5">
        <h2 id="hotspot-demo-heading" className="text-lg font-semibold tracking-tight text-navy-900">Hotspot prediction</h2>
        <p className="mt-1 text-sm text-slate-600">
          Each row is this run&apos;s own predicted cash-out location, risk and window. Select any complaint row to inspect its geographic hotspot map.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
        {/* Table of complaints */}
        <div className="lg:col-span-7 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
              <tr>
                <th scope="col" className="px-4 py-2.5">Complaint</th>
                <th scope="col" className="px-4 py-2.5">Risk</th>
                <th scope="col" className="px-4 py-2.5">Predicted hotspot</th>
                <th scope="col" className="px-4 py-2.5">Expected window</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row) => {
                const isSelected = row.complaintId === (activeRow?.complaintId ?? selectedId);
                return (
                  <tr
                    key={row.complaintId}
                    onClick={() => {
                      if (row.prediction.data) setSelectedId(row.complaintId);
                    }}
                    className={`cursor-pointer transition-colors ${
                      isSelected
                        ? "bg-blue-50/80 font-medium"
                        : "hover:bg-slate-50"
                    }`}
                  >
                    <td className="px-4 py-2.5 font-mono text-slate-800">
                      <div className="flex items-center gap-2">
                        {isSelected && <span className="h-1.5 w-1.5 rounded-full bg-blue-600 shrink-0" />}
                        {row.complaintId}
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      {row.prediction.data ? (
                        <div className="flex items-center gap-2">
                          <RiskBadge level={row.prediction.data.riskLevel} />
                          <span className="font-mono text-xs text-slate-700">{formatScorePercent(row.prediction.data.riskScore)}</span>
                        </div>
                      ) : row.prediction.isError ? (
                        <span className="text-xs text-red-700">Unavailable</span>
                      ) : (
                        <span className="text-xs text-slate-500">Pending</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-slate-700">
                      {row.prediction.data ? `${row.prediction.data.predictedLocation.name}, ${row.prediction.data.predictedLocation.district}` : "—"}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs text-slate-700">
                      {row.prediction.data ? formatWindowIst(row.prediction.data.expectedWindow.start, row.prediction.data.expectedWindow.end) : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Hotspot Map preview */}
        <div className="lg:col-span-5 p-4 bg-slate-50/50 flex flex-col justify-start">
          {activeRow?.prediction.data ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Hotspot Map: {activeRow.complaintId}
                  </span>
                  <p className="text-sm font-semibold text-slate-800">
                    {activeRow.prediction.data.predictedLocation.name}
                  </p>
                </div>
                <RiskBadge level={activeRow.prediction.data.riskLevel} />
              </div>
              <HotspotMapLazy prediction={activeRow.prediction.data} heightPx={360} />
            </div>
          ) : (
            <div className="flex h-64 items-center justify-center text-xs text-slate-500">
              Select a complaint row to view its cash-out hotspot map.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function ExplanationListStep({ rows }: { rows: DemoRow[] }) {
  return (
    <section className="space-y-3 rounded-md border border-slate-200 bg-white p-5">
      <h2 className="text-lg font-semibold tracking-tight text-navy-900">Explanation</h2>
      <p className="text-sm leading-6 text-slate-600">
        Exact SHAP attribution, computed for each complaint&apos;s top-ranked cell only. Expand a
        row to see which signals pushed its score up or down.
      </p>
      <div className="divide-y divide-slate-100">
        {rows.map((row) => (
          <details key={row.complaintId} className="py-3">
            <summary className="flex cursor-pointer items-center justify-between gap-2 text-sm">
              <span className="font-mono text-slate-800">{row.complaintId}</span>
              {row.prediction.data ? (
                <span className="flex items-center gap-2">
                  <RiskBadge level={row.prediction.data.riskLevel} />
                  <span className="font-mono text-xs text-slate-700">{formatScorePercent(row.prediction.data.riskScore)}</span>
                </span>
              ) : (
                <span className="text-xs text-slate-500">Not analysed</span>
              )}
            </summary>
            <div className="mt-3 pl-2">
              {row.prediction.data ? (
                <PredictionFactors prediction={row.prediction.data} />
              ) : (
                <p className="text-sm text-slate-600">Prediction unavailable for this complaint.</p>
              )}
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}

function AlertListStep({
  rows,
  dispatchedAlertIds,
  openAlertFor,
  onOpenAlert,
  onAlertDispatched,
}: {
  rows: DemoRow[];
  dispatchedAlertIds: Record<string, string>;
  openAlertFor: string | null;
  onOpenAlert: (complaintId: string | null) => void;
  onAlertDispatched: (complaintId: string, alertId: string) => void;
}) {
  const openRow = rows.find((r) => r.complaintId === openAlertFor);

  return (
    <section className="space-y-3 rounded-sm border border-slate-200 p-4">
      <h2 className="text-base font-semibold text-slate-800">Alert</h2>
      <p className="text-sm text-slate-600">
        Generate an alert from any complaint&apos;s prediction to notify LEA and BANK. Sending is a
        human decision, per complaint.
      </p>
      <ul className="divide-y divide-slate-100">
        {rows.map((row) => {
          const dispatchedId = dispatchedAlertIds[row.complaintId];
          return (
            <li key={row.complaintId} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <span className="font-mono text-sm text-slate-800">{row.complaintId}</span>
              {dispatchedId ? (
                <span role="status" className="text-sm text-emerald-700">Alert {dispatchedId} dispatched.</span>
              ) : row.prediction.data ? (
                <button
                  type="button"
                  onClick={() => onOpenAlert(row.complaintId)}
                  className="rounded-sm bg-red-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-800"
                >
                  Generate Alert
                </button>
              ) : (
                <span className="text-sm text-slate-500">Not yet analysed</span>
              )}
            </li>
          );
        })}
      </ul>
      {openRow?.prediction.data ? (
        <AlertModal
          headers={DEMO_HEADERS}
          prediction={{
            predictionRef: openRow.prediction.data.predictionRef,
            location: openRow.prediction.data.predictedLocation,
            window: openRow.prediction.data.expectedWindow,
            riskScore: openRow.prediction.data.riskScore,
            riskLevel: openRow.prediction.data.riskLevel,
            estimatedExposurePaise: openRow.prediction.data.estimatedExposurePaise,
            factors: openRow.prediction.data.factors,
          }}
          onClose={() => onOpenAlert(null)}
          onSuccess={(alertId) => {
            onAlertDispatched(openRow.complaintId, alertId);
            onOpenAlert(null);
          }}
        />
      ) : null}
    </section>
  );
}

/**
 * The model's own measured stage timings. Absent entirely when the response
 * carried none — `pipelineStages` is present only on a freshly-computed
 * prediction, and an empty table is the honest rendering of that, never a
 * padded one (AC-P7-04).
 */
function PipelineStages({ prediction }: { prediction: PredictionResponse }) {
  if (!prediction.pipelineStages?.length) return null;
  return (
    <div className="divide-y divide-slate-100 rounded-md border border-slate-200">
      {prediction.pipelineStages.map((stage) => {
        const info = PIPELINE_STAGE_INFO[stage.name];
        return (
          <div key={stage.name} className="flex items-center justify-between gap-4 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-slate-800">{info?.label ?? stage.name}</p>
              {info ? <p className="mt-0.5 text-xs text-slate-500">{info.description}</p> : null}
            </div>
            <span className="font-mono text-xs text-slate-600">{stage.durationMs} ms</span>
          </div>
        );
      })}
      {prediction.inferenceMs != null ? (
        <div className="flex items-center justify-between gap-4 bg-slate-50 px-4 py-3">
          <p className="text-sm font-semibold text-slate-800">Total processing time</p>
          <span className="font-mono text-sm font-semibold text-slate-800">{prediction.inferenceMs} ms</span>
        </div>
      ) : null}
    </div>
  );
}

/** A value the run did not produce renders as an em dash, never as zero. */
function SummaryField({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-0.5 text-sm text-slate-800">{value ? value : "—"}</dd>
    </div>
  );
}

function SummaryStage({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <li className="border-t border-slate-100 pt-4 first:border-t-0 first:pt-0">
      <div className="flex items-center gap-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-600">
          {n}
        </span>
        <h3 className="text-sm font-semibold text-navy-900">{title}</h3>
      </div>
      <div className="mt-2 pl-8">{children}</div>
    </li>
  );
}

/**
 * What the run produced, in one place per complaint, so each chain can be
 * read without stepping back through it.
 *
 * Every value is rendered from the same responses the steps rendered — through
 * the same components, so the summary cannot drift from what it recaps, row by
 * row. When a row's prediction never arrived, its stages 3–6 say so and show
 * no number of any kind: no score, no window, no currency (RULE-frontend §4).
 */
function RunSummary({ rows, dispatchedAlertIds }: { rows: DemoRow[]; dispatchedAlertIds: Record<string, string> }) {
  return (
    <section aria-labelledby="run-summary-heading" className="rounded-md border border-slate-200 bg-white p-5">
      <h2 id="run-summary-heading" className="text-lg font-semibold tracking-tight text-navy-900">
        Run summary
      </h2>
      <p className="mt-1 text-sm text-slate-600">Every value below came from this run&apos;s own responses, one row per complaint.</p>

      <ol className="mt-4 space-y-6">
        {rows.map((row) => (
          <li key={row.complaintId} className="border-t border-slate-200 pt-5 first:border-t-0 first:pt-0">
            <RunSummaryRow row={row} dispatchedAlertId={dispatchedAlertIds[row.complaintId] ?? null} />
          </li>
        ))}
      </ol>
    </section>
  );
}

function RunSummaryRow({ row, dispatchedAlertId }: { row: DemoRow; dispatchedAlertId: string | null }) {
  const data = row.complaintQuery.data!;
  const complaint = data.complaint;
  const transactionsCount = data.transactions.length;
  const accountsCount = data.linkedAccounts.length;
  const prediction = row.prediction.data ?? null;
  const unavailable = (
    <p className="text-sm text-slate-600">
      Prediction service unavailable — this run produced no score, window or explanation.
    </p>
  );

  return (
    <div>
      <p className="font-mono text-sm font-semibold text-navy-900">{complaint.complaintId}</p>
      <ol className="mt-3 space-y-4">
        <SummaryStage n={1} title={STEPS[0]}>
          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <SummaryField label="Amount reported" value={formatPaise(complaint.amountPaise)} />
            <SummaryField label="Filed" value={formatTimestampIst(complaint.complaintTimestamp)} />
            <SummaryField label="Reported location" value={`${complaint.city}, ${complaint.district}, ${complaint.state}`} />
          </dl>
        </SummaryStage>

        <SummaryStage n={2} title={STEPS[1]}>
          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <SummaryField label="Transactions" value={String(transactionsCount)} />
            <SummaryField label="Linked accounts" value={String(accountsCount)} />
          </dl>
        </SummaryStage>

        <SummaryStage n={3} title={STEPS[2]}>
          {prediction ? (
            <div className="space-y-3">
              <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <SummaryField label="Model" value={prediction.modelVersion} />
                <SummaryField label="Feature schema" value={prediction.featureSchemaVersion} />
              </dl>
              <PipelineStages prediction={prediction} />
            </div>
          ) : (
            unavailable
          )}
        </SummaryStage>

        <SummaryStage n={4} title={STEPS[3]}>
          {prediction ? <PredictionSummary prediction={prediction} /> : unavailable}
        </SummaryStage>

        <SummaryStage n={5} title={STEPS[4]}>
          {prediction ? <PredictionFactors prediction={prediction} /> : unavailable}
        </SummaryStage>

        <SummaryStage n={6} title={STEPS[5]}>
          {dispatchedAlertId ? (
            <p className="text-sm text-slate-800">
              Alert <span className="font-mono">{dispatchedAlertId}</span> dispatched.
            </p>
          ) : (
            <p className="text-sm text-slate-600">Not dispatched. Sending an alert is a human decision.</p>
          )}
        </SummaryStage>
      </ol>
    </div>
  );
}
