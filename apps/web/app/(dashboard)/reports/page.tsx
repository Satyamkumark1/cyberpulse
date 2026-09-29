import { ReportsDashboard } from "@/components/reports/ReportsDashboard";

export const metadata = { title: "Reports — CyberPulse AI" };

export default function ReportsPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-slate-800">Reports</h1>
      <p className="text-sm text-slate-600">Aggregate intelligence across the synthetic corpus.</p>
      <ReportsDashboard />
    </div>
  );
}
