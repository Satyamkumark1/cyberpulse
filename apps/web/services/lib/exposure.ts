import { db, dbSchema } from "@cyberpulse/db";
import { and, eq, gte, lte, ne, sql } from "drizzle-orm";

const { complaints, predictions, hotspots } = dbSchema;

export const HORIZON_HOURS = 24;

/**
 * Pure predicate for ASM-10 / TC-UNIT-020.
 */
export function isEligibleForExposure(
  complaint: { status: string; complaintTimestamp: string },
  referenceTimestamp: string,
): boolean {
  if (complaint.status === "RESOLVED") return false;
  const refTime = new Date(referenceTimestamp).getTime();
  const cTime = new Date(complaint.complaintTimestamp).getTime();
  const horizonMs = HORIZON_HOURS * 3600_000;
  return cTime >= refTime - horizonMs && cTime <= refTime + horizonMs;
}

/**
 * ASM-10 / architecture/low-level-design.md §3.1. Defined once so the API
 * and the alert modal can never disagree:
 *
 *   exposure_paise = Σ amount_paise of complaints C where
 *     C is linked to the predicted hotspot cell (via C's latest prediction)
 *     AND C.status NOT IN ('RESOLVED')
 *     AND C.complaint_timestamp within the prediction's 24-hour horizon
 */
//
// Pass the transaction that just wrote the new prediction: "latest
// prediction" must include it, or the complaint being predicted is missing
// from its own cell's exposure (it read 0 on every first prediction).
export async function computeExposurePaise(
  hotspotH3Index: string,
  referenceTimestamp: string,
  executor: Pick<typeof db, "select" | "selectDistinctOn"> = db,
): Promise<number> {
  const horizonStart = new Date(new Date(referenceTimestamp).getTime() - HORIZON_HOURS * 3600_000).toISOString();
  const horizonEnd = new Date(new Date(referenceTimestamp).getTime() + HORIZON_HOURS * 3600_000).toISOString();

  const latestPredictionPerComplaint = executor
    .selectDistinctOn([predictions.complaintId], {
      complaintId: predictions.complaintId,
      hotspotId: predictions.hotspotId,
    })
    .from(predictions)
    .orderBy(predictions.complaintId, sql`${predictions.createdAt} desc`)
    .as("latest_prediction_for_exposure");

  const rows = await executor
    .select({ total: sql<number>`coalesce(sum(${complaints.amountPaise}), 0)::bigint` })
    .from(complaints)
    .innerJoin(latestPredictionPerComplaint, eq(latestPredictionPerComplaint.complaintId, complaints.id))
    .innerJoin(hotspots, eq(hotspots.id, latestPredictionPerComplaint.hotspotId))
    .where(
      and(
        eq(hotspots.h3Index, hotspotH3Index),
        ne(complaints.status, "RESOLVED"),
        gte(complaints.complaintTimestamp, horizonStart),
        lte(complaints.complaintTimestamp, horizonEnd),
      ),
    );

  return Number(rows[0]?.total ?? 0);
}
