import Link from "next/link";
import { randomUUID } from "node:crypto";
import { StatePanel } from "@/components/common/StatePanel";
import { formatTimestampIst } from "@/lib/formatters";
import { resolveRoleFromNextHeaders } from "@/services/lib/auth";
import { list } from "@/services/investigationService";
import {
  INVESTIGATION_STATUSES,
  PRIORITY_LEVELS,
  type InvestigationStatus,
  type PriorityLevel,
} from "@cyberpulse/shared/enums";

export const metadata = { title: "Investigations — CyberPulse AI" };

const STATUS_CLASS: Record<string, string> = {
  NEW: "bg-slate-100 text-slate-600",
  ANALYZING: "bg-blue-100 text-blue-700",
  UNDER_REVIEW: "bg-purple-100 text-purple-700",
  ALERT_SENT: "bg-orange-100 text-orange-700",
  RESOLVED: "bg-green-100 text-green-700",
  MONITORING: "bg-cyan-100 text-cyan-700",
};

const PRIORITY_CLASS: Record<string, string> = {
  HIGH: "text-orange-600 font-semibold",
  MEDIUM: "text-yellow-700",
  LOW: "text-slate-500",
};

export default async function InvestigationsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string; priority?: string; sort?: string }>;
}) {
  const params = await searchParams;
  const role = await resolveRoleFromNextHeaders();
  const requestId = `req_${randomUUID()}`;
  const parsedPage = Number(params.page ?? 1);
  const page = Number.isFinite(parsedPage) ? Math.max(1, parsedPage) : 1;

  let result: Awaited<ReturnType<typeof list>> | null = null;
  let failed = false;

  try {
    result = await list(
      {
        page,
        pageSize: 20,
        status: INVESTIGATION_STATUSES.includes(params.status as InvestigationStatus)
          ? (params.status as InvestigationStatus)
          : undefined,
        priority: PRIORITY_LEVELS.includes(params.priority as PriorityLevel) ? (params.priority as PriorityLevel) : undefined,
        sort: params.sort === "priority" ? "priority" : "updatedAt",
        order: "desc",
      },
      { role, requestId, origin: "USER" },
    );
  } catch {
    failed = true;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Investigations</h1>
          <p className="mt-1 text-sm text-slate-600">Open and closed investigation cases.</p>
        </div>
        {result && (
          <span className="text-sm text-slate-500">
            {result.total} case{result.total !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Filters */}
      <form method="GET" className="flex flex-wrap gap-2 text-sm">
        <select
          name="status"
          defaultValue={params.status ?? ""}
          className="rounded border border-slate-300 px-2 py-1.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-sih-blue-500"
        >
          <option value="">All statuses</option>
          <option value="NEW">New</option>
          <option value="ANALYZING">Analyzing</option>
          <option value="UNDER_REVIEW">Under review</option>
          <option value="ALERT_SENT">Alert sent</option>
          <option value="RESOLVED">Resolved</option>
          <option value="MONITORING">Monitoring</option>
        </select>
        <select
          name="priority"
          defaultValue={params.priority ?? ""}
          className="rounded border border-slate-300 px-2 py-1.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-sih-blue-500"
        >
          <option value="">All priorities</option>
          <option value="HIGH">High</option>
          <option value="MEDIUM">Medium</option>
          <option value="LOW">Low</option>
        </select>
        <select
          name="sort"
          defaultValue={params.sort ?? "updatedAt"}
          className="rounded border border-slate-300 px-2 py-1.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-sih-blue-500"
        >
          <option value="updatedAt">Sort: last updated</option>
          <option value="priority">Sort: priority</option>
        </select>
        <button
          type="submit"
          className="rounded border border-sih-blue-600 bg-sih-blue-600 px-3 py-1.5 text-white hover:bg-sih-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sih-blue-600"
        >
          Filter
        </button>
        {(params.status || params.priority) && (
          <Link
            href="/investigations"
            className="rounded border border-slate-300 px-3 py-1.5 text-slate-700 hover:bg-slate-100"
          >
            Clear
          </Link>
        )}
      </form>

      {failed ? (
        <StatePanel state="error" />
      ) : !result || result.data.length === 0 ? (
        <StatePanel state="empty" message="No investigations match the current filters." />
      ) : (
        <>
          <div className="overflow-hidden rounded-sm border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-slate-700">Case ID</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-700">Complaint</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-700">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-700">Priority</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-700">Assigned to</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-700">Last updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {result.data.map((inv) => (
                  <tr key={inv.caseId} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono text-xs">
                      <Link
                        href={`/investigations/${inv.caseId}`}
                        className="font-medium text-sih-blue-600 hover:underline"
                      >
                        {inv.caseId}
                      </Link>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-600">{inv.complaintId}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded px-2 py-0.5 text-xs font-medium ${STATUS_CLASS[inv.status] ?? "bg-slate-100 text-slate-600"}`}>
                        {inv.status.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className={`px-4 py-3 text-xs ${PRIORITY_CLASS[inv.priority] ?? "text-slate-600"}`}>
                      {inv.priority}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">{inv.assignedRole}</td>
                    <td className="px-4 py-3 text-slate-500">{formatTimestampIst(inv.updatedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {result.totalPages > 1 && (
            <div className="flex items-center gap-2 text-sm">
              {page > 1 && (
                <Link
                  href={`/investigations?page=${page - 1}${params.status ? `&status=${params.status}` : ""}${params.priority ? `&priority=${params.priority}` : ""}${params.sort ? `&sort=${params.sort}` : ""}`}
                  className="rounded border border-slate-300 px-3 py-1.5 text-slate-700 hover:bg-slate-100"
                >
                  ← Prev
                </Link>
              )}
              <span className="text-slate-500">
                Page {page} of {result.totalPages}
              </span>
              {page < result.totalPages && (
                <Link
                  href={`/investigations?page=${page + 1}${params.status ? `&status=${params.status}` : ""}${params.priority ? `&priority=${params.priority}` : ""}${params.sort ? `&sort=${params.sort}` : ""}`}
                  className="rounded border border-slate-300 px-3 py-1.5 text-slate-700 hover:bg-slate-100"
                >
                  Next →
                </Link>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
