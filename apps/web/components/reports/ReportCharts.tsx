"use client";

import { useId } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { StatePanel } from "@/components/common/StatePanel";

export type ReportSeries = { label: string; value: number }[];

export interface ReportSummary {
  complaintsOverTime: ReportSeries;
  suspiciousTransactions: ReportSeries;
  alertSeverity: ReportSeries;
  predictedHotspots: ReportSeries;
  topDistricts: ReportSeries;
  fraudTypes: ReportSeries;
}

const COLORS = ["#075985", "#0f766e", "#b45309", "#be123c", "#6d28d9", "#4d7c0f"];

function AccessibleTable({ title, data }: { title: string; data: ReportSeries }) {
  return (
    <div className="max-h-0 overflow-hidden">
      <table className="sr-only" aria-label={`${title} data table`}>
        <thead><tr><th>Category</th><th>Value</th></tr></thead>
        <tbody>{data.map((row) => <tr key={row.label}><td>{row.label}</td><td>{row.value}</td></tr>)}</tbody>
      </table>
    </div>
  );
}

function ChartCard({ title, data, children }: { title: string; data: ReportSeries; children: React.ReactNode }) {
  const headingId = useId();
  return (
    <section className="rounded-sm border border-slate-200 bg-white p-4" aria-labelledby={headingId}>
      <h2 id={headingId} className="text-sm font-semibold text-slate-800">{title}</h2>
      {data.length === 0 ? <div className="mt-3"><StatePanel state="empty" message="No data for the selected filters." /></div> : <div className="mt-3 h-64">{children}</div>}
      <AccessibleTable title={title} data={data} />
    </section>
  );
}

const Axis = () => <><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="label" tick={{ fontSize: 11 }} interval="preserveStartEnd" /><YAxis allowDecimals={false} tick={{ fontSize: 11 }} /><Tooltip /><Legend /></>;

export function ReportCharts({ summary }: { summary: ReportSummary }) {
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <ChartCard title="Complaints over time" data={summary.complaintsOverTime}>
        <ResponsiveContainer><LineChart data={summary.complaintsOverTime}><Axis /><Line type="monotone" dataKey="value" name="Complaints" stroke="#075985" strokeWidth={2} /></LineChart></ResponsiveContainer>
      </ChartCard>
      <ChartCard title="Suspicious transactions" data={summary.suspiciousTransactions}>
        <ResponsiveContainer><BarChart data={summary.suspiciousTransactions}><Axis /><Bar dataKey="value" name="Transactions" fill="#be123c" /></BarChart></ResponsiveContainer>
      </ChartCard>
      <ChartCard title="Alert severity distribution" data={summary.alertSeverity}>
        <ResponsiveContainer><BarChart data={summary.alertSeverity}><Axis /><Bar dataKey="value" name="Alerts" fill="#b45309" /></BarChart></ResponsiveContainer>
      </ChartCard>
      <ChartCard title="Predicted hotspots by score" data={summary.predictedHotspots}>
        <ResponsiveContainer><BarChart data={summary.predictedHotspots} layout="vertical"><CartesianGrid strokeDasharray="3 3" /><XAxis type="number" domain={[0, 1]} /><YAxis dataKey="label" type="category" width={100} tick={{ fontSize: 11 }} /><Tooltip /><Bar dataKey="value" name="Risk score" fill="#6d28d9" /></BarChart></ResponsiveContainer>
      </ChartCard>
      <ChartCard title="Top districts" data={summary.topDistricts}>
        <ResponsiveContainer><BarChart data={summary.topDistricts}><Axis /><Bar dataKey="value" name="Complaints" fill="#0f766e" /></BarChart></ResponsiveContainer>
      </ChartCard>
      <ChartCard title="Fraud type mix" data={summary.fraudTypes}>
        <ResponsiveContainer><PieChart><Pie data={summary.fraudTypes} dataKey="value" nameKey="label" name="Complaints" innerRadius="45%" label>{summary.fraudTypes.map((row, index) => <Cell key={row.label} fill={COLORS[index % COLORS.length] ?? "#64748b"} />)}</Pie><Tooltip /><Legend /></PieChart></ResponsiveContainer>
      </ChartCard>
    </div>
  );
}
