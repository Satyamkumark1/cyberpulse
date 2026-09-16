"use client"; // WebGL/canvas-adjacent client library: @xyflow/react (RULE-frontend.md)

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ReactFlow, Background, Controls, MarkerType, type Edge, type Node } from "@xyflow/react";
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

const NODE_TYPES = { VICTIM: VictimNode, MULE_ACCOUNT: MuleAccountNode, ATM: AtmNode };
const GRAPH_HEIGHT_PX = 480;

interface ApiErrorBody {
  error: { message: string };
}

async function fetchNetwork(complaintId: string): Promise<NetworkResponse> {
  const res = await fetch(`/api/transactions/network/${complaintId}`);
  if (!res.ok) {
    const body = (await res.json()) as ApiErrorBody;
    throw new Error(body.error.message);
  }
  return res.json();
}

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function MoneyTrailGraph({ complaintId }: { complaintId: string }) {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [showTable, setShowTable] = useState(false);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["money-trail", complaintId],
    queryFn: () => fetchNetwork(complaintId),
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
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-4">
        <p aria-live="polite" className="text-xs text-slate-500">
          {data.truncated
            ? `Graph truncated at ${flowNodes.length} of ${data.nodeCount} nodes — showing the highest-value subgraph.`
            : `${data.nodeCount} node${data.nodeCount === 1 ? "" : "s"}, depth ${data.requestedDepth}.`}
        </p>
        <button
          type="button"
          onClick={() => setShowTable((v) => !v)}
          className="shrink-0 rounded-sm border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sih-blue-600"
        >
          {showTable ? "Show graph" : "Show accessible table"}
        </button>
      </div>

      {showTable ? (
        <GraphAccessibleTable nodes={data.nodes} edges={data.edges} />
      ) : (
        <div className="flex gap-4">
          <div style={{ height: GRAPH_HEIGHT_PX }} className="min-w-0 flex-1 rounded-sm border border-slate-200">
            <ReactFlow
              nodes={flowNodes}
              edges={flowEdges}
              nodeTypes={NODE_TYPES}
              onNodeClick={(_, node) => setSelectedNodeId(node.id)}
              fitView
              fitViewOptions={{ duration: prefersReducedMotion() ? 0 : 200 }}
              nodesDraggable={false}
              proOptions={{ hideAttribution: true }}
            >
              <Background />
              <Controls showInteractive={false} />
            </ReactFlow>
          </div>
          {selectedNode ? <NodeDetailPanel node={selectedNode} onClose={() => setSelectedNodeId(null)} /> : null}
        </div>
      )}

      <p className="text-xs text-slate-600">Legend: ▣ Victim · ▤ Mule Account · ◉ ATM · → fund movement</p>
    </div>
  );
}
