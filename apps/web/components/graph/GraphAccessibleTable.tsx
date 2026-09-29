import { formatPaise, formatTimestampIst } from "@/lib/formatters";
import type { ApiGraphEdge, ApiGraphNode, AtmNodeData, MuleAccountNodeData, VictimNodeData } from "./types";

function describeNode(node: ApiGraphNode): string {
  if (node.type === "VICTIM") {
    const d = node.data as VictimNodeData;
    return `Complaint ${d.complaintId}, ${formatPaise(d.amountPaise)}`;
  }
  if (node.type === "MULE_ACCOUNT") {
    const d = node.data as MuleAccountNodeData;
    return `Risk ${d.riskScore.toFixed(2)}, ${d.transactionCount} transactions, ${d.linkedAccountCount} linked accounts, ${d.status}`;
  }
  const d = node.data as AtmNodeData;
  return `${d.bankName}, ${d.city}, ${d.withdrawals.length} withdrawal(s)`;
}

// TC-A11Y-011: node and edge tables carry the same data as the graph — the
// only way this data exists for a screen-reader or keyboard-only user.
export function GraphAccessibleTable({ nodes, edges }: { nodes: ApiGraphNode[]; edges: ApiGraphEdge[] }) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-slate-700">Nodes</h3>
        <table className="mt-1 w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
              <th className="py-2 pr-4">ID</th>
              <th className="py-2 pr-4">Type</th>
              <th className="py-2 pr-4">Details</th>
            </tr>
          </thead>
          <tbody>
            {nodes.map((n) => (
              <tr key={n.id} className="border-b border-slate-100">
                <td className="py-2 pr-4 font-mono text-xs">{n.id}</td>
                <td className="py-2 pr-4">{n.type === "MULE_ACCOUNT" ? "Linked Account" : n.type}</td>
                <td className="py-2 pr-4 text-xs text-slate-600">{describeNode(n)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-slate-700">Edges</h3>
        <table className="mt-1 w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
              <th className="py-2 pr-4">From</th>
              <th className="py-2 pr-4">To</th>
              <th className="py-2 pr-4">Amount</th>
              <th className="py-2 pr-4">Association</th>
              <th className="py-2 pr-4">Channel</th>
              <th className="py-2 pr-4">Timestamp</th>
            </tr>
          </thead>
          <tbody>
            {edges.map((e) => (
              <tr key={e.id} className="border-b border-slate-100">
                <td className="py-2 pr-4 font-mono text-xs">{e.source}</td>
                <td className="py-2 pr-4 font-mono text-xs">{e.target}</td>
                <td className="py-2 pr-4">{formatPaise(e.data.amountPaise)}</td>
                <td className="py-2 pr-4 text-xs">{e.data.association === "RELATED" ? "Related activity — not attributed to this complaint" : "Complaint-linked record"}</td>
                <td className="py-2 pr-4">{e.data.channel}</td>
                <td className="py-2 pr-4">{formatTimestampIst(e.data.timestamp)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
