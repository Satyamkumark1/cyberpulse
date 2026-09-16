import { notFound } from "next/navigation";
import { randomUUID } from "node:crypto";
import { PredictionPanel } from "@/components/prediction/PredictionPanel";
import { MoneyTrailGraphLazy } from "@/components/graph/MoneyTrailGraphLoader";
import { RiskBadge } from "@/components/common/RiskBadge";
import { formatPaise, formatTimestampIst } from "@/lib/formatters";
import { resolveRoleFromNextHeaders } from "@/services/lib/auth";
import { getWithContext } from "@/services/complaintService";
import { getLatestForComplaint } from "@/services/predictionService";
import { NotFoundError } from "@/lib/errors";

export default async function ComplaintDetailPage({
  params,
}: {
  params: Promise<{ complaintId: string }>;
}) {
  const { complaintId } = await params;
  const role = await resolveRoleFromNextHeaders();
  const requestId = `req_${randomUUID()}`;

  let context: Awaited<ReturnType<typeof getWithContext>>;
  try {
    context = await getWithContext(complaintId, { role, requestId, origin: "USER" });
  } catch (e) {
    if (e instanceof NotFoundError) notFound();
    throw e;
  }

  const { complaint, transactions, linkedAccounts } = context;
  const latestPrediction = await getLatestForComplaint(complaint.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-mono text-xl font-semibold text-slate-800">{complaint.complaintId}</h1>
        <p className="mt-1 text-sm text-slate-600">
          {complaint.fraudType.replace(/_/g, " ")} · {formatPaise(complaint.amountPaise)} · filed{" "}
          {formatTimestampIst(complaint.complaintTimestamp)}
        </p>
        <p className="text-sm text-slate-600">
          {complaint.city}, {complaint.district}, {complaint.state}
        </p>
      </div>

      <PredictionPanel complaintId={complaint.complaintId} initialPrediction={latestPrediction} />

      <section aria-labelledby="money-trail-heading">
        <h2 id="money-trail-heading" className="text-base font-semibold text-slate-800">
          Money trail
        </h2>
        <div className="mt-2">
          <MoneyTrailGraphLazy complaintId={complaint.complaintId} />
        </div>
      </section>

      <section>
        <h2 className="text-base font-semibold text-slate-800">Transaction chain</h2>
        <table className="mt-2 w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
              <th className="py-2 pr-4">Hop</th>
              <th className="py-2 pr-4">From</th>
              <th className="py-2 pr-4">To</th>
              <th className="py-2 pr-4">Amount</th>
              <th className="py-2 pr-4">Channel</th>
              <th className="py-2 pr-4">Risk</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((t) => (
              <tr key={t.transactionId} className="border-b border-slate-100">
                <td className="py-2 pr-4">{t.hopIndex}</td>
                <td className="py-2 pr-4 font-mono text-xs">{t.fromAccountId}</td>
                <td className="py-2 pr-4 font-mono text-xs">{t.toAccountId}</td>
                <td className="py-2 pr-4">{formatPaise(t.amountPaise)}</td>
                <td className="py-2 pr-4">{t.channel}</td>
                <td className="py-2 pr-4">{t.riskIndicator}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <h2 className="text-base font-semibold text-slate-800">Linked accounts</h2>
        <p className="text-xs text-slate-500">Risk indicator. Not a finding about any person.</p>
        <table className="mt-2 w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
              <th className="py-2 pr-4">Account</th>
              <th className="py-2 pr-4">Type</th>
              <th className="py-2 pr-4">Bank</th>
              <th className="py-2 pr-4">Risk score</th>
            </tr>
          </thead>
          <tbody>
            {linkedAccounts.map((a) => (
              <tr key={a.accountId} className="border-b border-slate-100">
                <td className="py-2 pr-4 font-mono text-xs">{a.accountId}</td>
                <td className="py-2 pr-4">{a.accountType}</td>
                <td className="py-2 pr-4">{a.bankName}</td>
                <td className="py-2 pr-4">
                  <RiskBadge level={a.riskScore >= 0.7 ? "HIGH" : a.riskScore >= 0.4 ? "MEDIUM" : "LOW"} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
