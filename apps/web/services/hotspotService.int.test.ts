import { describe, expect, it } from "vitest";
import { db, dbSchema } from "@cyberpulse/db";
import { NotFoundError } from "@/lib/errors";
import { getDetail, list } from "./hotspotService";

const { hotspots } = dbSchema;
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
