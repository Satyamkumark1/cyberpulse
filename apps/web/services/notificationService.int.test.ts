import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { db, dbSchema } from "@cyberpulse/db";
import { and, eq, gt, inArray, ne } from "drizzle-orm";
import type { MlPredictResponse } from "@cyberpulse/shared/zod/ml-predict-response";
import { ForbiddenError } from "@/lib/errors";
import { create as createAlert } from "./alertService";
import { reset } from "./demoService";
import { callPredict } from "./mlClient";
import { list } from "./notificationService";
import { predict } from "./predictionService";

// DEC-020. The ML service is the only stub; the database is real.
vi.mock("./mlClient", () => ({ callPredict: vi.fn() }));

const { complaints, hotspots, notifications, predictions, riskFactors } = dbSchema;
const TEST_CELL = "8f2830828052d26";
const ctx = (role: "LEA" | "BANK" | "I4C" | "ADMIN" | "GUARD") => ({ role, requestId: "test", origin: "DEMO" as const });

function highRiskResponse(complaintId: string): MlPredictResponse {
  const location = { name: "Notification Test Cell", h3Index: TEST_CELL, lat: 28.61, lon: 77.21 };
  return {
    complaintId,
    riskScore: 0.874,
    riskLevel: "HIGH",
    confidence: "HIGH",
    predictedLocation: { ...location, district: "New Delhi", state: "Delhi" },
    expectedWindow: { start: "2026-07-02T10:00:00Z", end: "2026-07-02T12:00:00Z", confidence: "HIGH", fallback: false },
    likelyAtms: 2,
    rankedHotspots: [{ rank: 1, ...location, score: 0.874, likelyAtms: 2 }],
    factors: [{ name: "Historical Hotspot", contribution: 100, direction: "INCREASES" }],
    explanationAvailable: true,
    clusteringFallback: false,
    modelVersion: "test-model",
    featureSchemaVersion: "fs-1",
    pipelineStages: [],
  };
}

let predictionRef = "";
let predictionRowId = 0;
let alertId = "";

const rowsFor = (predictionId: number) => db.select().from(notifications).where(eq(notifications.predictionId, predictionId));

beforeAll(async () => {
  const [complaint] = await db
    .select({ complaintId: complaints.complaintId })
    .from(complaints)
    .where(and(ne(complaints.status, "RESOLVED"), gt(complaints.amountPaise, 0), ne(complaints.complaintId, "C-10284")))
    .limit(1);
  if (!complaint) throw new Error("fixture precondition failed: no open complaint");

  vi.mocked(callPredict).mockResolvedValueOnce(highRiskResponse(complaint.complaintId));
  const { prediction } = await predict({ complaintId: complaint.complaintId, forceRefresh: true }, ctx("LEA"));
  predictionRef = prediction.predictionRef;
  const [row] = await db.select({ id: predictions.id }).from(predictions).where(eq(predictions.predictionRef, predictionRef));
  predictionRowId = row!.id;

  ({ alertId } = await createAlert({ predictionRef, recipients: ["BANK", "LEA"] }, ctx("LEA")));
});

// Hotspot rows carry no origin, so demo reset never removes them.
afterAll(async () => {
  const [cell] = await db.select({ id: hotspots.id }).from(hotspots).where(eq(hotspots.h3Index, TEST_CELL));
  if (!cell) return;
  const preds = await db.select({ id: predictions.id }).from(predictions).where(eq(predictions.hotspotId, cell.id));
  if (preds.length) await db.delete(riskFactors).where(inArray(riskFactors.predictionId, preds.map((p) => p.id)));
  await db.delete(predictions).where(eq(predictions.hotspotId, cell.id));
  await db.delete(hotspots).where(eq(hotspots.id, cell.id));
});

describe("notifications — automatic HIGH-risk notice (DEC-020)", () => {
  it("notifies LEA and I4C on the dashboard and the simulated webhook when a forecast is HIGH", async () => {
    const notices = (await rowsFor(predictionRowId)).filter((n) => n.kind === "HIGH_RISK_NOTICE");

    expect(notices.map((n) => `${n.recipient}/${n.channel}/${n.status}`).sort()).toEqual([
      "I4C/DASHBOARD/DELIVERED", "I4C/WEBHOOK/SIMULATED", "LEA/DASHBOARD/DELIVERED", "LEA/WEBHOOK/SIMULATED",
    ]);
  });

  it("carries the persisted prediction's own figures", async () => {
    const [persisted] = await db.select().from(predictions).where(eq(predictions.id, predictionRowId));
    const [notice] = (await rowsFor(predictionRowId)).filter((n) => n.kind === "HIGH_RISK_NOTICE");

    expect(notice!.payload).toMatchObject({
      predictionRef,
      riskScore: persisted!.riskScore,
      riskLevel: persisted!.riskLevel,
      window: { start: persisted!.predictedStart, end: persisted!.predictedEnd },
      estimatedExposurePaise: persisted!.estimatedExposurePaise,
    });
  });
});

describe("notifications — alert dispatch (DEC-020)", () => {
  it("writes a dashboard and a simulated webhook message per recipient, linked to the alert", async () => {
    const forAlert = (await rowsFor(predictionRowId)).filter((n) => n.kind === "ALERT_DISPATCHED");

    expect(forAlert.map((n) => `${n.recipient}/${n.channel}`).sort()).toEqual([
      "BANK/DASHBOARD", "BANK/WEBHOOK", "LEA/DASHBOARD", "LEA/WEBHOOK",
    ]);
    expect(forAlert.every((n) => (n.payload as { alertId: string }).alertId === alertId)).toBe(true);
  });
});

describe("notifications — who sees what (DEC-020)", () => {
  const ids = async (role: "LEA" | "BANK" | "I4C" | "ADMIN") =>
    (await list({ channel: "DASHBOARD", limit: 50 }, ctx(role))).data.filter((n) => n.payload.predictionRef === predictionRef).map((n) => `${n.kind}/${n.recipient}`);

  it("shows BANK its alert but not the HIGH-risk notice", async () => {
    expect((await ids("BANK")).sort()).toEqual(["ALERT_DISPATCHED/BANK"]);
  });

  it("shows LEA the notice and its alert", async () => {
    expect((await ids("LEA")).sort()).toEqual(["ALERT_DISPATCHED/LEA", "HIGH_RISK_NOTICE/LEA"]);
  });

  it("shows I4C the notice only", async () => {
    expect(await ids("I4C")).toEqual(["HIGH_RISK_NOTICE/I4C"]);
  });

  it("refuses GUARD, which cannot read alerts", async () => {
    await expect(list({ channel: "DASHBOARD", limit: 20 }, ctx("GUARD"))).rejects.toThrow(ForbiddenError);
  });
});

describe("notifications — demo reset (DEC-020)", () => {
  it("clears every demo notification", async () => {
    await reset(ctx("ADMIN"));

    expect(await rowsFor(predictionRowId)).toEqual([]);
  });
});
