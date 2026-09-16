// Local mirror of transactionService's network response shape
// (architecture/api-design.md API-022) — not shared with the ML service, so
// it lives here rather than in packages/shared, matching how other
// REST-only envelopes (e.g. ComplaintListQuery) are declared beside their
// route rather than codegen'd.
export type GraphNodeType = "VICTIM" | "MULE_ACCOUNT" | "ATM";

export interface VictimNodeData extends Record<string, unknown> {
  complaintId: string;
  amountPaise: number;
}

export interface MuleAccountNodeData extends Record<string, unknown> {
  accountId: string;
  riskScore: number;
  transactionCount: number;
  linkedAccountCount: number;
  openedAt: string;
  status: string;
}

export interface AtmWithdrawal {
  amountPaise: number;
  timestamp: string;
}

export interface AtmNodeData extends Record<string, unknown> {
  atmId: string;
  bankName: string;
  city: string;
  withdrawals: AtmWithdrawal[];
}

export type GraphNodeData = VictimNodeData | MuleAccountNodeData | AtmNodeData;

export interface ApiGraphNode {
  id: string;
  type: GraphNodeType;
  data: GraphNodeData;
}

export interface ApiGraphEdge {
  id: string;
  source: string;
  target: string;
  data: { amountPaise: number; timestamp: string; channel: string };
}

export interface NetworkResponse {
  nodes: ApiGraphNode[];
  edges: ApiGraphEdge[];
  truncated: boolean;
  nodeCount: number;
  requestedDepth: number;
}
