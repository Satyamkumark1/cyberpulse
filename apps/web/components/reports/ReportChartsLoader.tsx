"use client";

import dynamic from "next/dynamic";
import { StatePanel } from "@/components/common/StatePanel";
import type { ReportSummary } from "./ReportCharts";

const ReportCharts = dynamic(() => import("./ReportCharts").then((module) => module.ReportCharts), {
  ssr: false,
  loading: () => <StatePanel state="loading" title="Loading reports" message="Preparing report visualisations." />,
});

export function ReportChartsLazy({ summary }: { summary: ReportSummary }) {
  return <ReportCharts summary={summary} />;
}
