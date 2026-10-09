import { afterAll, describe, expect, it, vi } from "vitest";
import { db, dbSchema } from "@cyberpulse/db";
import { and, eq, gt, inArray, ne } from "drizzle-orm";
import type { MlPredictResponse } from "@cyberpulse/shared/zod/ml-predict-response";
import { predict } from "./predictionService";
import { callPredict } from "./mlClient";

// The ML service is the only stub: integration tests make no network calls
// (RULE-testing.md), and the database stays real.
vi.mock("./mlClient", () => ({ callPredict: vi.fn() }));

const { complaints, predictions, hotspots, riskFactors } = dbSchema;
const TEST_CELL = "8f2830828052d25";
const lea = { role: "LEA" as const, requestId: "test", origin: "DEMO" as const };

function mlResponse(complaintId: string, h3Index: string): MlPredictResponse {
  const location = { name: "Test Cell", h3Index, lat: 28.6, lon: 77.2 };
  return {
    complaintId,
    riskScore: 0.8,
    riskLevel: "HIGH",
    confidence: "HIGH",
    predictedLocation: { ...location, district: "New Delhi", state: "Delhi" },
    expectedWindow: { start: "2026-07-01T10:00:00Z", end: "2026-07-01T12:00:00Z", confidence: "HIGH", fallback: false },
    likelyAtms: 3,
    rankedHotspots: [{ rank: 1, ...location, score: 0.8, likelyAtms: 3 }],
    factors: [{ name: "Historical Hotspot", contribution: 100, direction: "INCREASES" }],
    explanationAvailable: true,
    clusteringFallback: false,
    modelVersion: "test-model",
    featureSchemaVersion: "fs-1",
    pipelineStages: [],
  };
}

describe("predictionService.predict — exposure (ASM-10)", () => {
  // Hotspot rows carry no origin, so demo reset never removes them: a test that
  // creates one deletes it, or it appears on the dashboard as a real cell.
  afterAll(async () => {
    const [cell] = await db.select({ id: hotspots.id }).from(hotspots).where(eq(hotspots.h3Index, TEST_CELL));
    if (!cell) return;
    const preds = await db.select({ id: predictions.id }).from(predictions).where(eq(predictions.hotspotId, cell.id));
    if (preds.length) await db.delete(riskFactors).where(inArray(riskFactors.predictionId, preds.map((p) => p.id)));
    await db.delete(predictions).where(eq(predictions.hotspotId, cell.id));
    await db.delete(hotspots).where(eq(hotspots.id, cell.id));
  });

  it("counts the complaint being predicted in its own cell's exposure, and returns what it persisted", async () => {
    const [complaint] = await db
      .select({ id: complaints.id, complaintId: complaints.complaintId, amountPaise: complaints.amountPaise })
      .from(complaints)
      .where(and(ne(complaints.status, "RESOLVED"), gt(complaints.amountPaise, 0), ne(complaints.complaintId, "C-10284")))
      .limit(1);
    if (!complaint) throw new Error("fixture precondition failed: no open complaint with an amount");

    // A cell no other complaint predicts into, so exposure is exactly this complaint's amount.
    vi.mocked(callPredict).mockResolvedValueOnce(mlResponse(complaint.complaintId, TEST_CELL));

    const { prediction } = await predict({ complaintId: complaint.complaintId, forceRefresh: true }, lea);

    expect(prediction.estimatedExposurePaise).toBe(Number(complaint.amountPaise));
    const [row] = await db
      .select({ exposure: predictions.estimatedExposurePaise })
      .from(predictions)
      .where(eq(predictions.predictionRef, prediction.predictionRef));
    expect(Number(row?.exposure)).toBe(prediction.estimatedExposurePaise);
  });
});
