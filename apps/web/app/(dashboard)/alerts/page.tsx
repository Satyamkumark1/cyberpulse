import Link from "next/link";
import { randomUUID } from "node:crypto";
import { StatePanel } from "@/components/common/StatePanel";
import { formatTimestampIst, formatPaise } from "@/lib/formatters";
import { resolveRoleFromNextHeaders } from "@/services/lib/auth";
import { list } from "@/services/alertService";
import { ALERT_SEVERITIES, ALERT_STATUSES, type AlertSeverity, type AlertStatus } from "@cyberpulse/shared/enums";

export const metadata = { title: "Alerts — CyberPulse AI" };

const SEVERITY_CLASS: Record<string, string> = {
  CRITICAL: "bg-red-100 text-red-700",
  HIGH: "bg-orange-100 text-orange-700",
  MEDIUM: "bg-yellow-100 text-yellow-700",
  LOW: "bg-slate-100 text-slate-600",
};
const STATUS_CLASS: Record<string, string> = {
  SENT: "bg-blue-100 text-blue-700",
  ACKNOWLEDGED: "bg-green-100 text-green-700",
};

export default async function AlertsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string; severity?: string }>;
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
        status: ALERT_STATUSES.includes(params.status as AlertStatus) ? (params.status as AlertStatus) : undefined,
        severity: ALERT_SEVERITIES.includes(params.severity as AlertSeverity) ? (params.severity as AlertSeverity) : undefined,
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
          <h1 className="text-xl font-semibold text-slate-800">Alerts</h1>
          <p className="mt-1 text-sm text-slate-600">All dispatched alerts, newest first.</p>
        </div>
        {result && (
          <span className="text-sm text-slate-500">
            {result.total} alert{result.total !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Filter bar */}
      <form method="GET" className="flex flex-wrap gap-2 text-sm">
        <select
          name="status"
          defaultValue={params.status ?? ""}
          className="rounded border border-slate-300 px-2 py-1.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-sih-blue-500"
        >
          <option value="">All statuses</option>
          <option value="SENT">Sent</option>
          <option value="ACKNOWLEDGED">Acknowledged</option>
        </select>
        <select
          name="severity"
          defaultValue={params.severity ?? ""}
          className="rounded border border-slate-300 px-2 py-1.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-sih-blue-500"
        >
          <option value="">All severities</option>
          <option value="HIGH">High</option>
          <option value="MEDIUM">Medium</option>
          <option value="LOW">Low</option>
        </select>
        <button
          type="submit"
          className="rounded border border-sih-blue-600 bg-sih-blue-600 px-3 py-1.5 text-white hover:bg-sih-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sih-blue-600"
        >
          Filter
        </button>
        {(params.status || params.severity) && (
          <Link
            href="/alerts"
            className="rounded border border-slate-300 px-3 py-1.5 text-slate-700 hover:bg-slate-100"
          >
            Clear
          </Link>
        )}
      </form>

      {failed ? (
        <StatePanel state="error" />
      ) : !result || result.data.length === 0 ? (
        <StatePanel state="empty" message="No alerts match the current filters." />
      ) : (
        <>
          <div className="overflow-hidden rounded-sm border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-slate-700">Alert ID</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-700">Location</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-700">Severity</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-700">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-700">Exposure</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-700">Dispatched</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-700">Case</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {result.data.map((a) => (
                  <tr key={a.alertId} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono text-xs">
                      <Link
                        href={`/alerts/${a.alertId}`}
                        className="font-medium text-sih-blue-600 hover:underline"
                      >
                        {a.alertId}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{a.locationName}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded px-2 py-0.5 text-xs font-medium ${SEVERITY_CLASS[a.severity] ?? "bg-slate-100 text-slate-600"}`}>
                        {a.severity}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded px-2 py-0.5 text-xs font-medium ${STATUS_CLASS[a.status] ?? "bg-slate-100 text-slate-600"}`}>
                        {a.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {a.exposurePaise !== null && a.exposurePaise !== undefined
                        ? formatPaise(Number(a.exposurePaise))
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-500">{formatTimestampIst(a.createdAt)}</td>
                    <td className="px-4 py-3 font-mono text-xs">
                      {a.investigationCaseId ? (
                        <Link
                          href={`/investigations/${a.investigationCaseId}`}
                          className="text-sih-blue-600 hover:underline"
                        >
                          {a.investigationCaseId}
                        </Link>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {result.totalPages > 1 && (
            <div className="flex items-center gap-2 text-sm">
              {page > 1 && (
                <Link
                  href={`/alerts?page=${page - 1}${params.status ? `&status=${params.status}` : ""}${params.severity ? `&severity=${params.severity}` : ""}`}
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
                  href={`/alerts?page=${page + 1}${params.status ? `&status=${params.status}` : ""}${params.severity ? `&severity=${params.severity}` : ""}`}
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
