import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db, dbSchema } from "@cyberpulse/db";
import { inArray } from "drizzle-orm";
import type { RecipientKind } from "@cyberpulse/shared/enums";
import { NotFoundError } from "@/lib/errors";
import { get, list } from "./alertService";

const { alerts, predictions } = dbSchema;

const bank = { role: "BANK" as const, requestId: "test", origin: "USER" as const };
const lea = { role: "LEA" as const, requestId: "test", origin: "USER" as const };

/**
 * Alerts addressed to each combination under test. Rows are created directly
 * rather than through `create`, because what is under test is the read scope,
 * not the dispatch path — and a direct row keeps the recipient set exact.
 */
// `alerts_alert_id_format` requires ALT- followed by at least four digits.
const ALERT_BANK = "ALT-9001";
const ALERT_SITE = "ALT-9002";
const ALERT_LEA = "ALT-9003";
const ALERT_I4C = "ALT-9004";

const CASES: Record<string, RecipientKind[]> = {
  [ALERT_BANK]: ["BANK"],
  [ALERT_SITE]: ["ATM_SITE"],
  [ALERT_LEA]: ["LEA"],
  [ALERT_I4C]: ["I4C"],
};
const ALERT_IDS = Object.keys(CASES);

beforeAll(async () => {
  const [prediction] = await db.select().from(predictions).limit(1);
  if (!prediction) throw new Error("fixture precondition failed: no prediction to attach an alert to");

  await db.delete(alerts).where(inArray(alerts.alertId, ALERT_IDS));
  for (const [alertId, recipients] of Object.entries(CASES)) {
    await db.insert(alerts).values({
      alertId,
      predictionId: prediction.id,
      severity: "MEDIUM",
      locationName: "Test cell",
      latitude: 13.0,
      longitude: 80.2,
      windowStart: prediction.predictedStart,
      windowEnd: prediction.predictedEnd,
      exposurePaise: 1000,
      recipients,
      createdByRole: "LEA",
      origin: "DEMO",
    });
  }
});

afterAll(async () => {
  await db.delete(alerts).where(inArray(alerts.alertId, ALERT_IDS));
});

describe("alertService — BANK read scope (security/authorization.md §3)", () => {
  it("shows BANK an alert addressed to BANK", async () => {
    await expect(get(ALERT_BANK, bank)).resolves.toMatchObject({ alertId: ALERT_BANK });
  });

  it("shows BANK an alert addressed only to the ATM duty post", async () => {
    // The bank operates the site and performs the cascade, so an ATM_SITE
    // alert it cannot see is an alert nobody can action.
    await expect(get(ALERT_SITE, bank)).resolves.toMatchObject({ alertId: ALERT_SITE });
  });

  it("returns 404 to BANK for an alert addressed only to LEA", async () => {
    await expect(get(ALERT_LEA, bank)).rejects.toBeInstanceOf(NotFoundError);
  });

  it("returns 404 to BANK for an alert addressed only to I4C", async () => {
    await expect(get(ALERT_I4C, bank)).rejects.toBeInstanceOf(NotFoundError);
  });

  it("shows LEA every alert regardless of recipient", async () => {
    for (const alertId of ALERT_IDS) {
      await expect(get(alertId, lea)).resolves.toMatchObject({ alertId });
    }
  });

  it("shows I4C every alert too — unscoped, same bucket as LEA/ADMIN (ADR-021)", async () => {
    const i4c = { role: "I4C" as const, requestId: "test", origin: "USER" as const };
    for (const alertId of ALERT_IDS) {
      await expect(get(alertId, i4c)).resolves.toMatchObject({ alertId });
    }
  });

  it("scopes the list predicate and its total together, not by post-filtering", async () => {
    const seen = await list({ page: 1, pageSize: 100 }, bank);
    const ids = seen.data.map((a) => a.alertId).filter((id) => ALERT_IDS.includes(id));
    expect(ids.sort()).toEqual([ALERT_BANK, ALERT_SITE].sort());

    // `total` must reflect the same predicate — a post-filter would leak the
    // out-of-scope rows through the count.
    const leaSeen = await list({ page: 1, pageSize: 100 }, lea);
    expect(leaSeen.total).toBeGreaterThan(seen.total);
  });

  it("keeps the two out-of-scope 404s indistinguishable from each other", async () => {
    const a = await get(ALERT_LEA, bank).catch((e: Error) => e);
    const b = await get(ALERT_I4C, bank).catch((e: Error) => e);
    expect((a as Error).message).toBe((b as Error).message);
    expect((a as Error).constructor).toBe((b as Error).constructor);
  });
});
