import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { db, dbSchema } from "@cyberpulse/db";
import { eq, inArray, sql } from "drizzle-orm";
import { TRAVERSAL_MAX_DEPTH } from "@cyberpulse/shared/constants";
import { ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";
import {
  getById,
  getNetwork,
  list,
  simulationGetEvents,
  simulationPause,
  simulationReset,
  simulationStart,
} from "./transactionService";

const { complaints, accounts, transactions, simulationEvents } = dbSchema;

const admin = { role: "ADMIN" as const, requestId: "test", origin: "USER" as const };
const lea = { role: "LEA" as const, requestId: "test", origin: "USER" as const };
const bank = { role: "BANK" as const, requestId: "test", origin: "USER" as const };
const demoLea = { role: "LEA" as const, requestId: "test", origin: "DEMO" as const };

// This environment's seeded corpus uses ids C-00001..C-00500 rather than the
// doc's illustrative C-10284 — real complaints are located dynamically so
// these tests don't depend on which id range a given seed run produced.
async function findComplaintWithChain(minHops: number): Promise<string> {
  const [row] = await db
    .select({ complaintId: complaints.complaintId })
    .from(transactions)
    .innerJoin(complaints, eq(complaints.id, transactions.complaintId))
    .groupBy(complaints.id, complaints.complaintId)
    .having(sql`count(*) >= ${minHops}`)
    .limit(1);
  if (!row) throw new Error("fixture precondition failed: no seeded complaint has a chain this long — reseed the database");
  return row.complaintId;
}

const EMPTY_COMPLAINT_ID = "C-99996";

// This seeded corpus happens to give every complaint at least one
// transaction, so the "no chain" edge case (testing.md's C-10281 fixture)
// is built directly rather than searched for.
async function seedComplaintWithNoTransactions(): Promise<void> {
  await db.insert(complaints).values({
    complaintId: EMPTY_COMPLAINT_ID,
    fraudType: "UPI_FRAUD",
    amountPaise: 50_000,
    complaintTimestamp: new Date().toISOString(),
    victimLat: 28.6,
    victimLon: 77.2,
    victimH3R8: "8860d4d4b5fffff",
    city: "Delhi",
    district: "New Delhi",
    state: "Delhi",
    origin: "DEMO",
  });
}

async function cleanupComplaintWithNoTransactions(): Promise<void> {
  await db.delete(complaints).where(eq(complaints.complaintId, EMPTY_COMPLAINT_ID));
}

const CYCLE_COMPLAINT_ID = "C-99997";
const CYCLE_ACCOUNT_IDS = ["ACC-99990001", "ACC-99990002", "ACC-99990003"];

// engineering/integration-testing.md's own example: A → B → C → A. Built
// here rather than relying on a planted fixture because `transactions` has
// no `origin` column to seed a DEMO-scoped row against (schema deliberately
// carries no such flag — every transaction is production-shaped seed data).
async function seedCyclicChain(): Promise<void> {
  const [complaint] = await db
    .insert(complaints)
    .values({
      complaintId: CYCLE_COMPLAINT_ID,
      fraudType: "UPI_FRAUD",
      amountPaise: 100_000,
      complaintTimestamp: new Date().toISOString(),
      victimLat: 28.6,
      victimLon: 77.2,
      victimH3R8: "8860d4d4b5fffff",
      city: "Delhi",
      district: "New Delhi",
      state: "Delhi",
      origin: "DEMO",
    })
    .returning();

  const accountRows = await db
    .insert(accounts)
    .values(
      CYCLE_ACCOUNT_IDS.map((accountId) => ({
        accountId,
        accountType: "MULE" as const,
        bankName: "Test Bank",
        riskScore: 0.5,
        openedAt: new Date().toISOString(),
      })),
    )
    .returning();

  const [a, b, c] = accountRows;
  await db.insert(transactions).values([
    {
      transactionId: "TXN-9999900001",
      complaintId: complaint!.id,
      fromAccountId: a!.id,
      toAccountId: b!.id,
      amountPaise: 100_000,
      timestamp: new Date().toISOString(),
      channel: "UPI",
      hopIndex: 0,
    },
    {
      transactionId: "TXN-9999900002",
      complaintId: complaint!.id,
      fromAccountId: b!.id,
      toAccountId: c!.id,
      amountPaise: 90_000,
      timestamp: new Date().toISOString(),
      channel: "UPI",
      hopIndex: 1,
    },
    {
      transactionId: "TXN-9999900003",
      complaintId: complaint!.id,
      fromAccountId: c!.id,
      toAccountId: a!.id,
      amountPaise: 80_000,
      timestamp: new Date().toISOString(),
      channel: "UPI",
      hopIndex: 2,
    },
  ]);
}

async function cleanupCyclicChain(): Promise<void> {
  const [complaint] = await db.select({ id: complaints.id }).from(complaints).where(eq(complaints.complaintId, CYCLE_COMPLAINT_ID)).limit(1);
  if (complaint) await db.delete(transactions).where(eq(transactions.complaintId, complaint.id));
  await db.delete(accounts).where(inArray(accounts.accountId, CYCLE_ACCOUNT_IDS));
  await db.delete(complaints).where(eq(complaints.complaintId, CYCLE_COMPLAINT_ID));
}

describe("transactionService.getNetwork — FEAT-04, architecture/api-design.md API-022", () => {
  let chainComplaintId: string;

  beforeAll(async () => {
    chainComplaintId = await findComplaintWithChain(2);
    await seedCyclicChain();
    await seedComplaintWithNoTransactions();
  });

  afterAll(async () => {
    await cleanupCyclicChain();
    await cleanupComplaintWithNoTransactions();
  });

  it("renders a directed graph with a victim node and at least one mule account node for a real chain (AC-004-01)", async () => {
    const result = await getNetwork(chainComplaintId, 4, 200, admin);
    expect(result.nodes.filter((n) => n.type === "VICTIM")).toHaveLength(1);
    expect(result.nodes.filter((n) => n.type === "MULE_ACCOUNT").length).toBeGreaterThanOrEqual(1);
    expect(result.requestedDepth).toBe(4);
  });

  it("every edge carries an amount and endpoints that resolve to a rendered node (AC-004-02)", async () => {
    const result = await getNetwork(chainComplaintId, 4, 200, admin);
    const nodeIds = new Set(result.nodes.map((n) => n.id));
    for (const edge of result.edges) {
      expect(edge.data.amountPaise).toBeGreaterThan(0);
      expect(nodeIds.has(edge.source)).toBe(true);
      expect(nodeIds.has(edge.target)).toBe(true);
    }
  });

  it("never renders the same transaction as two edges, even when a shared hub account is reachable by more than one path", async () => {
    // A hub mule account reused across complaints (real seeded behaviour —
    // discovered via C-00091, whose account 714 has 13+ onward chains) is
    // reachable by more than one traversal branch; the CTE's visited-set
    // guard is per-branch, so the same transaction row can be matched twice
    // before deduplication (a regression this test pins down).
    const result = await getNetwork(chainComplaintId, TRAVERSAL_MAX_DEPTH, 500, admin);
    const edgeIds = result.edges.map((e) => e.id);
    expect(new Set(edgeIds).size).toBe(edgeIds.length);
  });

  it("rejects depth above the traversal bound with VALIDATION_ERROR on field depth (AC-004-06)", async () => {
    await expect(getNetwork(chainComplaintId, TRAVERSAL_MAX_DEPTH + 1, 200, admin)).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
      field: "depth",
    });
  });

  it("returns within 300ms p95 at the default depth (AC-004-06)", async () => {
    const t0 = performance.now();
    await getNetwork(chainComplaintId, 4, 200, admin);
    expect(performance.now() - t0).toBeLessThan(300);
  });

  it("returns NotFoundError for an unknown complaint id", async () => {
    await expect(getNetwork("C-99999", 4, 200, admin)).rejects.toBeInstanceOf(NotFoundError);
  });

  it("terminates a cyclic chain (A→B→C→A) within the time budget with no duplicate node ids", async () => {
    const t0 = performance.now();
    const result = await getNetwork(CYCLE_COMPLAINT_ID, TRAVERSAL_MAX_DEPTH, 200, admin);
    expect(performance.now() - t0).toBeLessThan(1000);
    const ids = result.nodes.map((n) => n.id);
    expect(new Set(ids).size).toBe(ids.length);
    // hop_index 0 (A→B) makes A this graph's victim node; B and C render as
    // mule accounts — the cycle back to A is still a validly-rendered edge.
    expect(result.nodes.filter((n) => n.type === "VICTIM")).toHaveLength(1);
    expect(result.nodes.filter((n) => n.type === "MULE_ACCOUNT")).toHaveLength(2);
  });

  it("renders only the victim node for a complaint with no transactions (FEAT-04 disconnected-complaint edge case)", async () => {
    const result = await getNetwork(EMPTY_COMPLAINT_ID, 4, 200, admin);
    expect(result.nodes).toHaveLength(1);
    expect(result.nodes[0]?.type).toBe("VICTIM");
    expect(result.edges).toHaveLength(0);
    expect(result.truncated).toBe(false);
  });

  it("above maxNodes, truncates to the top-weighted subgraph and still reports the true node count (AC-P4-05)", async () => {
    const result = await getNetwork(chainComplaintId, 4, 1, admin);
    expect(result.truncated).toBe(true);
    expect(result.nodes).toHaveLength(1);
    expect(result.nodes[0]?.type).toBe("VICTIM");
    expect(result.nodeCount).toBeGreaterThan(1);
  });

  it("never includes a personal-name field in any node payload (TC-SEC-021)", async () => {
    const result = await getNetwork(chainComplaintId, 4, 200, admin);
    for (const node of result.nodes) {
      expect(node.data).not.toHaveProperty("name");
    }
  });

  it("BANK sees a 404 for a complaint reachable by no alert addressed to BANK (security/authorization.md §3)", async () => {
    // This corpus seeds no alerts, so every complaint is out of scope for
    // BANK — scoped-and-absent are indistinguishable by design (TC-SEC-012).
    await expect(getNetwork(chainComplaintId, 4, 200, bank)).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe("transactionService.list — architecture/api-design.md API-020", () => {
  it("returns the documented paginated envelope", async () => {
    const result = await list({ page: 1, pageSize: 5, sort: "timestamp", order: "desc" }, admin);
    expect(result.data).toHaveLength(5);
    expect(result.page).toBe(1);
    expect(result.total).toBeGreaterThan(0);
  });

  it("every returned row satisfies an applied amount-range filter (AC-003-02)", async () => {
    const minAmountPaise = 50_000_00;
    const result = await list({ page: 1, pageSize: 25, minAmount: minAmountPaise, sort: "amount", order: "desc" }, admin);
    for (const row of result.data) expect(row.amountPaise).toBeGreaterThanOrEqual(minAmountPaise);
  });
});

describe("transactionService.getById — architecture/api-design.md API-021", () => {
  it("returns both counterparty summaries for a real transaction (AC-003-03)", async () => {
    const [row] = await db.select({ transactionId: transactions.transactionId }).from(transactions).limit(1);
    const result = await getById(row!.transactionId, admin);
    expect(result.fromAccount).not.toBeNull();
    expect(result.toAccount).not.toBeNull();
  });

  it("rejects a malformed transaction id with ValidationError", async () => {
    await expect(getById("not-a-real-id", admin)).rejects.toBeInstanceOf(ValidationError);
  });

  it("returns NotFoundError for a well-formed but nonexistent transaction id", async () => {
    await expect(getById("TXN-9999999999", admin)).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe("transactionService simulation — architecture/api-design.md API-023", () => {
  afterEach(async () => {
    await simulationReset(admin);
  });

  it("start is idempotent — a second start while running keeps the original startedAt (AC-003-04)", async () => {
    const first = await simulationStart(admin);
    const second = await simulationStart(admin);
    expect(second.startedAt).toBe(first.startedAt);
    expect(second.status).toBe("RUNNING");
  });

  it("pause halts new ticks and reset clears both the panel and the table (AC-003-04)", async () => {
    await simulationStart(admin);
    await simulationPause(admin);
    const paused = await simulationGetEvents(undefined, admin);
    expect(paused.status).toBe("PAUSED");

    await simulationReset(admin);
    const rows = await db.select().from(simulationEvents);
    expect(rows).toHaveLength(0);
  });

  it("writes only to simulation_events — the transactions table is untouched by a running simulation (the isolation check)", async () => {
    const countTransactions = async () => {
      const rows = await db.select({ count: sql<number>`count(*)::int` }).from(transactions);
      return rows[0]!.count;
    };
    const before = await countTransactions();

    // A `startedAt` far enough in the past that `simulationGetEvents` has
    // many ticks to backfill immediately — no real sleep required (RULE-testing.md).
    const longAgo = new Date(Date.now() - 10 * 60_000).toISOString();
    await db
      .insert(simulationEvents)
      .values({ eventRef: "SIM-CONTROL", payload: { status: "RUNNING", startedAt: longAgo }, emittedAt: longAgo })
      .onConflictDoUpdate({ target: simulationEvents.eventRef, set: { payload: { status: "RUNNING", startedAt: longAgo }, emittedAt: longAgo } });

    const result = await simulationGetEvents(undefined, admin);
    expect(result.events.length).toBeGreaterThan(0);

    expect(await countTransactions()).toBe(before);
  });

  it("denies a non-ADMIN role outside the demo route", async () => {
    await expect(simulationStart(lea)).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("allows a non-ADMIN role when the request originates from the demo route", async () => {
    await expect(simulationStart(demoLea)).resolves.toMatchObject({ status: "RUNNING" });
  });
});
