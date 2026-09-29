import { db, dbSchema } from "@cyberpulse/db";
import { and, desc, eq, gte, lte, ne, sql, type SQL } from "drizzle-orm";
import type { FraudType } from "@cyberpulse/shared/enums";
import { DATE_SPAN_MAX_DAYS } from "@cyberpulse/shared/constants";
import { ValidationError } from "@/lib/errors";
import { requireCapability, type RequestContext } from "./lib/auth";
import { complaintScope } from "./lib/scope";

const { alerts, complaints, hotspots, modelMetrics, predictions, transactions } = dbSchema;

export interface ReportFilters {
  from?: string | undefined;
  to?: string | undefined;
  city?: string | undefined;
  state?: string | undefined;
  fraudType?: FraudType | undefined;
}

function dateRange(filters: ReportFilters): { from?: string | undefined; to?: string | undefined } {
  const from = filters.from ? new Date(`${filters.from}T00:00:00.000Z`) : undefined;
  const to = filters.to ? new Date(`${filters.to}T23:59:59.999Z`) : undefined;
  for (const [field, date] of [["from", from], ["to", to]] as const) {
    if (date && (Number.isNaN(date.valueOf()) || date.toISOString().slice(0, 10) !== filters[field])) {
      throw new ValidationError("Dates must be valid calendar dates in YYYY-MM-DD format", field);
    }
  }
  if (from && to) {
    if (from > to) throw new ValidationError("from must be before to", "from");
    if (to.valueOf() - from.valueOf() > DATE_SPAN_MAX_DAYS * 86_400_000) {
      throw new ValidationError(`Date range cannot exceed ${DATE_SPAN_MAX_DAYS} days`, "to");
    }
  }
  return { from: from?.toISOString(), to: to?.toISOString() };
}

function complaintConditions(filters: ReportFilters, ctx: RequestContext): SQL[] {
  const { from, to } = dateRange(filters);
  const conditions: SQL[] = [];
  const scope = complaintScope(ctx.role);
  if (scope) conditions.push(scope);
  if (from) conditions.push(gte(complaints.complaintTimestamp, from));
  if (to) conditions.push(lte(complaints.complaintTimestamp, to));
  if (filters.city) conditions.push(eq(complaints.city, filters.city));
  if (filters.state) conditions.push(eq(complaints.state, filters.state));
  if (filters.fraudType) conditions.push(eq(complaints.fraudType, filters.fraudType));
  return conditions;
}

function where(conditions: SQL[]) {
  return conditions.length ? and(...conditions) : undefined;
}

/** Six server-side aggregates for FEAT-13. Values are grouped in SQL, never
 * reconstructed from row data in the browser. */
export async function summary(filters: ReportFilters, ctx: RequestContext) {
  requireCapability(ctx.role, "reports:read");
  const complaintWhere = where(complaintConditions(filters, ctx));

  const [complaintsOverTime, suspiciousTransactions, alertSeverity, predictedHotspots, topDistricts, fraudTypes] = await Promise.all([
    db
      .select({ label: sql<string>`to_char(date_trunc('day', ${complaints.complaintTimestamp}), 'YYYY-MM-DD')`, value: sql<number>`count(*)::int` })
      .from(complaints)
      .where(complaintWhere)
      .groupBy(sql`date_trunc('day', ${complaints.complaintTimestamp})`)
      .orderBy(sql`date_trunc('day', ${complaints.complaintTimestamp})`),
    db
      .select({ label: sql<string>`to_char(date_trunc('day', ${transactions.timestamp}), 'YYYY-MM-DD')`, value: sql<number>`count(*)::int` })
      .from(transactions)
      .innerJoin(complaints, eq(transactions.complaintId, complaints.id))
      .where(and(complaintWhere, ne(transactions.riskIndicator, "NONE")))
      .groupBy(sql`date_trunc('day', ${transactions.timestamp})`)
      .orderBy(sql`date_trunc('day', ${transactions.timestamp})`),
    db
      .select({ label: alerts.severity, value: sql<number>`count(*)::int` })
      .from(alerts)
      .innerJoin(predictions, eq(alerts.predictionId, predictions.id))
      .innerJoin(complaints, eq(predictions.complaintId, complaints.id))
      .where(complaintWhere)
      .groupBy(alerts.severity)
      .orderBy(alerts.severity),
    db
      .select({ label: hotspots.name, value: sql<number>`max(${hotspots.riskScore})` })
      .from(predictions)
      .innerJoin(complaints, eq(predictions.complaintId, complaints.id))
      .innerJoin(hotspots, eq(predictions.hotspotId, hotspots.id))
      .where(complaintWhere)
      .groupBy(hotspots.id, hotspots.name)
      .orderBy(desc(sql`max(${hotspots.riskScore})`))
      .limit(10),
    db
      .select({ label: complaints.district, value: sql<number>`count(*)::int` })
      .from(complaints)
      .where(complaintWhere)
      .groupBy(complaints.district)
      .orderBy(desc(sql`count(*)`))
      .limit(10),
    db
      .select({ label: complaints.fraudType, value: sql<number>`count(*)::int` })
      .from(complaints)
      .where(complaintWhere)
      .groupBy(complaints.fraudType)
      .orderBy(desc(sql`count(*)`)),
  ]);

  return { complaintsOverTime, suspiciousTransactions, alertSeverity, predictedHotspots, topDistricts, fraudTypes };
}

export async function metrics(ctx: RequestContext) {
  // Was checking "reports:read" — harmless while every role's reports:read
  // and metrics:read values were identical, but GUARD is the first role
  // where they diverge (metrics:read true, reports:read false). security/
  // authorization.md already documented metrics:read as enforced here; the
  // code just never matched.
  requireCapability(ctx.role, "metrics:read");
  const [row] = await db.select().from(modelMetrics).orderBy(desc(modelMetrics.trainedAt)).limit(1);
  return row ?? null;
}

export async function filterOptions(ctx: RequestContext) {
  requireCapability(ctx.role, "reports:read");
  const scope = complaintScope(ctx.role);
  const rows = await db
    .selectDistinct({ city: complaints.city, state: complaints.state })
    .from(complaints)
    .where(scope)
    .orderBy(complaints.state, complaints.city);
  return rows;
}
