import { db, dbSchema } from "@cyberpulse/db";
import { eq, inArray, sql, type SQL } from "drizzle-orm";
import type { ActorRole } from "@cyberpulse/shared/enums";

const { complaints, transactions, predictions, alerts } = dbSchema;

/**
 * Stage 2 of two (security/authorization.md §3). A BANK caller may act on a
 * complaint only if it is reachable from an alert addressed to BANK. LEA and
 * ADMIN are unscoped in v1.0 — a documented limitation, not a design goal.
 *
 * Returned as a query predicate, composed into the caller's WHERE clause —
 * never applied as a post-filter, which would still run the unscoped query
 * and leak through `total` and through timing (TC-SEC-012).
 */
export function complaintScope(role: ActorRole): SQL | undefined {
  if (role !== "BANK") return undefined;

  return inArray(
    complaints.id,
    db
      .select({ id: predictions.complaintId })
      .from(alerts)
      .innerJoin(predictions, eq(alerts.predictionId, predictions.id))
      .where(sql`'BANK' = ANY(${alerts.recipients})`),
  );
}

/** Same rule as {@link complaintScope}, applied via `transactions.complaint_id`
 * — a transaction is in scope for BANK exactly when its complaint is. */
export function transactionScope(role: ActorRole): SQL | undefined {
  if (role !== "BANK") return undefined;

  return inArray(
    transactions.complaintId,
    db
      .select({ id: predictions.complaintId })
      .from(alerts)
      .innerJoin(predictions, eq(alerts.predictionId, predictions.id))
      .where(sql`'BANK' = ANY(${alerts.recipients})`),
  );
}
