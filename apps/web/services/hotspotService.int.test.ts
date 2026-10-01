import { describe, expect, it } from "vitest";
import { db, dbSchema } from "@cyberpulse/db";
import { desc, eq } from "drizzle-orm";
import { NotFoundError } from "@/lib/errors";
import { getDetail, list } from "./hotspotService";

const { hotspots, predictions } = dbSchema;
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
    const [seeded] = await db.select({ h3Index: hotspots.h3Index }).from(hotspots).limit(1);
    if (!seeded) throw new Error("fixture precondition failed: no seeded hotspot to test against");

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
