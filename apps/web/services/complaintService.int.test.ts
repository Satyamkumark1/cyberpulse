import { describe, expect, it } from "vitest";
import { db, dbSchema } from "@cyberpulse/db";
import { eq } from "drizzle-orm";
import { getWithContext } from "./complaintService";
import { deriveRiskLevel } from "./lib/riskLevel";

const { settings } = dbSchema;
const ctx = { role: "LEA" as const, requestId: "test", origin: "USER" as const };

describe("complaintService.getWithContext — linked accounts", () => {
  it("derives each account's risk level server-side from the settings thresholds (FR-22)", async () => {
    const [row] = await db.select().from(settings).where(eq(settings.id, 1)).limit(1);
    if (!row) throw new Error("fixture precondition failed: no settings row — run pnpm db:seed");

    // C-10284 is read-only in every test; reading it is the point here.
    const { linkedAccounts } = await getWithContext("C-10284", ctx);
    expect(linkedAccounts.length).toBeGreaterThan(0);
    for (const account of linkedAccounts) {
      expect(account.riskLevel).toBe(deriveRiskLevel(account.riskScore, { high: row.thresholdHigh, medium: row.thresholdMedium }));
    }
  });
});
