import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { db, dbSchema } from "@cyberpulse/db";
import { eq, inArray, sql } from "drizzle-orm";
import { ForbiddenError } from "@/lib/errors";
import { submit } from "./citizenReportService";
import { previewReset, reset } from "./demoService";

const { alerts, citizenReports, complaints, investigations, predictions } = dbSchema;

const admin = { role: "ADMIN" as const, requestId: "test", origin: "USER" as const };
const lea = { role: "LEA" as const, requestId: "test", origin: "USER" as const };
const demoLea = { role: "LEA" as const, requestId: "test", origin: "DEMO" as const };

const insertedAlertIds: number[] = [];
const insertedInvestigationIds: number[] = [];

let fixturePrediction: { id: number; complaintId: number };

beforeAll(async () => {
  // Reused read-only, exactly as transactionService.int.test.ts reuses seeded
  // fixtures — a demo-origin alert only needs a real predictionId to satisfy
  // the FK, never writes to `predictions` itself.
  const [row] = await db.select({ id: predictions.id, complaintId: predictions.complaintId }).from(predictions).limit(1);
  if (!row) throw new Error("fixture precondition failed: no seeded prediction — run train:model and a /predict call, or reseed");
  fixturePrediction = row;
});

async function insertAlert(alertId: string, origin: "USER" | "DEMO", investigationId?: number) {
  const [row] = await db
    .insert(alerts)
    .values({
      alertId,
      predictionId: fixturePrediction.id,
      investigationId: investigationId ?? null,
      severity: "HIGH",
      locationName: "Test Hotspot, Test District, Test State",
      latitude: 28.6,
      longitude: 77.2,
      windowStart: new Date().toISOString(),
      windowEnd: new Date(Date.now() + 3_600_000).toISOString(),
      exposurePaise: 100_000,
      recipients: ["LEA"],
      status: "SENT",
      createdByRole: "LEA",
      origin,
    })
    .returning();
  insertedAlertIds.push(row!.id);
  return row!;
}

async function insertInvestigation(caseId: string, origin: "USER" | "DEMO") {
  const [row] = await db
    .insert(investigations)
    .values({ caseId, complaintId: fixturePrediction.complaintId, origin })
    .returning();
  insertedInvestigationIds.push(row!.id);
  return row!;
}

// Only delete records inserted by this suite; seeded references are read-only.
afterEach(async () => {
  if (insertedAlertIds.length) await db.delete(alerts).where(inArray(alerts.id, insertedAlertIds));
  if (insertedInvestigationIds.length) await db.delete(investigations).where(inArray(investigations.id, insertedInvestigationIds));
  insertedAlertIds.length = 0;
  insertedInvestigationIds.length = 0;
});

describe("demoService.reset — architecture/api-design.md API-090", () => {
  it("clears only origin=DEMO alerts and investigations (AC-014-04, TC-SEC-042)", async () => {
    const demoInvestigation = await insertInvestigation("INV-9001", "DEMO");
    await insertAlert("ALT-9001", "DEMO", demoInvestigation.id);

    const result = await reset(admin);
    expect(result).toEqual({ alertsCleared: 1, investigationsCleared: 1, complaintsCleared: 0 });

    expect(await db.select().from(alerts).where(eq(alerts.alertId, "ALT-9001"))).toHaveLength(0);
    expect(await db.select().from(investigations).where(eq(investigations.caseId, "INV-9001"))).toHaveLength(0);
  });

  it("never deletes a USER-origin row (seed and real data survive)", async () => {
    const userInvestigation = await insertInvestigation("INV-9002", "USER");
    await insertAlert("ALT-9002", "USER", userInvestigation.id);

    const result = await reset(admin);
    expect(result).toEqual({ alertsCleared: 0, investigationsCleared: 0, complaintsCleared: 0 });

    expect(await db.select().from(alerts).where(eq(alerts.alertId, "ALT-9002"))).toHaveLength(1);
    expect(await db.select().from(investigations).where(eq(investigations.caseId, "INV-9002"))).toHaveLength(1);
  });

  it("is idempotent — a second call with nothing left to clear returns zero counts", async () => {
    const demoInvestigation = await insertInvestigation("INV-9003", "DEMO");
    await insertAlert("ALT-9003", "DEMO", demoInvestigation.id);

    await reset(admin);
    await expect(reset(admin)).resolves.toEqual({ alertsCleared: 0, investigationsCleared: 0, complaintsCleared: 0 });
  });

  it("does not delete a demo-origin investigation still referenced by a surviving USER alert (FK guard)", async () => {
    // A demo run created this investigation; a later, real (non-demo) alert
    // on the same complaint upserted the same case without changing its
    // origin (investigationService.upsertForAlert upserts by complaint, not
    // by origin) — reset must not orphan that alert's FK.
    const sharedInvestigation = await insertInvestigation("INV-9004", "DEMO");
    await insertAlert("ALT-9004", "DEMO", sharedInvestigation.id);
    await insertAlert("ALT-9014", "USER", sharedInvestigation.id);

    const result = await reset(admin);
    expect(result).toEqual({ alertsCleared: 1, investigationsCleared: 0, complaintsCleared: 0 });

    expect(await db.select().from(alerts).where(eq(alerts.alertId, "ALT-9014"))).toHaveLength(1);
    expect(await db.select().from(investigations).where(eq(investigations.caseId, "INV-9004"))).toHaveLength(1);
  });

  it("denies a non-ADMIN role outside the demo route", async () => {
    await expect(reset(lea)).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("denies GUARD and I4C too (ADR-021 — neither holds demo:reset)", async () => {
    await expect(reset({ role: "GUARD", requestId: "test", origin: "USER" })).rejects.toBeInstanceOf(ForbiddenError);
    await expect(reset({ role: "I4C", requestId: "test", origin: "USER" })).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("denies a non-ADMIN role even with a DEMO origin", async () => {
    await expect(reset(demoLea)).rejects.toBeInstanceOf(ForbiddenError);
  });
});

describe("demoService.previewReset", () => {
  it("names the exact counts reset will clear, without deleting anything (AC-P7-07)", async () => {
    const demoInvestigation = await insertInvestigation("INV-9005", "DEMO");
    await insertAlert("ALT-9005", "DEMO", demoInvestigation.id);

    const preview = await previewReset(admin);
    expect(preview).toEqual({ alertsCleared: 1, investigationsCleared: 1, complaintsCleared: 0 });

    expect(await db.select().from(alerts).where(eq(alerts.alertId, "ALT-9005"))).toHaveLength(1);
    expect(await reset(admin)).toEqual(preview);
  });
});

describe("demoService.reset — citizen complaints (FEAT-17, AC-017-11, TC-SAFE-020)", () => {
  const citizen = { role: "CITIZEN" as const, requestId: "test", origin: "DEMO" as const };

  it("clears a citizen complaint with the USER-origin prediction, alert and investigation an officer made on it, and leaves seed data alone", async () => {
    const countSeed = async () =>
      (await db.select({ n: sql<number>`count(*)::int` }).from(complaints).where(eq(complaints.origin, "SEED")))[0]!.n;
    const countPredictions = async () => (await db.select({ n: sql<number>`count(*)::int` }).from(predictions))[0]!.n;
    const seedBefore = await countSeed();
    const predictionsBefore = await countPredictions();

    const { complaintId } = await submit({ fraudType: "UPI_FRAUD", amountPaise: 500_000, city: "Delhi" }, citizen);
    const [complaint] = await db.select().from(complaints).where(eq(complaints.complaintId, complaintId));

    // What an officer analysing it without the demo header leaves behind:
    // every row USER-origin, all hanging off the DEMO complaint.
    const [template] = await db.select().from(predictions).limit(1);
    const { id, createdAt, ...copy } = template!;
    void [id, createdAt]; // a fresh row gets its own
    const [officerPrediction] = await db
      .insert(predictions)
      .values({ ...copy, predictionRef: "PRD-99001", complaintId: complaint!.id, origin: "USER" })
      .returning();
    const [officerInvestigation] = await db
      .insert(investigations)
      .values({ caseId: "INV-99001", complaintId: complaint!.id, status: "ALERT_SENT", origin: "USER" })
      .returning();
    const [officerAlert] = await db
      .insert(alerts)
      .values({
        alertId: "ALT-99001",
        predictionId: officerPrediction!.id,
        investigationId: officerInvestigation!.id,
        severity: "LOW",
        locationName: "Test cell",
        latitude: 28.6,
        longitude: 77.2,
        windowStart: officerPrediction!.predictedStart,
        windowEnd: officerPrediction!.predictedEnd,
        exposurePaise: 1000,
        recipients: ["LEA"],
        createdByRole: "LEA",
        origin: "USER",
      })
      .returning();

    await expect(previewReset(admin)).resolves.toEqual({ alertsCleared: 1, investigationsCleared: 1, complaintsCleared: 1 });
    await expect(reset(admin)).resolves.toEqual({ alertsCleared: 1, investigationsCleared: 1, complaintsCleared: 1 });

    expect(await db.select().from(complaints).where(eq(complaints.id, complaint!.id))).toHaveLength(0);
    expect(await db.select().from(citizenReports).where(eq(citizenReports.complaintId, complaint!.id))).toHaveLength(0);
    expect(await db.select().from(predictions).where(eq(predictions.id, officerPrediction!.id))).toHaveLength(0);
    expect(await db.select().from(investigations).where(eq(investigations.id, officerInvestigation!.id))).toHaveLength(0);
    expect(await db.select().from(alerts).where(eq(alerts.id, officerAlert!.id))).toHaveLength(0);
    expect(await countSeed()).toBe(seedBefore);
    expect(await countPredictions()).toBe(predictionsBefore);
  });
});
