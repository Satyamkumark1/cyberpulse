import { Handle, Position, type NodeProps, type Node } from "@xyflow/react";
import type { AtmNodeData } from "../types";

export type AtmFlowNode = Node<AtmNodeData, "ATM">;

// RULE-frontend.md non-negotiable #2: distinct shape (round glyph) + icon +
// text — determinable under a greyscale filter (AC-004-02, TC-A11Y-009).
export function AtmNode({ data, selected }: NodeProps<AtmFlowNode>) {
  return (
    <div className={`w-40 rounded-full border-2 bg-white px-3 py-2 text-center shadow-sm ${selected ? "border-sih-blue-600" : "border-slate-400"}`}>
      <Handle type="target" position={Position.Left} />
      <div className="flex items-center justify-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
        <span aria-hidden="true">◉</span> ATM
      </div>
      <div className="mt-1 font-mono text-sm text-slate-800">{data.atmId}</div>
      <div className="text-xs text-slate-600">{data.city}</div>
    </div>
  );
}
