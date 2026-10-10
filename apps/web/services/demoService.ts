import { db, dbSchema } from "@cyberpulse/db";
import { and, eq, inArray, ne, notExists, or, sql } from "drizzle-orm";
import { requireAdminOrDemo, type RequestContext } from "./lib/auth";
import type { DbTransaction } from "./auditService";
import * as auditService from "./auditService";

const { alerts, complaints, investigations, predictions, notifications } = dbSchema;

export interface DemoResetCounts {
  alertsCleared: number;
  investigationsCleared: number;
  complaintsCleared: number;
}

// FEAT-17 / DEC-013: a DEMO-origin complaint (a Scam Shield citizen report) is
// cleared with everything that hangs off it, whatever those rows' own origin —
// an officer analysing it without the demo header writes USER-origin
// predictions and alerts, and leaving them would block the complaint delete.
// Seed complaints are never DEMO, so this cannot reach seed data.
function demoComplaintIds() {
  return db.select({ id: complaints.id }).from(complaints).where(eq(complaints.origin, "DEMO"));
}

function demoComplaintPredictionIds() {
  return db.select({ id: predictions.id }).from(predictions).where(inArray(predictions.complaintId, demoComplaintIds()));
}

function eligibleAlerts() {
  return or(eq(alerts.origin, "DEMO"), inArray(alerts.predictionId, demoComplaintPredictionIds()));
}

// A demo-origin investigation can still be the live case for a later,
// non-demo alert on the same complaint — `upsertForAlert` (investigationService)
// upserts by complaint, not by origin. Deleting it out from under that alert
// would leave a dangling `alerts.investigation_id` FK. A DEMO-origin alert
// referencing it is not a reason to keep it — that alert is being cleared in
// the same pass — so only a *surviving* (non-DEMO) reference makes it
// ineligible. Framed this way the predicate gives the same answer whether it
// runs before or after `alerts` is deleted, so counting and deleting agree.
// An investigation on a DEMO complaint is always eligible: every alert that
// can reference it is an alert on that complaint's predictions, cleared above.
function eligibleInvestigations() {
  return or(
    and(
      eq(investigations.origin, "DEMO"),
      notExists(
        db
          .select({ id: alerts.id })
          .from(alerts)
          .where(and(eq(alerts.investigationId, investigations.id), ne(alerts.origin, "DEMO"))),
      ),
    ),
    inArray(investigations.complaintId, demoComplaintIds()),
  );
}

async function countEligible(executor: typeof db | DbTransaction): Promise<DemoResetCounts> {
  const [[alertRow], [investigationRow], [complaintRow]] = await Promise.all([
    executor.select({ count: sql<number>`count(*)::int` }).from(alerts).where(eligibleAlerts()),
    executor.select({ count: sql<number>`count(*)::int` }).from(investigations).where(eligibleInvestigations()),
    executor.select({ count: sql<number>`count(*)::int` }).from(complaints).where(eq(complaints.origin, "DEMO")),
  ]);
  return {
    alertsCleared: alertRow!.count,
    investigationsCleared: investigationRow!.count,
    complaintsCleared: complaintRow!.count,
  };
}

/** FR-18.2 / AC-P7-07: what the reset confirmation names before the user
 * commits — never a delete. */
export async function previewReset(ctx: RequestContext): Promise<DemoResetCounts> {
  requireAdminOrDemo(ctx);
  return countEligible(db);
}

/** FR-18.1, FR-18.2 / AC-014-04, TC-SEC-042, AC-017-11. Scoped to
 * `origin = 'DEMO'` — the only guarantee seed data survives. Deletes in
 * dependency order: alerts → investigations (notes cascade) → predictions of
 * DEMO complaints (risk factors cascade) → DEMO complaints (citizen reports
 * cascade). Idempotent: a second call finds zero candidates and deletes nothing. */
export async function reset(ctx: RequestContext): Promise<DemoResetCounts> {
  requireAdminOrDemo(ctx);
  return db.transaction(async (tx) => {
    // DEC-020: notices from demo runs on seed complaints have no demo alert or
    // complaint to cascade from, so they are cleared by their own origin.
    await tx.delete(notifications).where(eq(notifications.origin, "DEMO"));
    const deletedAlerts = await tx.delete(alerts).where(eligibleAlerts()).returning({ id: alerts.id });
    const deletedInvestigations = await tx.delete(investigations).where(eligibleInvestigations()).returning({ id: investigations.id });
    await tx.delete(predictions).where(inArray(predictions.complaintId, demoComplaintIds()));
    const deletedComplaints = await tx.delete(complaints).where(eq(complaints.origin, "DEMO")).returning({ id: complaints.id });
    const counts = {
      alertsCleared: deletedAlerts.length,
      investigationsCleared: deletedInvestigations.length,
      complaintsCleared: deletedComplaints.length,
    };
    // Reset is a privileged destructive action. The event is in the same
    // transaction, so a rollback cannot leave an audit claim for a failed
    // reset and a successful reset cannot be unaudited.
    await auditService.record(tx, {
      actorRole: ctx.role,
      action: "DEMO_RESET",
      subjectType: "demo_reset",
      subjectId: 0,
      metadata: counts,
    });
    return counts;
  });
}
