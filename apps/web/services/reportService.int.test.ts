import { describe, expect, it } from "vitest";
import { db, dbSchema } from "@cyberpulse/db";
import { desc, sql } from "drizzle-orm";
import { ForbiddenError, ValidationError } from "@/lib/errors";
import { metrics, summary } from "./reportService";

const { complaints, modelMetrics } = dbSchema;

const lea = { role: "LEA" as const, requestId: "test", origin: "USER" as const };
const bank = { role: "BANK" as const, requestId: "test", origin: "USER" as const };

function sum(series: { value: number }[]): number {
  return series.reduce((total, row) => total + row.value, 0);
}

describe("reportService.summary — architecture/api-design.md API-060", () => {
  it("returns all six named series shaped as { label, value } arrays", async () => {
    const result = await summary({}, lea);
    for (const key of ["complaintsOverTime", "suspiciousTransactions", "alertSeverity", "predictedHotspots", "topDistricts", "fraudTypes"] as const) {
      expect(Array.isArray(result[key])).toBe(true);
    }
  });

  it("fraudTypes series totals every seeded complaint when unfiltered (AC-013-01 — no client-side literal series)", async () => {
    const [row] = await db.select({ count: sql<number>`count(*)::int` }).from(complaints);
    const result = await summary({}, lea);
    expect(sum(result.fraudTypes)).toBe(row!.count);
    expect(sum(result.complaintsOverTime)).toBe(row!.count);
  });

  it("applies a fraudType filter server-side (AC-013-02)", async () => {
    const result = await summary({ fraudType: "UPI_FRAUD" }, lea);
    expect(result.fraudTypes.every((row) => row.label === "UPI_FRAUD")).toBe(true);
    const [row] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(complaints)
      .where(sql`${complaints.fraudType} = 'UPI_FRAUD'`);
    expect(sum(result.fraudTypes)).toBe(row!.count);
  });

  it("applies a city filter server-side and narrows the result relative to the unfiltered total", async () => {
    const [top] = await db
      .select({ city: complaints.city, count: sql<number>`count(*)::int` })
      .from(complaints)
      .groupBy(complaints.city)
      .orderBy(desc(sql`count(*)`))
      .limit(1);
    if (!top) throw new Error("fixture precondition failed: no seeded complaints to group by city");

    const filtered = await summary({ city: top.city }, lea);
    const unfiltered = await summary({}, lea);
    expect(sum(filtered.fraudTypes)).toBe(top.count);
    expect(sum(filtered.fraudTypes)).toBeLessThan(sum(unfiltered.fraudTypes));
  });

  it("an empty result set renders an empty series, not an error, for a filter matching nothing (AC-013-02)", async () => {
    const result = await summary({ city: "Nonexistent City ZZZ" }, lea);
    expect(result.fraudTypes).toEqual([]);
    expect(result.complaintsOverTime).toEqual([]);
  });

  it("rejects a date span above the 365-day cap on the `to` field (AC-013-02 range cap)", async () => {
    await expect(summary({ from: "2026-01-01", to: "2027-01-05" }, lea)).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
      field: "to",
    });
  });

  it("accepts a date span within the 365-day cap", async () => {
    // `to` is inclusive of its whole day (T23:59:59.999Z), so 2026-01-01 ..
    // 2026-12-31 spans just under 365 days end to end — the widest span
    // 2026 (not a leap year) can express without exceeding the cap.
    await expect(summary({ from: "2026-01-01", to: "2026-12-31" }, lea)).resolves.toBeDefined();
  });

  it("rejects from after to", async () => {
    await expect(summary({ from: "2026-09-01", to: "2026-01-01" }, lea)).rejects.toBeInstanceOf(ValidationError);
  });

  it("BANK sees an empty aggregate rather than an error when it is scoped out of every complaint (security/authorization.md §3)", async () => {
    // This corpus seeds no alerts, so no complaint is reachable by a BANK
    // scope predicate — scoped-and-absent looks identical to the caller.
    const result = await summary({}, bank);
    expect(result.fraudTypes).toEqual([]);
  });

  it("denies GUARD, which lacks reports:read (ADR-021)", async () => {
    await expect(summary({}, { role: "GUARD", requestId: "test", origin: "USER" })).rejects.toBeInstanceOf(ForbiddenError);
  });
});

describe("reportService.metrics — architecture/api-design.md API-061", () => {
  it("reads the most recently trained row from model_metrics, never a hard-coded value (TC-INT-011)", async () => {
    const [expected] = await db.select().from(modelMetrics).orderBy(desc(modelMetrics.trainedAt)).limit(1);
    if (!expected) throw new Error("fixture precondition failed: model_metrics is empty — run evaluate.py");

    const result = await metrics(lea);
    expect(result).not.toBeNull();
    expect(result?.modelVersion).toBe(expected.modelVersion);
    expect(result?.trainedAt).toBe(expected.trainedAt);
    expect(result?.precision).toBe(expected.precision);
  });

  it("allows GUARD, which holds metrics:read despite lacking reports:read — the bug this proves fixed", async () => {
    // metrics() previously checked "reports:read", which happened to be
    // harmless while every role's reports:read and metrics:read values were
    // identical. GUARD is the first role where they diverge (metrics:read
    // true, reports:read false) — this fails if the check regresses to
    // "reports:read" (GUARD would then be forbidden).
    const guardResult = await metrics({ role: "GUARD", requestId: "test", origin: "USER" });
    const leaResult = await metrics(lea);
    expect(guardResult).toEqual(leaResult);
  });
});

