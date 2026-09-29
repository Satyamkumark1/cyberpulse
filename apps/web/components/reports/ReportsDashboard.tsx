"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FRAUD_TYPES } from "@cyberpulse/shared/enums";
import { StatePanel } from "@/components/common/StatePanel";
import { ReportChartsLazy } from "./ReportChartsLoader";
import type { ReportSummary } from "./ReportCharts";

type Filters = { from: string; to: string; city: string; state: string; fraudType: string };
interface Metrics { precision: number; recall: number; f1: number; rocAuc: number; top1HitRate: number; top3HitRate: number; top5HitRate: number; modelVersion: string; trainedAt: string; datasetSeed: number; nTrain: number; nTest: number; }

function queryString(filters: Filters) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) if (value) params.set(key, value);
  return params.toString();
}
async function fetchSummary(filters: Filters): Promise<ReportSummary> {
  const res = await fetch(`/api/reports/summary?${queryString(filters)}`);
  if (!res.ok) throw new Error("Unable to load report data.");
  return res.json();
}
async function fetchMetrics(): Promise<Metrics | null> {
  const res = await fetch("/api/reports/metrics");
  if (!res.ok) throw new Error("Unable to load model metrics.");
  return (await res.json()).data;
}

export function ReportsDashboard() {
  const [filters, setFilters] = useState<Filters>({ from: "", to: "", city: "", state: "", fraudType: "" });
  const [activeFilters, setActiveFilters] = useState(filters);
  const reports = useQuery({ queryKey: ["reports", activeFilters], queryFn: () => fetchSummary(activeFilters) });
  const modelMetrics = useQuery({ queryKey: ["model-metrics"], queryFn: fetchMetrics });
  const update = (key: keyof Filters, value: string) => setFilters((current) => ({ ...current, [key]: value }));

  return (
    <div className="space-y-6">
      <form onSubmit={(event) => { event.preventDefault(); setActiveFilters(filters); }} className="flex flex-wrap items-end gap-3 rounded-sm border border-slate-200 bg-white p-4">
        <label className="text-sm text-slate-700">From<input type="date" value={filters.from} onChange={(e) => update("from", e.target.value)} className="mt-1 block rounded border border-slate-300 px-2 py-1.5" /></label>
        <label className="text-sm text-slate-700">To<input type="date" value={filters.to} onChange={(e) => update("to", e.target.value)} className="mt-1 block rounded border border-slate-300 px-2 py-1.5" /></label>
        <label className="text-sm text-slate-700">City<input value={filters.city} onChange={(e) => update("city", e.target.value)} className="mt-1 block rounded border border-slate-300 px-2 py-1.5" /></label>
        <label className="text-sm text-slate-700">State<input value={filters.state} onChange={(e) => update("state", e.target.value)} className="mt-1 block rounded border border-slate-300 px-2 py-1.5" /></label>
        <label className="text-sm text-slate-700">Fraud type<select value={filters.fraudType} onChange={(e) => update("fraudType", e.target.value)} className="mt-1 block rounded border border-slate-300 px-2 py-1.5"><option value="">All types</option>{FRAUD_TYPES.map((type) => <option key={type} value={type}>{type.replaceAll("_", " ")}</option>)}</select></label>
        <button type="submit" className="rounded bg-sih-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-sih-blue-700">Apply filters</button>
        <button type="button" onClick={() => { const empty = { from: "", to: "", city: "", state: "", fraudType: "" }; setFilters(empty); setActiveFilters(empty); }} className="text-sm text-sih-blue-600 hover:underline">Clear</button>
      </form>

      {reports.isLoading ? <StatePanel state="loading" title="Loading reports" message="Querying aggregate report data." /> : reports.isError ? <StatePanel state="error" message="Unable to load reports." onRetry={() => reports.refetch()} /> : reports.data ? <ReportChartsLazy summary={reports.data} /> : null}

      <section className="rounded-sm border border-slate-200 bg-white p-5" aria-labelledby="model-evaluation-heading">
        <h2 id="model-evaluation-heading" className="text-base font-semibold text-slate-800">PROTOTYPE MODEL EVALUATION</h2>
        <p className="mt-1 text-sm text-slate-600">Metrics were measured on a held-out split of synthetic data and do not represent operational performance.</p>
        {modelMetrics.isLoading ? <p className="mt-3 text-sm text-slate-500">Loading model evaluation…</p> : modelMetrics.isError ? <p className="mt-3 text-sm text-red-700">Unable to load model evaluation.</p> : !modelMetrics.data ? <p className="mt-3 text-sm text-slate-600">Model evaluation not yet run</p> : <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">{[["Precision", modelMetrics.data.precision], ["Recall", modelMetrics.data.recall], ["F1", modelMetrics.data.f1], ["ROC-AUC", modelMetrics.data.rocAuc], ["Top-1 hit rate", modelMetrics.data.top1HitRate], ["Top-3 hit rate", modelMetrics.data.top3HitRate], ["Top-5 hit rate", modelMetrics.data.top5HitRate]].map(([label, value]) => <div key={String(label)}><dt className="text-slate-500">{label}</dt><dd className="font-mono font-medium text-slate-800">{Number(value).toFixed(3)}</dd></div>)}</dl>}
      </section>
    </div>
  );
}
