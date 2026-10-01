"use client"; // WebGL/canvas-adjacent client library: @xyflow/react (RULE-frontend.md)

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ReactFlow, Background, Controls, MarkerType, Panel, type Edge, type Node } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { StatePanel } from "@/components/common/StatePanel";
import { formatPaise } from "@/lib/formatters";
import { layeredLayout } from "./layout";
import { VictimNode } from "./nodes/VictimNode";
import { MuleAccountNode } from "./nodes/MuleAccountNode";
import { AtmNode } from "./nodes/AtmNode";
import { NodeDetailPanel } from "./NodeDetailPanel";
import { GraphAccessibleTable } from "./GraphAccessibleTable";
import type { NetworkResponse } from "./types";
import { apiFetch } from "@/lib/apiFetch";

const NODE_TYPES = { VICTIM: VictimNode, MULE_ACCOUNT: MuleAccountNode, ATM: AtmNode };
const GRAPH_HEIGHT_PX = 520;

async function fetchNetwork(complaintId: string, maxNodes: number): Promise<NetworkResponse> {
  return apiFetch(`/api/transactions/network/${complaintId}?maxNodes=${maxNodes}`);
}

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function MoneyTrailGraph({ complaintId, maxNodes = 200, presentation = "default" }: { complaintId: string; maxNodes?: number; presentation?: "default" | "demo" }) {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [showTable, setShowTable] = useState(false);
  const [nodeLimit, setNodeLimit] = useState(maxNodes);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["money-trail", complaintId, nodeLimit],
    queryFn: () => fetchNetwork(complaintId, nodeLimit),
  });

  // Memoised by the response itself (which TanStack Query keeps referentially
  // stable across re-renders for the same data) — ADR-007's determinism
  // requirement, re-run only when the graph actually changes.
  const { flowNodes, flowEdges } = useMemo(() => {
    if (!data) return { flowNodes: [] as Node[], flowEdges: [] as Edge[] };
    const positions = layeredLayout(data.nodes, data.edges);
    const flowNodes: Node[] = data.nodes.map((n) => ({
      id: n.id,
      type: n.type,
      position: positions.get(n.id) ?? { x: 0, y: 0 },
      data: n.data,
    }));
    const flowEdges: Edge[] = data.edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      label: formatPaise(e.data.amountPaise),
      markerEnd: { type: MarkerType.ArrowClosed },
      style: { stroke: "#94A3B4", strokeWidth: 1.2 },
      labelStyle: { fill: "#556377", fontSize: 10, fontWeight: 500 },
      labelBgStyle: { fill: "#ffffff", fillOpacity: 0.9 },
      labelBgPadding: [4, 2],
      labelBgBorderRadius: 4,
    }));
    return { flowNodes, flowEdges };
  }, [data]);

  const selectedNode = data?.nodes.find((n) => n.id === selectedNodeId) ?? null;

  if (isLoading) {
    return <StatePanel state="loading" title="Loading money trail" message="Tracing the transaction chain." />;
  }
  if (isError) {
    return <StatePanel state="error" {...(error instanceof Error ? { message: error.message } : {})} onRetry={() => refetch()} />;
  }
  if (!data || data.nodes.length === 0) {
    return <StatePanel state="empty" message="No money-trail data for this complaint." />;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2" aria-live="polite">
          <span className="inline-flex items-center rounded-full bg-sih-blue-100 px-2.5 py-1 text-xs font-semibold text-sih-blue-600">
            {flowNodes.length} of {data.nodeCount} nodes
          </span>
          <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
            {flowEdges.length} fund movements
          </span>
          <span className="text-xs text-slate-500">Depth {data.requestedDepth}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
        {presentation === "demo" ? (
          <div className="inline-flex rounded-md border border-slate-200 bg-slate-50 p-1" aria-label="Graph density">
            <button type="button" onClick={() => { setNodeLimit(maxNodes); setSelectedNodeId(null); }} aria-pressed={nodeLimit === maxNodes} className={`rounded px-2.5 py-1.5 text-xs font-semibold transition-colors ${nodeLimit === maxNodes ? "bg-white text-navy-900 shadow-sm" : "text-slate-600 hover:text-slate-800"}`}>Focused</button>
            <button type="button" onClick={() => { setNodeLimit(60); setSelectedNodeId(null); }} aria-pressed={nodeLimit === 60} className={`rounded px-2.5 py-1.5 text-xs font-semibold transition-colors ${nodeLimit === 60 ? "bg-white text-navy-900 shadow-sm" : "text-slate-600 hover:text-slate-800"}`}>Expanded</button>
          </div>
        ) : null}
        <button
          type="button"
          onClick={() => setShowTable((v) => !v)}
          className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-4 w-4"><path d="M4 5h16v14H4zM8 9h8M8 13h5" /></svg>
          {showTable ? "Show graph" : "Show accessible table"}
        </button>
        </div>
      </div>

      {data.truncated ? (
        <div className="flex items-start gap-3 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-900">
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="mt-0.5 h-4 w-4 shrink-0"><circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 17h.01"/></svg>
          <p>Showing the highest-value connected subgraph for clarity. Choose Expanded for more context, or use the accessible table for every displayed node and transaction.</p>
        </div>
      ) : null}

      {showTable ? (
        <GraphAccessibleTable nodes={data.nodes} edges={data.edges} />
      ) : (
        <div className="relative overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
          <div style={{ height: presentation === "demo" ? 590 : GRAPH_HEIGHT_PX }} className="min-w-0 flex-1">
            <ReactFlow
              nodes={flowNodes}
              edges={flowEdges}
              nodeTypes={NODE_TYPES}
              onNodeClick={(_, node) => setSelectedNodeId(node.id)}
              fitView
              fitViewOptions={{ duration: prefersReducedMotion() ? 0 : 200 }}
              nodesDraggable={false}
              minZoom={0.15}
              maxZoom={2}
              colorMode="light"
              proOptions={{ hideAttribution: true }}
            >
              <Background color="#DCE3EC" gap={22} size={1} />
              <Controls showInteractive={false} position="bottom-left" />
              <Panel position="top-left" className="!m-3 rounded-md border border-slate-200 bg-white/95 px-3 py-2 text-xs text-slate-600 shadow-sm backdrop-blur-sm">
                Select a node to inspect its details
              </Panel>
            </ReactFlow>
          </div>
          {selectedNode ? <div className="absolute inset-y-3 right-3 z-10 max-h-[calc(100%-24px)] overflow-y-auto shadow-lg"><NodeDetailPanel node={selectedNode} onClose={() => setSelectedNodeId(null)} /></div> : null}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-md bg-slate-50 px-4 py-3 text-xs text-slate-600" aria-label="Money trail legend">
        <span className="font-semibold uppercase tracking-wide text-slate-600">Legend</span>
        <span className="inline-flex items-center gap-2"><span aria-hidden="true" className="flex h-5 w-5 items-center justify-center rounded border-2 border-sih-blue-600 bg-white text-[10px]">▣</span>Victim</span>
        <span className="inline-flex items-center gap-2"><span aria-hidden="true" className="flex h-5 w-5 items-center justify-center rounded border-2 border-amber-500 bg-white text-[10px]">▤</span>Mule account</span>
        <span className="inline-flex items-center gap-2"><span aria-hidden="true" className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-teal-600 bg-white text-[10px]">◉</span>ATM</span>
        <span className="inline-flex items-center gap-2"><span aria-hidden="true" className="text-base text-slate-500">→</span>Fund movement</span>
      </div>
    </div>
  );
}
