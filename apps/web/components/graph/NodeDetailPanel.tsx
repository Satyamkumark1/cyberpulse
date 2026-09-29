import { formatPaise, formatTimestampIst } from "@/lib/formatters";
import type { ApiGraphNode, AtmNodeData, MuleAccountNodeData, VictimNodeData } from "./types";

// AC-004-03…05: each node type's detail panel shows its documented fields.
export function NodeDetailPanel({ node, onClose }: { node: ApiGraphNode; onClose: () => void }) {
  return (
    <aside aria-label="Node detail" className="w-72 shrink-0 rounded-lg border border-slate-200 bg-white p-4 text-sm">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-slate-800">
          {node.type === "VICTIM" ? "Victim" : node.type === "MULE_ACCOUNT" ? "Linked Account" : "ATM"}
        </h3>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close node detail"
          className="rounded-sm px-1 text-slate-500 hover:text-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sih-blue-600"
        >
          ✕
        </button>
      </div>

      {node.type === "VICTIM" ? <VictimDetail data={node.data as VictimNodeData} /> : null}
      {node.type === "MULE_ACCOUNT" ? <MuleAccountDetail data={node.data as MuleAccountNodeData} /> : null}
      {node.type === "ATM" ? <AtmDetail data={node.data as AtmNodeData} /> : null}
    </aside>
  );
}

function VictimDetail({ data }: { data: VictimNodeData }) {
  return (
    <dl className="mt-2 space-y-1">
      <Row label="Complaint" value={data.complaintId} mono />
      <Row label="Amount" value={formatPaise(data.amountPaise)} />
    </dl>
  );
}

function MuleAccountDetail({ data }: { data: MuleAccountNodeData }) {
  return (
    <>
      <dl className="mt-2 space-y-1">
        <Row label="Account ID" value={data.accountId} mono />
        <Row label="Risk score" value={data.riskScore.toFixed(2)} />
        <Row label="Transactions" value={String(data.transactionCount)} />
        <Row label="Linked accounts" value={String(data.linkedAccountCount)} />
        <Row label="Opened" value={formatTimestampIst(data.openedAt)} />
        <Row label="Status" value={data.status} />
      </dl>
      <p className="mt-3 text-xs text-slate-500">Synthetic account-risk indicator, not a cash-out prediction or a confirmed mule classification.</p>
    </>
  );
}

function AtmDetail({ data }: { data: AtmNodeData }) {
  return (
    <>
      <dl className="mt-2 space-y-1">
        <Row label="ATM ID" value={data.atmId} mono />
        <Row label="Bank" value={data.bankName} />
        <Row label="City" value={data.city} />
      </dl>
      <h4 className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Prior withdrawals</h4>
      {data.withdrawals.length === 0 ? (
        <p className="mt-1 text-xs text-slate-500">No withdrawal observed.</p>
      ) : (
        <ul className="mt-1 space-y-1">
          {data.withdrawals.map((w, index) => (
            <li key={`${w.timestamp}-${w.amountPaise}-${index}`} className="flex justify-between gap-2 text-xs text-slate-600">
              <span>{formatTimestampIst(w.timestamp)}<span className="block">{w.association === "RELATED" ? "Related activity — attribution uncertain" : "Complaint-linked record"}</span></span>
              <span>{formatPaise(w.amountPaise)}</span>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-2">
      <dt className="text-slate-500">{label}</dt>
      <dd className={mono ? "font-mono text-xs text-slate-800" : "text-slate-800"}>{value}</dd>
    </div>
  );
}
