import Link from "next/link";
import { notFound } from "next/navigation";
import { randomUUID } from "node:crypto";
import { NotFoundError } from "@/lib/errors";
import { formatPaise, formatTimestampIst } from "@/lib/formatters";
import { resolveRoleFromNextHeaders } from "@/services/lib/auth";
import { getById } from "@/services/transactionService";

// architecture/api-design.md API-021.
export default async function TransactionDetailPage({
  params,
}: {
  params: Promise<{ transactionId: string }>;
}) {
  const { transactionId } = await params;
  const role = await resolveRoleFromNextHeaders();
  const requestId = `req_${randomUUID()}`;

  let txn: Awaited<ReturnType<typeof getById>>;
  try {
    txn = await getById(transactionId, { role, requestId, origin: "USER" });
  } catch (e) {
    if (e instanceof NotFoundError) notFound();
    throw e;
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="font-mono text-xl font-semibold text-slate-800">{txn.transactionId}</h1>
        <p className="mt-1 text-sm text-slate-600">
          {formatPaise(txn.amountPaise)} · {txn.channel} · {formatTimestampIst(txn.timestamp)}
        </p>
        <p className="text-sm text-slate-600">Risk indicator: {txn.riskIndicator}</p>
        {txn.latitude !== null && txn.longitude !== null ? (
          <p className="text-xs text-slate-500">
            {txn.latitude.toFixed(4)}, {txn.longitude.toFixed(4)}
          </p>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <AccountCard title="From account" account={txn.fromAccount} />
        <AccountCard title="To account" account={txn.toAccount} />
      </div>

      {txn.complaintId ? (
        <Link
          href={`/complaints/${txn.complaintId}`}
          className="inline-block rounded-sm bg-sih-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-sih-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sih-blue-600"
        >
          View money trail ({txn.complaintId})
        </Link>
      ) : null}
    </div>
  );
}

function AccountCard({ title, account }: { title: string; account: { accountId: string; accountType: string; bankName: string; riskScore: number; status: string } | null }) {
  if (!account) {
    return (
      <div className="rounded-sm border border-slate-200 p-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</h2>
        <p className="mt-1 text-sm text-slate-500">—</p>
      </div>
    );
  }
  return (
    <div className="rounded-sm border border-slate-200 p-3 text-sm">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</h2>
      <Link
        href={`/transactions?accountId=${account.accountId}`}
        className="mt-1 block font-mono text-sih-blue-600 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sih-blue-600"
      >
        {account.accountId}
      </Link>
      <p className="mt-1 text-slate-600">
        {account.accountType} · {account.bankName}
      </p>
      <p className="text-slate-600">Risk score {account.riskScore.toFixed(2)} · {account.status}</p>
    </div>
  );
}
