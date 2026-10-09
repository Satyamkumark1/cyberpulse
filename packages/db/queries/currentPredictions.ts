import { desc } from "drizzle-orm";
import { db } from "../client";
import { predictions } from "../schema";

// The single definition of "current" risk, shared by hotspotService (map,
// dashboard rail, drawer) and reportService, so they can never disagree.

/**
 * Each complaint's latest prediction. A refresh supersedes the earlier row,
 * so a cell a complaint has moved away from no longer counts for it.
 * Served by idx_pred_complaint_created (complaint_id, created_at desc).
 */
export function currentPredictions() {
  return db
    .selectDistinctOn([predictions.complaintId], {
      predictionId: predictions.id,
      complaintId: predictions.complaintId,
      hotspotId: predictions.hotspotId,
      predictionRef: predictions.predictionRef,
      riskScore: predictions.riskScore,
      riskLevel: predictions.riskLevel,
      predictedStart: predictions.predictedStart,
      predictedEnd: predictions.predictedEnd,
      likelyAtms: predictions.likelyAtms,
      estimatedExposurePaise: predictions.estimatedExposurePaise,
      createdAt: predictions.createdAt,
    })
    .from(predictions)
    .orderBy(predictions.complaintId, desc(predictions.createdAt), desc(predictions.id))
    .as("current_predictions");
}

/**
 * A cell's displayed risk: the highest of the current predictions naming it.
 * Not the `hotspots` row's own risk columns — those hold whichever prediction
 * wrote last (any complaint, possibly superseded or since reset), so they are
 * a location registry only. A cell no current prediction names is not shown.
 */
export function currentCellRisk() {
  const current = currentPredictions();
  return db
    .selectDistinctOn([current.hotspotId], {
      hotspotId: current.hotspotId,
      predictionId: current.predictionId,
      predictionRef: current.predictionRef,
      riskScore: current.riskScore,
      riskLevel: current.riskLevel,
      predictedStart: current.predictedStart,
      predictedEnd: current.predictedEnd,
      likelyAtms: current.likelyAtms,
      estimatedExposurePaise: current.estimatedExposurePaise,
    })
    .from(current)
    .orderBy(current.hotspotId, desc(current.riskScore), desc(current.createdAt), desc(current.predictionId))
    .as("cell_risk");
}

