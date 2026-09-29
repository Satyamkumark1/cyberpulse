import { db, dbSchema } from "@cyberpulse/db";
import { and, asc, desc, eq, gte, ilike, inArray, lte, or, sql, type SQL } from "drizzle-orm";
import type { ComplaintStatus, FraudType, RiskLevel } from "@cyberpulse/shared/enums";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { requireCapability, type RequestContext } from "./lib/auth";
import { complaintScope } from "./lib/scope";

const { complaints, transactions, accounts, predictions } = dbSchema;

export interface ComplaintListQuery {
  page: number;
  pageSize: number;
  q?: string | undefined;
  fraudType?: FraudType | undefined;
  status?: ComplaintStatus | undefined;
  riskLevel?: RiskLevel | "NONE" | undefined;
  from?: string | undefined;
  to?: string | undefined;
  city?: string | undefined;
  state?: string | undefined;
  sort: "complaintTimestamp" | "amount" | "riskScore";
  order: "asc" | "desc";
}

// architecture/api-design.md API-001 §sort allow-list — a security control
// (ordering-injection), not a convenience (TC-SEC-013).
const SORT_COLUMNS = {
  complaintTimestamp: () => complaints.complaintTimestamp,
  amount: () => complaints.amountPaise,
  riskScore: (t: typeof latestPrediction) => t.riskScore,
} as const;

const latestPrediction = db
  .selectDistinctOn([predictions.complaintId], {
    complaintId: predictions.complaintId,
    riskScore: predictions.riskScore,
    riskLevel: predictions.riskLevel,
    createdAt: predictions.createdAt,
  })
  .from(predictions)
  .orderBy(predictions.complaintId, desc(predictions.createdAt))
  .as("latest_prediction");

export async function list(query: ComplaintListQuery, ctx: RequestContext) {
  requireCapability(ctx.role, "complaints:list");

  const conditions: (SQL | undefined)[] = [complaintScope(ctx.role)];
  if (query.q) {
    conditions.push(or(ilike(complaints.complaintId, `%${query.q}%`), ilike(complaints.city, `%${query.q}%`)));
  }
  if (query.fraudType) conditions.push(eq(complaints.fraudType, query.fraudType));
  if (query.status) conditions.push(eq(complaints.status, query.status));
  if (query.riskLevel) {
    conditions.push(
      query.riskLevel === "NONE"
        ? sql`${latestPrediction.riskLevel} IS NULL`
        : eq(latestPrediction.riskLevel, query.riskLevel),
    );
  }
  if (query.from) conditions.push(gte(complaints.complaintTimestamp, query.from));
  if (query.to) conditions.push(lte(complaints.complaintTimestamp, query.to));
  if (query.city) conditions.push(ilike(complaints.city, `%${query.city}%`));
  if (query.state) conditions.push(ilike(complaints.state, `%${query.state}%`));

  const where = and(...conditions.filter((c): c is SQL => c !== undefined));
  const orderColumn = SORT_COLUMNS[query.sort](latestPrediction);
  const orderFn = query.order === "asc" ? asc : desc;

  const baseQuery = db
    .select({
      complaintId: complaints.complaintId,
      fraudType: complaints.fraudType,
      amountPaise: complaints.amountPaise,
      complaintTimestamp: complaints.complaintTimestamp,
      city: complaints.city,
      district: complaints.district,
      state: complaints.state,
      status: complaints.status,
      riskLevel: latestPrediction.riskLevel,
      riskScore: latestPrediction.riskScore,
      lastPredictionAt: latestPrediction.createdAt,
    })
    .from(complaints)
    .leftJoin(latestPrediction, eq(latestPrediction.complaintId, complaints.id))
    .where(where);

  // `total` computed after the scope predicate, never after a post-filter
  // (security/authorization.md §3) — a BANK caller's count reveals nothing
  // about the wider corpus.
  const countRows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(complaints)
    .leftJoin(latestPrediction, eq(latestPrediction.complaintId, complaints.id))
    .where(where);
  const count = countRows[0]?.count ?? 0;

  const rows = await baseQuery
    .orderBy(orderFn(orderColumn))
    .limit(query.pageSize)
    .offset((query.page - 1) * query.pageSize);

  return {
    data: rows.map((r) => ({
      ...r,
      // The DB enum guarantees one of LOW/MEDIUM/HIGH or null (unanalysed);
      // the derived-subquery join loses that literal type, so it is
      // reasserted here at this validated boundary, not left as `string`.
      riskLevel: (r.riskLevel ?? "NONE") as RiskLevel | "NONE",
      riskScore: r.riskScore ?? null,
    })),
    page: query.page,
    pageSize: query.pageSize,
    total: count,
    totalPages: Math.max(1, Math.ceil(count / query.pageSize)),
  };
}

// Powers the state filter on the complaints list — distinct, scoped the same
// way as `list()` so a BANK caller can't discover states outside their scope
// through the filter options themselves.
export async function listStates(ctx: RequestContext): Promise<string[]> {
  requireCapability(ctx.role, "complaints:list");

  const conditions = [complaintScope(ctx.role)].filter((c): c is SQL => c !== undefined);
  const rows = await db
    .selectDistinct({ state: complaints.state })
    .from(complaints)
    .where(and(...conditions))
    .orderBy(asc(complaints.state));

  return rows.map((r) => r.state);
}

export async function getWithContext(complaintId: string, ctx: RequestContext) {
  requireCapability(ctx.role, "complaints:read");
  if (!/^C-\d{5}$/.test(complaintId)) {
    throw new ValidationError("complaintId must match ^C-\\d{5}$", "complaintId");
  }

  const scope = complaintScope(ctx.role);
  const where = scope ? and(eq(complaints.complaintId, complaintId), scope) : eq(complaints.complaintId, complaintId);
  const [complaint] = await db.select().from(complaints).where(where).limit(1);
  if (!complaint) throw new NotFoundError();

  const rawTransactions = await db
    .select({
      transactionId: transactions.transactionId,
      fromAccountId: transactions.fromAccountId,
      toAccountId: transactions.toAccountId,
      amountPaise: transactions.amountPaise,
      timestamp: transactions.timestamp,
      channel: transactions.channel,
      riskIndicator: transactions.riskIndicator,
      hopIndex: transactions.hopIndex,
    })
    .from(transactions)
    .where(eq(transactions.complaintId, complaint.id))
    .orderBy(asc(transactions.hopIndex))
    .limit(500);

  const involvedAccountIds = [...new Set(rawTransactions.flatMap((t) => [t.fromAccountId, t.toAccountId]))];
  const linkedAccounts = involvedAccountIds.length
    ? await db.select().from(accounts).where(inArray(accounts.id, involvedAccountIds))
    : [];
  const businessIdById = new Map(linkedAccounts.map((a) => [a.id, a.accountId]));

  // Composes only `db` (Service Layer table, architecture/low-level-design.md
  // §3) — the latest prediction is predictionService's concern, joined by
  // the caller (route handler or page), not fetched here.
  return {
    complaint,
    transactions: rawTransactions.map((t) => ({
      transactionId: t.transactionId,
      fromAccountId: businessIdById.get(t.fromAccountId) ?? String(t.fromAccountId),
      toAccountId: businessIdById.get(t.toAccountId) ?? String(t.toAccountId),
      amountPaise: t.amountPaise,
      timestamp: t.timestamp,
      channel: t.channel,
      riskIndicator: t.riskIndicator,
      hopIndex: t.hopIndex,
    })),
    linkedAccounts,
  };
}
