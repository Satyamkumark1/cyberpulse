import { afterAll, describe, expect, it, vi } from "vitest";
import { db, dbSchema } from "@cyberpulse/db";
import { desc, eq, inArray, notExists, and, ne } from "drizzle-orm";
import { latLngToCell } from "h3-js";
import type { MlPredictResponse } from "@cyberpulse/shared/zod/ml-predict-response";
import { NotFoundError } from "@/lib/errors";
import { currentCellRisk } from "@cyberpulse/db/queries/currentPredictions";
import { getDetail, list } from "./hotspotService";
import { predict } from "./predictionService";
import { callPredict } from "./mlClient";

// The ML service is the only stub: the database stays real (RULE-testing.md).
vi.mock("./mlClient", () => ({ callPredict: vi.fn() }));

const { hotspots, predictions, riskFactors, complaints } = dbSchema;
const ctx = { role: "LEA" as const, requestId: "test", origin: "USER" as const };

describe("hotspotService.list — architecture/api-design.md API-030", () => {
  it("returns hotspots ordered by non-increasing risk score, respecting the limit", async () => {
    const result = await list({ limit: 5 }, ctx);
    expect(result.data.length).toBeLessThanOrEqual(5);
    for (let i = 1; i < result.data.length; i++) {
      expect(result.data[i - 1]!.riskScore).toBeGreaterThanOrEqual(result.data[i]!.riskScore);
    }
  });
});

describe("hotspotService.getDetail — architecture/api-design.md API-031", () => {
  it("carries the latest prediction's reference and exposure, so the drawer can open the alert modal (AC-010-05)", async () => {
    const [latest] = await db
      .select({ h3Index: hotspots.h3Index, predictionRef: predictions.predictionRef, exposure: predictions.estimatedExposurePaise })
      .from(predictions)
      .innerJoin(hotspots, eq(hotspots.id, predictions.hotspotId))
      .orderBy(desc(predictions.createdAt))
      .limit(1);
    if (!latest) throw new Error("fixture precondition failed: no prediction — run a /predict call");

    const result = await getDetail(latest.h3Index, ctx);
    expect(result.predictionRef).toBe(latest.predictionRef);
    expect(result.estimatedExposurePaise).toBe(Number(latest.exposure));
  });

  it("returns nearby ATMs sorted by ascending distance for a real hotspot (AC-010-04)", async () => {
    // A cell with a current prediction: a bare hotspots row with none behind it is not shown.
    const cell = currentCellRisk();
    const [seeded] = await db.select({ h3Index: hotspots.h3Index }).from(cell).innerJoin(hotspots, eq(hotspots.id, cell.hotspotId)).limit(1);
    if (!seeded) throw new Error("fixture precondition failed: no predicted hotspot — run a /predict call");

    const result = await getDetail(seeded.h3Index, ctx);
    expect(new Set(result.relatedComplaints.map((c) => c.complaintId)).size).toBe(result.relatedComplaints.length);
    for (let i = 1; i < result.nearbyAtms.length; i++) {
      expect(result.nearbyAtms[i - 1]!.distance).toBeLessThanOrEqual(result.nearbyAtms[i]!.distance);
    }
  });

  it("returns NotFoundError for an unknown h3 index", async () => {
    await expect(getDetail("8f0000000000000", ctx)).rejects.toBeInstanceOf(NotFoundError);
  });
});

// Two real cells in open sea off Lakshadweep: no seeded ATM, withdrawal or
// prediction ever lands there, so the assertions see only this test's rows.
const CELL_X = latLngToCell(8.0, 73.0, 8);
const CELL_Y = latLngToCell(8.5, 73.5, 8);
const demo = { role: "LEA" as const, requestId: "test", origin: "DEMO" as const };

function mlAt(complaintId: string, h3Index: string, riskScore: number): MlPredictResponse {
  const riskLevel = riskScore >= 0.7 ? "HIGH" : riskScore >= 0.4 ? "MEDIUM" : "LOW";
  const location = { name: `Test sea cell ${h3Index}`, h3Index, lat: 8.0, lon: 73.0 };
  return {
    complaintId, riskScore, riskLevel, confidence: "HIGH",
    predictedLocation: { ...location, district: "Lakshadweep", state: "Lakshadweep" },
    expectedWindow: { start: "2026-07-01T10:00:00Z", end: "2026-07-01T12:00:00Z", confidence: "HIGH", fallback: false },
    likelyAtms: 1,
    rankedHotspots: [{ rank: 1, ...location, score: riskScore, likelyAtms: 1 }],
    factors: [{ name: "Historical Hotspot", contribution: 100, direction: "INCREASES" }],
    explanationAvailable: true, clusteringFallback: false, modelVersion: "test-model", featureSchemaVersion: "fs-1", pipelineStages: [],
  };
}

/** Open complaints with no prediction yet, so this test changes no fixture's latest analysis. */
async function unanalysedComplaints(n: number) {
  const rows = await db
    .select({ complaintId: complaints.complaintId })
    .from(complaints)
    .where(and(ne(complaints.complaintId, "C-10284"), notExists(db.select({ id: predictions.id }).from(predictions).where(eq(predictions.complaintId, complaints.id)))))
    .limit(n);
  if (rows.length < n) throw new Error("fixture precondition failed: not enough unanalysed complaints");
  return rows.map((r) => r.complaintId);
}

async function predictAt(complaintId: string, h3Index: string, riskScore: number) {
  vi.mocked(callPredict).mockResolvedValueOnce(mlAt(complaintId, h3Index, riskScore));
  await predict({ complaintId, forceRefresh: true }, demo);
}

describe("hotspotService.list — a cell's risk comes from its complaints' current predictions", () => {
  afterAll(async () => {
    const cells = await db.select({ id: hotspots.id }).from(hotspots).where(inArray(hotspots.h3Index, [CELL_X, CELL_Y]));
    const cellIds = cells.map((c) => c.id);
    if (!cellIds.length) return;
    const preds = await db.select({ id: predictions.id }).from(predictions).where(inArray(predictions.hotspotId, cellIds));
    if (preds.length) await db.delete(riskFactors).where(inArray(riskFactors.predictionId, preds.map((p) => p.id)));
    await db.delete(predictions).where(inArray(predictions.hotspotId, cellIds));
    await db.delete(hotspots).where(inArray(hotspots.id, cellIds));
  });

  it("shows the highest current prediction for a cell, not whichever was written last", async () => {
    const [first, second] = await unanalysedComplaints(2);
    await predictAt(first!, CELL_X, 0.9);
    await predictAt(second!, CELL_X, 0.5);

    const cell = (await list({ limit: 100 }, ctx)).data.find((h) => h.h3Index === CELL_X);
    expect(cell?.riskScore).toBeCloseTo(0.9, 5);
    expect(cell?.riskLevel).toBe("HIGH");
  });

  it("drops a cell once no complaint's current prediction names it", async () => {
    const [complaintId] = await unanalysedComplaints(1);
    await predictAt(complaintId!, CELL_Y, 0.8);
    await predictAt(complaintId!, CELL_X, 0.3); // refresh moves this complaint away from CELL_Y

    const cells = (await list({ limit: 100 }, ctx)).data.map((h) => h.h3Index);
    expect(cells).not.toContain(CELL_Y);
  });
});
