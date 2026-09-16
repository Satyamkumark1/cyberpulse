import { Handle, Position, type NodeProps, type Node } from "@xyflow/react";
import type { MuleAccountNodeData } from "../types";

export type MuleAccountFlowNode = Node<MuleAccountNodeData, "MULE_ACCOUNT">;

// RULE-frontend.md non-negotiable #2: distinct shape (diamond glyph) + icon
// + text — determinable under a greyscale filter (AC-004-02, TC-A11Y-009).
export function MuleAccountNode({ data, selected }: NodeProps<MuleAccountFlowNode>) {
  return (
    <div className={`w-44 rounded-sm border-2 bg-white px-3 py-2 shadow-sm ${selected ? "border-sih-blue-600" : "border-slate-400"}`}>
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
      <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
        <span aria-hidden="true">▤</span> Mule Account
      </div>
      <div className="mt-1 font-mono text-sm text-slate-800">{data.accountId}</div>
      <div className="text-xs text-slate-600">risk {data.riskScore.toFixed(2)}</div>
    </div>
  );
}
