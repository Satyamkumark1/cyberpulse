import Link from "next/link";
import { randomUUID } from "node:crypto";
import { RiskBadge } from "@/components/common/RiskBadge";
import { StatePanel } from "@/components/common/StatePanel";
import { formatPaise, formatScorePercent, formatTimestampIst } from "@/lib/formatters";
import { resolveRoleFromNextHeaders } from "@/services/lib/auth";
import { list, listStates, type ComplaintListQuery } from "@/services/complaintService";

// Server Component — reads directly through the service layer, per
// RULE-frontend.md §Server vs client (no client state, no route round trip).
export default async function ComplaintsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const state = params.state || undefined;
  const query: ComplaintListQuery = {
    page: Number(params.page ?? 1) || 1,
    pageSize: 25,
    sort: "complaintTimestamp",
    order: "desc",
    ...(state ? { state } : {}),
  };
  const role = await resolveRoleFromNextHeaders();
  const requestId = `req_${randomUUID()}`;
  const ctx = { role, requestId, origin: "USER" as const };

  let result: Awaited<ReturnType<typeof list>> | null = null;
  let states: string[] = [];
  let failed = false;
  try {
    [result, states] = await Promise.all([list(query, ctx), listStates(ctx)]);
  } catch {
    failed = true;
  }

  return (
    <div>
      <h1 className="text-xl font-semibold text-slate-800">Complaints</h1>
      <p className="mt-1 text-sm text-slate-600">{result ? `${result.total} complaints` : ""}</p>

      <form className="mt-4 flex flex-wrap items-end gap-3" method="get">
        <label className="text-sm text-slate-700">
          State
          <select name="state" defaultValue={state ?? ""} className="mt-1 block rounded-sm border border-slate-300 px-2 py-1.5 text-sm">
            <option value="">All states</option>
            {states.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          className="rounded-sm bg-sih-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-sih-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sih-blue-600"
        >
          Apply
        </button>
      </form>

      {failed ? (
        <div className="mt-4">
          <StatePanel state="error" />
        </div>
      ) : !result || result.data.length === 0 ? (
        <div className="mt-4">
          <StatePanel state="empty" message="No complaints match the current filters." />
        </div>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="py-2 pr-4">Complaint</th>
                <th className="py-2 pr-4">Fraud type</th>
                <th className="py-2 pr-4">Amount</th>
                <th className="py-2 pr-4">Filed</th>
                <th className="py-2 pr-4">Location</th>
                <th className="py-2 pr-4">Risk</th>
              </tr>
            </thead>
            <tbody>
              {result.data.map((c) => (
                <tr key={c.complaintId} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-2 pr-4">
                    <Link
                      href={`/complaints/${c.complaintId}`}
                      className="font-mono text-sih-blue-600 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sih-blue-600"
                    >
                      {c.complaintId}
                    </Link>
                  </td>
                  <td className="py-2 pr-4">{c.fraudType.replace(/_/g, " ")}</td>
                  <td className="py-2 pr-4">{formatPaise(c.amountPaise)}</td>
                  <td className="py-2 pr-4">{formatTimestampIst(c.complaintTimestamp)}</td>
                  <td className="py-2 pr-4">
                    {c.city}, {c.state}
                  </td>
                  <td className="py-2 pr-4">
                    <div className="flex items-center gap-2">
                      <RiskBadge level={c.riskLevel} />
                      {c.riskScore !== null ? (
                        <span className="text-xs text-slate-500">{formatScorePercent(c.riskScore)}</span>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
