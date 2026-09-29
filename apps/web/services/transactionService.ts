import { db, dbSchema } from "@cyberpulse/db";
import { traverseFromComplaint, type TraversalEdgeRow } from "@cyberpulse/db/queries/network";
import { and, asc, desc, eq, gte, inArray, lte, sql, type SQL } from "drizzle-orm";
import { TRAVERSAL_MAX_DEPTH, TRAVERSAL_MAX_NODES_CAP, TRAVERSAL_ROW_LIMIT } from "@cyberpulse/shared/constants";
import type { RiskIndicator, TxnChannel } from "@cyberpulse/shared/enums";
import { ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";
import { reconcileComplaint, type TrailView, type TrailAssociation, type TrailSummary } from "./lib/moneyTrail";
import { requireAdminOrDemo, requireCapability, type RequestContext } from "./lib/auth";
import { complaintScope, transactionScope } from "./lib/scope";

const { transactions, accounts, atms, withdrawals, complaints, simulationEvents } = dbSchema;

// ---------------------------------------------------------------------------
// Ledger
// ---------------------------------------------------------------------------

export interface TransactionListQuery {
  page: number;
  pageSize: number;
  channel?: TxnChannel | undefined;
  minAmount?: number | undefined;
  maxAmount?: number | undefined;
  from?: string | undefined;
  to?: string | undefined;
  riskIndicator?: RiskIndicator | undefined;
  accountId?: string | undefined;
  sort: "timestamp" | "amount";
  order: "asc" | "desc";
}

// architecture/api-design.md API-020 §sort allow-list — an ordering-injection
// control, not a convenience (RULE-security.md §Input).
const SORT_COLUMNS = { timestamp: () => transactions.timestamp, amount: () => transactions.amountPaise } as const;

export async function list(query: TransactionListQuery, ctx: RequestContext) {
  requireCapability(ctx.role, "transactions:list");

  const conditions: (SQL | undefined)[] = [transactionScope(ctx.role)];
  if (query.channel) conditions.push(eq(transactions.channel, query.channel));
  if (query.minAmount !== undefined) conditions.push(gte(transactions.amountPaise, query.minAmount));
  if (query.maxAmount !== undefined) conditions.push(lte(transactions.amountPaise, query.maxAmount));
  if (query.from) conditions.push(gte(transactions.timestamp, query.from));
  if (query.to) conditions.push(lte(transactions.timestamp, query.to));
  if (query.riskIndicator) conditions.push(eq(transactions.riskIndicator, query.riskIndicator));
  if (query.accountId) {
    const [account] = await db.select({ id: accounts.id }).from(accounts).where(eq(accounts.accountId, query.accountId)).limit(1);
    const id = account?.id ?? -1;
    conditions.push(sql`(${transactions.fromAccountId} = ${id} OR ${transactions.toAccountId} = ${id})`);
  }

  const where = and(...conditions.filter((c): c is SQL => c !== undefined));
  const orderFn = query.order === "asc" ? asc : desc;
  const orderColumn = SORT_COLUMNS[query.sort]();

  // `total` computed after the scope predicate (security/authorization.md §3).
  const countRows = await db.select({ count: sql<number>`count(*)::int` }).from(transactions).where(where);
  const total = countRows[0]?.count ?? 0;

  const rows = await db
    .select({
      transactionId: transactions.transactionId,
      fromAccountId: transactions.fromAccountId,
      toAccountId: transactions.toAccountId,
      amountPaise: transactions.amountPaise,
      timestamp: transactions.timestamp,
      channel: transactions.channel,
      riskIndicator: transactions.riskIndicator,
    })
    .from(transactions)
    .where(where)
    .orderBy(orderFn(orderColumn))
    .limit(query.pageSize)
    .offset((query.page - 1) * query.pageSize);

  const accountIds = [...new Set(rows.flatMap((r) => [r.fromAccountId, r.toAccountId]))];
  const accountRows = accountIds.length
    ? await db.select({ id: accounts.id, accountId: accounts.accountId }).from(accounts).where(inArray(accounts.id, accountIds))
    : [];
  const businessIdById = new Map(accountRows.map((a) => [a.id, a.accountId]));

  return {
    data: rows.map((r) => ({
      transactionId: r.transactionId,
      fromAccountId: businessIdById.get(r.fromAccountId) ?? String(r.fromAccountId),
      toAccountId: businessIdById.get(r.toAccountId) ?? String(r.toAccountId),
      amountPaise: r.amountPaise,
      timestamp: r.timestamp,
      channel: r.channel,
      riskIndicator: r.riskIndicator,
    })),
    page: query.page,
    pageSize: query.pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
  };
}

function toAccountSummary(account: typeof accounts.$inferSelect | undefined) {
  if (!account) return null;
  return {
    accountId: account.accountId,
    accountType: account.accountType,
    bankName: account.bankName,
    riskScore: account.riskScore,
    status: account.status,
  };
}

export async function getById(transactionId: string, ctx: RequestContext) {
  requireCapability(ctx.role, "transactions:list");
  if (!/^TXN-\d{10}$/.test(transactionId)) {
    throw new ValidationError("transactionId must match ^TXN-\\d{10}$", "transactionId");
  }

  const scope = transactionScope(ctx.role);
  const where = scope ? and(eq(transactions.transactionId, transactionId), scope) : eq(transactions.transactionId, transactionId);
  const [txn] = await db.select().from(transactions).where(where).limit(1);
  if (!txn) throw new NotFoundError();

  const [[fromAccount], [toAccount], [complaint]] = await Promise.all([
    db.select().from(accounts).where(eq(accounts.id, txn.fromAccountId)).limit(1),
    db.select().from(accounts).where(eq(accounts.id, txn.toAccountId)).limit(1),
    txn.complaintId !== null
      ? db.select({ complaintId: complaints.complaintId }).from(complaints).where(eq(complaints.id, txn.complaintId)).limit(1)
      : Promise.resolve([undefined]),
  ]);

  return {
    transactionId: txn.transactionId,
    complaintId: complaint?.complaintId ?? null,
    amountPaise: txn.amountPaise,
    timestamp: txn.timestamp,
    channel: txn.channel,
    riskIndicator: txn.riskIndicator,
    latitude: txn.latitude,
    longitude: txn.longitude,
    fromAccount: toAccountSummary(fromAccount),
    toAccount: toAccountSummary(toAccount),
  };
}

// ---------------------------------------------------------------------------
// Money-trail network (FEAT-04, architecture/api-design.md API-022)
// ---------------------------------------------------------------------------

export type GraphNodeType = "VICTIM" | "MULE_ACCOUNT" | "ATM";

export interface GraphNode {
  id: string;
  type: GraphNodeType;
  data: Record<string, unknown>;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  data: { amountPaise: number; timestamp: string; channel: string; association: TrailAssociation };
}

export interface NetworkResponse {
  nodes: GraphNode[];
  edges: GraphEdge[];
  truncated: boolean;
  nodeCount: number;
  requestedDepth: number;
  view: TrailView;
  summary: TrailSummary;
  recordsLimited: boolean;
}

function dedupeEdgesById(rows: TraversalEdgeRow[]): TraversalEdgeRow[] {
  const byId = new Map<number, TraversalEdgeRow>();
  for (const row of rows) {
    const existing = byId.get(row.id);
    if (!existing || row.depth < existing.depth) byId.set(row.id, row);
  }
  return [...byId.values()];
}

export async function getNetwork(
  complaintBusinessId: string,
  depth: number,
  maxNodes: number,
  ctx: RequestContext,
  view: TrailView = "complaint",
): Promise<NetworkResponse> {
  requireCapability(ctx.role, "transactions:network");
  if (view !== "complaint" && view !== "related") throw new ValidationError("Unknown network view", "view");
  if (view === "related" && ctx.role === "BANK") throw new ForbiddenError();
  if (!/^C-\d{5}$/.test(complaintBusinessId)) {
    throw new ValidationError("id must match ^C-\\d{5}$", "id");
  }
  if (!Number.isInteger(depth) || depth < 1 || depth > TRAVERSAL_MAX_DEPTH) {
    throw new ValidationError(`depth must be an integer between 1 and ${TRAVERSAL_MAX_DEPTH}`, "depth");
  }
  if (!Number.isInteger(maxNodes) || maxNodes < 1 || maxNodes > TRAVERSAL_MAX_NODES_CAP) {
    throw new ValidationError(`maxNodes must be an integer between 1 and ${TRAVERSAL_MAX_NODES_CAP}`, "maxNodes");
  }

  const scope = complaintScope(ctx.role);
  const where = scope ? and(eq(complaints.complaintId, complaintBusinessId), scope) : eq(complaints.complaintId, complaintBusinessId);
  const [complaint] = await db.select().from(complaints).where(where).limit(1);
  if (!complaint) throw new NotFoundError();

  // A hub account reached by more than one path (the same "shared mule
  // account" fan-out noted below) makes the same transaction row eligible
  // more than once — once per path that reaches it — since the CTE's
  // visited-set cycle guard is per-branch, not global across the whole
  // traversal. Deduplicated by the transaction's own id, keeping the
  // shortest-path occurrence, or every downstream consumer (node weights,
  // rendered edges) would double-count that one transaction.
  const caseRows = await db.select().from(transactions).where(eq(transactions.complaintId, complaint.id))
    .orderBy(asc(transactions.timestamp), asc(transactions.hopIndex), asc(transactions.id)).limit(TRAVERSAL_ROW_LIMIT + 1);
  const caseTransfers = caseRows.slice(0, TRAVERSAL_ROW_LIMIT);
  const contextRows = view === "related" ? await traverseFromComplaint(complaint.id, depth, TRAVERSAL_ROW_LIMIT + 1) : [];
  const caseEdges: TraversalEdgeRow[] = caseTransfers.map((t) => ({ ...t, depth: t.hopIndex + 1 }));
  const edgeRows = dedupeEdgesById([...caseEdges, ...contextRows.slice(0, TRAVERSAL_ROW_LIMIT)]);

  // The CTE's base case matches every transaction tagged with this
  // complaint (there is one per hop, not just the first), and the
  // recursive step follows accounts wherever they lead — including into
  // mule accounts shared with other complaints' chains (FEAT-04 edge case:
  // "account appearing in multiple chains"). So CTE `depth` is a per-branch
  // extension counter, not hop distance from the victim, and cannot be used
  // to find the victim. `hop_index = 0` on this complaint's own rows can.
  const entryHop = caseTransfers.find((t) => t.hopIndex === 0);
  const victimAccountId = entryHop?.fromAccountId;

  // Rendered as a single complaint-level node, not as an account row, so its
  // business fields come from `complaints`, not `accounts` (FEAT-04's
  // three-node model: Victim → Mule Account → ATM).
  const victimId = `victim:${complaint.complaintId}`;

  const accountIds = new Set<number>();
  for (const e of edgeRows) {
    accountIds.add(e.fromAccountId);
    accountIds.add(e.toAccountId);
  }
  // Select withdrawals by case, including accounts that also transfer onward.
  const selectWithdrawals = () => db.select({ id: withdrawals.id, complaintId: withdrawals.complaintId,
    accountId: withdrawals.accountId, amountPaise: withdrawals.amountPaise, timestamp: withdrawals.timestamp, atm: atms })
    .from(withdrawals).innerJoin(atms, eq(atms.id, withdrawals.atmId));
  const caseWithdrawalRows = await selectWithdrawals().where(eq(withdrawals.complaintId, complaint.id))
    .orderBy(asc(withdrawals.timestamp), asc(withdrawals.id)).limit(TRAVERSAL_ROW_LIMIT + 1);
  const caseWithdrawals = caseWithdrawalRows.slice(0, TRAVERSAL_ROW_LIMIT);
  const relatedWithdrawals = view === "related" && accountIds.size
    ? await selectWithdrawals().where(inArray(withdrawals.accountId, [...accountIds]))
      .orderBy(asc(withdrawals.timestamp), asc(withdrawals.id)).limit(TRAVERSAL_ROW_LIMIT + 1) : [];
  const withdrawalRows = [...new Map([...caseWithdrawals, ...relatedWithdrawals.slice(0, TRAVERSAL_ROW_LIMIT)].map((w) => [w.id, w])).values()];
  const caseLimited = caseRows.length > TRAVERSAL_ROW_LIMIT || caseWithdrawalRows.length > TRAVERSAL_ROW_LIMIT;
  const recordsLimited = caseLimited || contextRows.length > TRAVERSAL_ROW_LIMIT || relatedWithdrawals.length > TRAVERSAL_ROW_LIMIT;
  const summary = reconcileComplaint(complaint.amountPaise, caseTransfers, caseWithdrawals, caseLimited);
  for (const w of withdrawalRows) accountIds.add(w.accountId);
  if (victimAccountId !== undefined) accountIds.delete(victimAccountId);
  const accountRows = accountIds.size ? await db.select().from(accounts).where(inArray(accounts.id, [...accountIds])) : [];
  const accountById = new Map(accountRows.map((a) => [a.id, a]));

  const degreeOf = (accountDbId: number) =>
    edgeRows.filter((e) => e.fromAccountId === accountDbId || e.toAccountId === accountDbId).length;
  const linkedAccountsOf = (accountDbId: number) => {
    const peers = new Set<number>();
    for (const e of edgeRows) {
      if (e.fromAccountId === accountDbId) peers.add(e.toAccountId);
      if (e.toAccountId === accountDbId) peers.add(e.fromAccountId);
    }
    peers.delete(accountDbId);
    if (victimAccountId !== undefined) peers.delete(victimAccountId);
    return peers.size;
  };

  const nodes = new Map<string, GraphNode>();
  nodes.set(victimId, { id: victimId, type: "VICTIM", data: { complaintId: complaint.complaintId, amountPaise: complaint.amountPaise } });

  for (const account of accountRows) {
    nodes.set(`acct:${account.accountId}`, {
      id: `acct:${account.accountId}`,
      type: "MULE_ACCOUNT",
      data: {
        accountId: account.accountId,
        riskScore: account.riskScore,
        transactionCount: degreeOf(account.id),
        linkedAccountCount: linkedAccountsOf(account.id),
        openedAt: account.openedAt,
        status: account.status,
      },
    });
  }

  // Withdrawals at the same ATM by the same account collapse into one edge
  // (summed amount, latest timestamp) with the individual events kept on
  // the ATM node itself — keeps edge count bounded without losing detail.
  const atmMetaById = new Map<string, typeof atms.$inferSelect>();
  const atmWithdrawalsById = new Map<string, { amountPaise: number; timestamp: string; association: TrailAssociation }[]>();
  const atmEdgeAgg = new Map<string, { accountDbId: number; atmNodeId: string; totalPaise: number; latestTimestamp: string; association: TrailAssociation }>();

  for (const row of withdrawalRows) {
    const association: TrailAssociation = row.complaintId === complaint.id ? "COMPLAINT" : "RELATED";
    const atmNodeId = `atm:${row.atm.atmId}`;
    atmMetaById.set(atmNodeId, row.atm);
    const list = atmWithdrawalsById.get(atmNodeId) ?? [];
    list.push({ amountPaise: row.amountPaise, timestamp: row.timestamp, association });
    atmWithdrawalsById.set(atmNodeId, list);

    // Never blend this case's withdrawals with other activity at the same ATM.
    const key = `${row.accountId}->${atmNodeId}:${association}`;
    const existing = atmEdgeAgg.get(key);
    atmEdgeAgg.set(key, {
      accountDbId: row.accountId,
      association,
      atmNodeId,
      totalPaise: (existing?.totalPaise ?? 0) + row.amountPaise,
      latestTimestamp: existing && existing.latestTimestamp > row.timestamp ? existing.latestTimestamp : row.timestamp,
    });
  }

  for (const [atmNodeId, meta] of atmMetaById) {
    nodes.set(atmNodeId, {
      id: atmNodeId,
      type: "ATM",
      data: { atmId: meta.atmId, bankName: meta.bankName, city: meta.city, withdrawals: atmWithdrawalsById.get(atmNodeId) ?? [] },
    });
  }

  const edges: GraphEdge[] = edgeRows.map((e) => {
    const sourceId = e.fromAccountId === victimAccountId ? victimId : `acct:${accountById.get(e.fromAccountId)?.accountId ?? e.fromAccountId}`;
    const targetId = e.toAccountId === victimAccountId ? victimId : `acct:${accountById.get(e.toAccountId)?.accountId ?? e.toAccountId}`;
    return { id: `txn-${e.id}`, source: sourceId, target: targetId, data: { amountPaise: e.amountPaise, timestamp: e.timestamp, channel: e.channel, association: e.complaintId === complaint.id ? "COMPLAINT" : "RELATED" } };
  });

  for (const agg of atmEdgeAgg.values()) {
    const sourceAccount = accountById.get(agg.accountDbId);
    if (!sourceAccount && agg.accountDbId !== victimAccountId) continue;
    edges.push({
      id: `wd-${agg.accountDbId}-${agg.atmNodeId}-${agg.association}`,
      source: agg.accountDbId === victimAccountId ? victimId : `acct:${sourceAccount!.accountId}`,
      target: agg.atmNodeId,
      data: { amountPaise: agg.totalPaise, timestamp: agg.latestTimestamp, channel: "ATM", association: agg.association },
    });
  }

  const allNodes = [...nodes.values()];
  const nodeCount = allNodes.length;

  if (nodeCount <= maxNodes) {
    return { nodes: allNodes, edges, truncated: false, nodeCount, requestedDepth: depth, view, summary, recordsLimited };
  }

  // Above `maxNodes`, keep the top-weighted subgraph: the victim node plus
  // the highest-weight nodes by total amount on their incident edges, ties
  // broken by node id so the truncated set is deterministic across requests
  // (architecture/database-design.md §7, AC-P4-05).
  const weightById = new Map<string, number>();
  const caseNodeIds = new Set(edges.filter((e) => e.data.association === "COMPLAINT").flatMap((e) => [e.source, e.target]));
  for (const e of edges) {
    weightById.set(e.source, (weightById.get(e.source) ?? 0) + e.data.amountPaise);
    weightById.set(e.target, (weightById.get(e.target) ?? 0) + e.data.amountPaise);
  }
  const ranked = allNodes
    .filter((n) => n.id !== victimId)
    .sort((a, b) => Number(caseNodeIds.has(b.id)) - Number(caseNodeIds.has(a.id)) || (weightById.get(b.id) ?? 0) - (weightById.get(a.id) ?? 0) || a.id.localeCompare(b.id))
    .slice(0, maxNodes - 1);
  const keptIds = new Set([victimId, ...ranked.map((n) => n.id)]);

  return {
    nodes: allNodes.filter((n) => keptIds.has(n.id)),
    edges: edges.filter((e) => keptIds.has(e.source) && keptIds.has(e.target)),
    truncated: true,
    nodeCount,
    requestedDepth: depth,
    view, summary, recordsLimited,
  };
}

// ---------------------------------------------------------------------------
// Simulation (FEAT-03 §Simulation panel, architecture/api-design.md API-023)
//
// No background worker exists in this topology (ADR: no orchestrator, no
// broker), so the stream is generated lazily on each `simulationGetEvents`
// poll — deterministically, from `startedAt` and a tick sequence number,
// never from `Math.random()` or the request's own clock (FEAT-03 edge case:
// "events carry server timestamps, not client"). `simulation_events` is the
// only table touched; a `transactions` write here would contaminate the
// analysable corpus (RULE-security.md, the simulation isolation check).
// ---------------------------------------------------------------------------

const SIMULATION_CONTROL_REF = "SIM-CONTROL";
const SIMULATION_TICK_MS = 3_000;
const SIMULATION_MAX_EVENTS = 50;
const SIMULATION_CHANNELS: TxnChannel[] = ["UPI", "IMPS", "CARD", "ATM"];

interface SimulationControlPayload {
  status: "RUNNING" | "PAUSED";
  startedAt: string;
}

async function getSimulationControlRow() {
  const [row] = await db.select().from(simulationEvents).where(eq(simulationEvents.eventRef, SIMULATION_CONTROL_REF)).limit(1);
  return row;
}

async function upsertSimulationControl(payload: SimulationControlPayload): Promise<void> {
  await db
    .insert(simulationEvents)
    .values({ eventRef: SIMULATION_CONTROL_REF, payload, emittedAt: new Date().toISOString() })
    .onConflictDoUpdate({ target: simulationEvents.eventRef, set: { payload, emittedAt: new Date().toISOString() } });
}

export async function simulationStart(ctx: RequestContext): Promise<SimulationControlPayload> {
  requireAdminOrDemo(ctx);
  const existing = await getSimulationControlRow();
  const existingPayload = existing?.payload as SimulationControlPayload | undefined;
  // Idempotent: a second `start` while already running is a no-op that
  // keeps the original `startedAt`, not a new run.
  const payload: SimulationControlPayload =
    existingPayload?.status === "RUNNING" ? existingPayload : { status: "RUNNING", startedAt: new Date().toISOString() };
  await upsertSimulationControl(payload);
  return payload;
}

export async function simulationPause(ctx: RequestContext): Promise<SimulationControlPayload> {
  requireAdminOrDemo(ctx);
  const existing = await getSimulationControlRow();
  const startedAt = (existing?.payload as SimulationControlPayload | undefined)?.startedAt ?? new Date().toISOString();
  const payload: SimulationControlPayload = { status: "PAUSED", startedAt };
  await upsertSimulationControl(payload);
  return payload;
}

export async function simulationReset(ctx: RequestContext): Promise<{ cleared: true }> {
  requireAdminOrDemo(ctx);
  // simulation_events holds nothing but runtime simulation state (see the
  // schema file's own comment); reset truncates the whole table rather than
  // a scoped delete.
  await db.delete(simulationEvents);
  return { cleared: true };
}

// Deterministic pseudo-random unit in [0, 1) from an integer seed — not
// `Math.random()`, so the same (startedAt, sequence) always produces the
// same tick (RULE-testing.md "no unseeded randomness").
function deterministicUnit(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

export interface SimulationEvent {
  eventRef: string;
  emittedAt: string;
  channel: TxnChannel;
  amountPaise: number;
}

export async function simulationGetEvents(
  since: string | undefined,
  ctx: RequestContext,
): Promise<{ status: SimulationControlPayload["status"]; events: SimulationEvent[] }> {
  requireAdminOrDemo(ctx);
  const control = await getSimulationControlRow();
  const controlPayload = control?.payload as SimulationControlPayload | undefined;

  if (controlPayload?.status === "RUNNING") {
    const startedAtMs = new Date(controlPayload.startedAt).getTime();
    const elapsedTicks = Math.min(SIMULATION_MAX_EVENTS, Math.floor((Date.now() - startedAtMs) / SIMULATION_TICK_MS));

    for (let sequence = 1; sequence <= elapsedTicks; sequence++) {
      const channel = SIMULATION_CHANNELS[Math.floor(deterministicUnit(sequence) * SIMULATION_CHANNELS.length)]!;
      const amountPaise = Math.round(5_00_00 + deterministicUnit(sequence + 0.5) * 45_00_00);
      await db
        .insert(simulationEvents)
        .values({
          eventRef: `SIM-EVT-${startedAtMs}-${sequence}`,
          payload: { channel, amountPaise },
          emittedAt: new Date(startedAtMs + sequence * SIMULATION_TICK_MS).toISOString(),
        })
        .onConflictDoNothing({ target: simulationEvents.eventRef });
    }
  }

  const rows = await db
    .select()
    .from(simulationEvents)
    .where(
      since
        ? sql`${simulationEvents.eventRef} <> ${SIMULATION_CONTROL_REF} AND ${simulationEvents.emittedAt} > ${since}`
        : sql`${simulationEvents.eventRef} <> ${SIMULATION_CONTROL_REF}`,
    )
    .orderBy(asc(simulationEvents.emittedAt))
    .limit(SIMULATION_MAX_EVENTS);

  return {
    status: controlPayload?.status ?? "PAUSED",
    events: rows.map((r) => {
      const payload = r.payload as { channel: TxnChannel; amountPaise: number };
      return { eventRef: r.eventRef, emittedAt: r.emittedAt, channel: payload.channel, amountPaise: payload.amountPaise };
    }),
  };
}
