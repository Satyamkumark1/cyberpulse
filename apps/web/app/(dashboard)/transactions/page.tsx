import Link from "next/link";
import { randomUUID } from "node:crypto";
import { TXN_CHANNELS, RISK_INDICATORS, type RiskIndicator, type TxnChannel } from "@cyberpulse/shared/enums";
import { SimulationPanel } from "@/components/transactions/SimulationPanel";
import { StatePanel } from "@/components/common/StatePanel";
import { formatPaise, formatTimestampIst } from "@/lib/formatters";
import { resolveRoleFromNextHeaders } from "@/services/lib/auth";
import { list, type TransactionListQuery } from "@/services/transactionService";

// Filter state lives in the query string, not client state
// (RULE-frontend.md §Data) — a plain GET form needs no JavaScript.
export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const channel = TXN_CHANNELS.includes(params.channel as TxnChannel) ? (params.channel as TxnChannel) : undefined;
  const riskIndicator = RISK_INDICATORS.includes(params.riskIndicator as RiskIndicator) ? (params.riskIndicator as RiskIndicator) : undefined;
  const minAmount = params.minAmount ? Number(params.minAmount) * 100 : undefined;
  const maxAmount = params.maxAmount ? Number(params.maxAmount) * 100 : undefined;
  const accountId = params.accountId && /^ACC-\d{8}$/.test(params.accountId) ? params.accountId : undefined;

  const query: TransactionListQuery = {
    page: Number(params.page ?? 1) || 1,
    pageSize: 25,
    sort: "timestamp",
    order: "desc",
    ...(channel ? { channel } : {}),
    ...(riskIndicator ? { riskIndicator } : {}),
    ...(minAmount !== undefined && !Number.isNaN(minAmount) ? { minAmount } : {}),
    ...(maxAmount !== undefined && !Number.isNaN(maxAmount) ? { maxAmount } : {}),
    ...(accountId ? { accountId } : {}),
  };

  const role = await resolveRoleFromNextHeaders();
  const requestId = `req_${randomUUID()}`;

  let result: Awaited<ReturnType<typeof list>> | null = null;
  let failed = false;
  try {
    result = await list(query, { role, requestId, origin: "USER" });
  } catch {
    failed = true;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-800">Transactions</h1>
        <p className="mt-1 text-sm text-slate-600">{result ? `${result.total} transactions` : ""}</p>
      </div>

      <SimulationPanel />

      <form className="flex flex-wrap items-end gap-3" method="get">
        <label className="text-sm text-slate-700">
          Channel
          <select name="channel" defaultValue={channel ?? ""} className="mt-1 block rounded-sm border border-slate-300 px-2 py-1.5 text-sm">
            <option value="">All</option>
            {TXN_CHANNELS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm text-slate-700">
          Risk indicator
          <select name="riskIndicator" defaultValue={riskIndicator ?? ""} className="mt-1 block rounded-sm border border-slate-300 px-2 py-1.5 text-sm">
            <option value="">All</option>
            {RISK_INDICATORS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm text-slate-700">
          Min amount (₹)
          <input
            type="number"
            name="minAmount"
            min={0}
            defaultValue={params.minAmount ?? ""}
            className="mt-1 block w-32 rounded-sm border border-slate-300 px-2 py-1.5 text-sm"
          />
        </label>
        <label className="text-sm text-slate-700">
          Max amount (₹)
          <input
            type="number"
            name="maxAmount"
            min={0}
            defaultValue={params.maxAmount ?? ""}
            className="mt-1 block w-32 rounded-sm border border-slate-300 px-2 py-1.5 text-sm"
          />
        </label>
        <button
          type="submit"
          className="rounded-sm bg-sih-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-sih-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sih-blue-600"
        >
          Apply
        </button>
      </form>

      {failed ? (
        <StatePanel state="error" />
      ) : !result || result.data.length === 0 ? (
        <StatePanel state="empty" message="No transactions match the current filters." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="py-2 pr-4">Transaction</th>
                <th className="py-2 pr-4">From</th>
                <th className="py-2 pr-4">To</th>
                <th className="py-2 pr-4">Amount</th>
                <th className="py-2 pr-4">Channel</th>
                <th className="py-2 pr-4">Risk</th>
                <th className="py-2 pr-4">Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {result.data.map((t) => (
                <tr key={t.transactionId} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-2 pr-4">
                    <Link
                      href={`/transactions/${t.transactionId}`}
                      className="font-mono text-xs text-sih-blue-600 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sih-blue-600"
                    >
                      {t.transactionId}
                    </Link>
                  </td>
                  <td className="py-2 pr-4 font-mono text-xs">{t.fromAccountId}</td>
                  <td className="py-2 pr-4 font-mono text-xs">{t.toAccountId}</td>
                  <td className="py-2 pr-4">{formatPaise(t.amountPaise)}</td>
                  <td className="py-2 pr-4">{t.channel}</td>
                  <td className="py-2 pr-4">{t.riskIndicator}</td>
                  <td className="py-2 pr-4">{formatTimestampIst(t.timestamp)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
