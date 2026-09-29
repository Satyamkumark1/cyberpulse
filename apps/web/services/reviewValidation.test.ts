import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@cyberpulse/db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@cyberpulse/db")>();
  return { ...actual, db: { transaction: vi.fn(), select: vi.fn() } };
});

import { db } from "@cyberpulse/db";
import { update } from "./settingsService";
import { summary } from "./reportService";
import { previewReset, reset } from "./demoService";

const admin = { role: "ADMIN", requestId: "test", origin: "USER" } as const;
beforeEach(() => vi.clearAllMocks());

describe("service validation before database access", () => {
  it.each(["from", "to"] as const)("rejects invalid calendar dates on %s", async (field) => {
    for (const value of ["2026-02-31", "2026-02-29", "2026-04-31", "abc", "2026-13-01"]) {
      await expect(summary({ [field]: value }, admin)).rejects.toMatchObject({ code: "VALIDATION_ERROR", field });
    }
    expect(db.select).not.toHaveBeenCalled();
  });

  it.each(["thresholdHigh", "thresholdMedium"] as const)("rejects out-of-range and non-finite %s", async (field) => {
    for (const value of [-0.1, 1.1, NaN, Infinity, -Infinity]) {
      await expect(update({ thresholdHigh: 0.7, thresholdMedium: 0.4, [field]: value }, admin))
        .rejects.toMatchObject({ code: "VALIDATION_ERROR", field });
    }
    expect(db.transaction).not.toHaveBeenCalled();
  });

  it("preserves ordering validation", async () => {
    await expect(update({ thresholdHigh: 0.4, thresholdMedium: 0.4 }, admin))
      .rejects.toMatchObject({ code: "VALIDATION_ERROR", field: "thresholdHigh" });
    expect(db.transaction).not.toHaveBeenCalled();
  });

  it.each(["LEA", "BANK"] as const)("denies %s reset and preview despite a DEMO origin", async (role) => {
    const ctx = { ...admin, role, origin: "DEMO" } as const;
    await expect(reset(ctx)).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(previewReset(ctx)).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(db.transaction).not.toHaveBeenCalled();
    expect(db.select).not.toHaveBeenCalled();
  });
});

vi.mock("./auditService", () => ({ record: vi.fn() }));
import * as auditService from "./auditService";
import type { DbTransaction } from "./auditService";
import { upsertForAlert } from "./investigationService";

describe("transaction results", () => {
  it("reports the rows actually deleted by reset", async () => {
    const returning = vi
      .fn()
      .mockResolvedValueOnce([{ id: 1 }, { id: 2 }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: 3 }]);
    const tx = { delete: vi.fn(() => ({ where: vi.fn(() => ({ returning })) })) };
    vi.mocked(db.select).mockReturnValue({ from: () => ({ where: () => ({}) }) } as never);
    vi.mocked(db.transaction).mockImplementation(async (callback) => callback(tx as unknown as DbTransaction));
    await expect(reset(admin)).resolves.toEqual({ alertsCleared: 2, investigationsCleared: 0, complaintsCleared: 1 });
    // alerts, investigations and complaints report counts; the predictions
    // delete between them does not.
    expect(returning).toHaveBeenCalledTimes(3);
  });

  it.each([true, false])("audits creation only when the insert succeeds (%s)", async (created) => {
    const row = { id: 42, caseId: "INV-0042" };
    const limit = vi.fn().mockResolvedValueOnce([]).mockResolvedValueOnce(created ? [{ complaintId: "C-10284" }] : [row]);
    const tx = {
      select: () => ({ from: () => ({ where: () => ({ limit }) }) }),
      insert: () => ({ values: () => ({ onConflictDoNothing: () => ({ returning: async () => created ? [row] : [] }) }) }),
      update: () => ({ set: () => ({ where: () => ({ returning: async () => [row] }) }) }),
    };
    await expect(upsertForAlert(tx as unknown as DbTransaction, 10, 20, admin)).resolves.toEqual(row);
    if (created) {
      expect(auditService.record).toHaveBeenCalledExactlyOnceWith(tx, {
        actorRole: "ADMIN", action: "INVESTIGATION_CREATED", subjectType: "investigation",
        subjectId: 42, metadata: { complaintId: "C-10284" },
      });
    } else {
      expect(auditService.record).not.toHaveBeenCalled();
    }
  });
});
