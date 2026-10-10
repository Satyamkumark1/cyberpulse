import Link from "next/link";
import { randomUUID } from "node:crypto";
import { COMPLAINT_STATUSES, FRAUD_TYPES, RISK_LEVELS } from "@cyberpulse/shared/enums";
import { RiskBadge } from "@/components/common/RiskBadge";
import { StatePanel } from "@/components/common/StatePanel";
import { formatPaise, formatRiskScore, formatTimestampIst } from "@/lib/formatters";
import { resolveRoleFromNextHeaders } from "@/services/lib/auth";
import { list, listStates, type ComplaintListQuery } from "@/services/complaintService";

// Server Component — reads directly through the service layer, per
// RULE-frontend.md §Server vs client (no client state, no route round trip).
export default async function ComplaintsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  // Repeated query parameters are rejected rather than silently choosing a
  // value an intermediary may have injected. Single values retain the normal
  // Next.js behavior, while absent values remain undefined.
  const singleParam = (value: string | string[] | undefined): string | undefined => typeof value === "string" ? value : undefined;
  const state = singleParam(params.state);
  const q = singleParam(params.q)?.trim() || undefined;
  const fraudTypeParam = singleParam(params.fraudType);
  const statusParam = singleParam(params.status);
  const riskParam = singleParam(params.riskLevel);
  const sortParam = singleParam(params.sort);
  const orderParam = singleParam(params.order);
  const pageParam = singleParam(params.page);
  const fromParam = singleParam(params.from);
  const toParam = singleParam(params.to);
  const dateInputValue = (value: string | undefined) => value?.slice(0, 10) ?? "";
  const from = fromParam ? /^\d{4}-\d{2}-\d{2}$/.test(fromParam) ? `${fromParam}T00:00:00.000Z` : fromParam : undefined;
  const to = toParam ? /^\d{4}-\d{2}-\d{2}$/.test(toParam) ? `${toParam}T23:59:59.999Z` : toParam : undefined;
  const city = singleParam(params.city);
  const fraudType = FRAUD_TYPES.includes(fraudTypeParam as (typeof FRAUD_TYPES)[number]) ? fraudTypeParam as (typeof FRAUD_TYPES)[number] : undefined;
  const status = COMPLAINT_STATUSES.includes(statusParam as (typeof COMPLAINT_STATUSES)[number]) ? statusParam as (typeof COMPLAINT_STATUSES)[number] : undefined;
  const riskLevel = [...RISK_LEVELS, "NONE"] as const;
  const risk = riskLevel.includes(riskParam as (typeof riskLevel)[number]) ? riskParam as (typeof riskLevel)[number] : undefined;
  const sort = (["complaintTimestamp", "amount", "riskScore"] as const).includes(sortParam as "complaintTimestamp" | "amount" | "riskScore") ? sortParam as "complaintTimestamp" | "amount" | "riskScore" : "complaintTimestamp";
  const order = orderParam === "asc" ? "asc" : "desc";
  const page = Math.max(1, Number.isInteger(Number(pageParam)) ? Number(pageParam) : 1);
  const query: ComplaintListQuery = {
    page,
    pageSize: 25,
    q,
    fraudType,
    status,
    riskLevel: risk,
    from,
    to,
    city,
    sort,
    order,
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
          Search
          <input name="q" defaultValue={q ?? ""} placeholder="ID or city" className="mt-1 block w-44 rounded-sm border border-slate-300 px-2 py-1.5 text-sm" />
        </label>
        <label className="text-sm text-slate-700">
          Fraud type
          <select name="fraudType" defaultValue={fraudType ?? ""} className="mt-1 block rounded-sm border border-slate-300 px-2 py-1.5 text-sm">
            <option value="">All types</option>
            {FRAUD_TYPES.map((value) => <option key={value} value={value}>{value.replace(/_/g, " ")}</option>)}
          </select>
        </label>
        <label className="text-sm text-slate-700">
          Status
          <select name="status" defaultValue={status ?? ""} className="mt-1 block rounded-sm border border-slate-300 px-2 py-1.5 text-sm">
            <option value="">All statuses</option>
            {COMPLAINT_STATUSES.map((value) => <option key={value} value={value}>{value.replace(/_/g, " ")}</option>)}
          </select>
        </label>
        <label className="text-sm text-slate-700">
          Risk
          <select name="riskLevel" defaultValue={risk ?? ""} className="mt-1 block rounded-sm border border-slate-300 px-2 py-1.5 text-sm">
            <option value="">All risk</option>
            {[...RISK_LEVELS, "NONE"].map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
        </label>
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
        <label className="text-sm text-slate-700">
          City
          <input name="city" defaultValue={city ?? ""} className="mt-1 block w-36 rounded-sm border border-slate-300 px-2 py-1.5 text-sm" />
        </label>
        <label className="text-sm text-slate-700">
          From
          <input name="from" type="date" defaultValue={dateInputValue(fromParam)} className="mt-1 block rounded-sm border border-slate-300 px-2 py-1.5 text-sm" />
        </label>
        <label className="text-sm text-slate-700">
          To
          <input name="to" type="date" defaultValue={dateInputValue(toParam)} className="mt-1 block rounded-sm border border-slate-300 px-2 py-1.5 text-sm" />
        </label>
        <label className="text-sm text-slate-700">
          Sort
          <select name="sort" defaultValue={sort} className="mt-1 block rounded-sm border border-slate-300 px-2 py-1.5 text-sm">
            <option value="complaintTimestamp">Filed date</option><option value="amount">Amount</option><option value="riskScore">Risk</option>
          </select>
        </label>
        <label className="text-sm text-slate-700">
          Order
          <select name="order" defaultValue={order} className="mt-1 block rounded-sm border border-slate-300 px-2 py-1.5 text-sm"><option value="desc">Descending</option><option value="asc">Ascending</option></select>
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
                        <span className="text-xs text-slate-500">{formatRiskScore(c.riskScore)}</span>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {result && result.totalPages > 1 ? (
        <nav className="mt-4 flex items-center justify-between text-sm" aria-label="Complaint pages">
          <span className="text-slate-500">Page {result.page} of {result.totalPages}</span>
          <div className="flex gap-2">
            {result.page > 1 ? <Link className="rounded-sm border border-slate-300 px-3 py-1.5 hover:bg-slate-50" href={{ query: { ...params, page: String(result.page - 1) } }}>Previous</Link> : null}
            {result.page < result.totalPages ? <Link className="rounded-sm border border-slate-300 px-3 py-1.5 hover:bg-slate-50" href={{ query: { ...params, page: String(result.page + 1) } }}>Next</Link> : null}
          </div>
        </nav>
      ) : null}
    </div>
  );
}
