import { Handle, Position, type NodeProps, type Node } from "@xyflow/react";
import { formatPaise } from "@/lib/formatters";
import type { VictimNodeData } from "../types";

export type VictimFlowNode = Node<VictimNodeData, "VICTIM">;

// RULE-frontend.md non-negotiable #2: shape (square glyph) + icon + text —
// never colour alone (AC-004-02).
export function VictimNode({ data, selected }: NodeProps<VictimFlowNode>) {
  return (
    <div className={`w-44 rounded-lg border-2 bg-white px-3 py-2.5 shadow-sm transition-shadow ${selected ? "border-sih-blue-600 shadow-md ring-4 ring-sih-blue-100" : "border-sih-blue-600/60"}`}>
      <Handle type="source" position={Position.Right} />
      <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
        <span aria-hidden="true">▣</span> Victim
      </div>
      <div className="mt-1 font-mono text-sm text-slate-800">{data.complaintId}</div>
      <div className="text-xs text-slate-600">{formatPaise(data.amountPaise)}</div>
    </div>
  );
}
