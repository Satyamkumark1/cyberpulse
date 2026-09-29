import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { db, dbSchema } from "@cyberpulse/db";
import { desc, eq, sql } from "drizzle-orm";
import { ForbiddenError, ValidationError } from "@/lib/errors";
import { get, update, type UpdateSettingsInput } from "./settingsService";

const { auditEvents, settings } = dbSchema;

async function auditEventCount(): Promise<number> {
  const [row] = await db.select({ count: sql<number>`count(*)::int` }).from(auditEvents);
  return row!.count;
}

const admin = { role: "ADMIN" as const, requestId: "test", origin: "USER" as const };
const lea = { role: "LEA" as const, requestId: "test", origin: "USER" as const };
const bank = { role: "BANK" as const, requestId: "test", origin: "USER" as const };
const guard = { role: "GUARD" as const, requestId: "test", origin: "USER" as const };
const i4c = { role: "I4C" as const, requestId: "test", origin: "USER" as const };

let original: UpdateSettingsInput;
let originalRow: Awaited<ReturnType<typeof get>>;

beforeAll(async () => {
  originalRow = await get(admin);
  original = { thresholdHigh: originalRow.thresholdHigh, thresholdMedium: originalRow.thresholdMedium };
});

// The settings table is a single row (packages/db/schema/settings.ts
// `settings_single_row` CHECK) shared with every other test run against this
// database — a mutating test must put it back exactly as found. Restoring
// through a raw update (rather than settingsService.update, whose PATCH
// semantics treat `undefined` as "leave alone" and so can never restore a
// field back to NULL) guarantees the exact original row, nulls included.
afterEach(async () => {
  await db
    .update(settings)
    .set({
      thresholdHigh: originalRow.thresholdHigh,
      thresholdMedium: originalRow.thresholdMedium,
      notifyToastOnAlert: originalRow.notifyToastOnAlert,
      notifyAnnouncePrediction: originalRow.notifyAnnouncePrediction,
    })
    .where(eq(settings.id, 1));
});

describe("settingsService.get — architecture/api-design.md API-070", () => {
  it("returns the real persisted singleton row, not a fabricated default", async () => {
    const [row] = await db.select().from(settings).where(eq(settings.id, 1)).limit(1);
    if (!row) throw new Error("fixture precondition failed: settings row missing — reseed the database");

    const result = await get(lea);
    expect(result.thresholdHigh).toBe(row.thresholdHigh);
    expect(result.activeModelVersion).toBe(row.activeModelVersion);
  });

  it("every role may read settings, including GUARD and I4C (ADR-021)", async () => {
    await expect(get(lea)).resolves.toBeDefined();
    await expect(get(bank)).resolves.toBeDefined();
    await expect(get(admin)).resolves.toBeDefined();
    await expect(get(guard)).resolves.toBeDefined();
    await expect(get(i4c)).resolves.toBeDefined();
  });
});

describe("settingsService.update — TC-API-070", () => {
  it("only ADMIN may write settings; every other role is forbidden, no row changes", async () => {
    for (const role of [lea, bank, guard, i4c]) {
      await expect(update({ thresholdHigh: 0.9, thresholdMedium: 0.5 }, role)).rejects.toBeInstanceOf(ForbiddenError);
    }
    const [row] = await db.select().from(settings).where(eq(settings.id, 1)).limit(1);
    expect(row?.thresholdHigh).toBe(original.thresholdHigh);
  });

  it("rejects thresholdHigh <= thresholdMedium with a validation error naming the field, at the service layer (AC-015-03)", async () => {
    await expect(update({ thresholdHigh: 0.4, thresholdMedium: 0.4 }, admin)).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
      field: "thresholdHigh",
    });
    await expect(update({ thresholdHigh: 0.3, thresholdMedium: 0.4 }, admin)).rejects.toBeInstanceOf(ValidationError);
  });

  it("a valid ADMIN write persists the new thresholds and writes one SETTINGS_UPDATED audit event in the same transaction (AC-015-03)", async () => {
    const before = await auditEventCount();

    const updated = await update({ thresholdHigh: 0.85, thresholdMedium: 0.45 }, admin);
    expect(updated.thresholdHigh).toBe(0.85);
    expect(updated.thresholdMedium).toBe(0.45);

    const [row] = await db.select().from(settings).where(eq(settings.id, 1)).limit(1);
    expect(row?.thresholdHigh).toBe(0.85);

    const [latestAudit] = await db.select().from(auditEvents).orderBy(desc(auditEvents.occurredAt)).limit(1);
    expect(latestAudit?.action).toBe("SETTINGS_UPDATED");
    expect(latestAudit?.actorRole).toBe("ADMIN");
    expect(latestAudit?.subjectType).toBe("settings");

    expect(await auditEventCount()).toBe(before + 1);
  });

  it("persists notification preference toggles", async () => {
    const updated = await update({ ...original, notifyToastOnAlert: false, notifyAnnouncePrediction: true }, admin);
    expect(updated.notifyToastOnAlert).toBe(false);
    expect(updated.notifyAnnouncePrediction).toBe(true);
  });
});
