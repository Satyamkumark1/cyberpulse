import { describe, expect, it } from "vitest";
import { INDIA_BOUNDS } from "@cyberpulse/shared/constants";
import { list } from "./atmService";

const ctx = { role: "LEA" as const, requestId: "test", origin: "USER" as const };

describe("atmService.list — architecture/api-design.md API-032", () => {
  it("scopes results to the given bbox (AC-P4-13)", async () => {
    const bbox = { minLon: 72, minLat: 18, maxLon: 73, maxLat: 20 }; // around Mumbai
    const result = await list({ bbox, limit: 500 }, ctx);
    for (const atm of result.data) {
      expect(atm.longitude).toBeGreaterThanOrEqual(bbox.minLon);
      expect(atm.longitude).toBeLessThanOrEqual(bbox.maxLon);
      expect(atm.latitude).toBeGreaterThanOrEqual(bbox.minLat);
      expect(atm.latitude).toBeLessThanOrEqual(bbox.maxLat);
    }
  });

  it("respects the limit even when more ATMs are in view", async () => {
    const indiaBbox = { minLon: INDIA_BOUNDS.lonMin, minLat: INDIA_BOUNDS.latMin, maxLon: INDIA_BOUNDS.lonMax, maxLat: INDIA_BOUNDS.latMax };
    const result = await list({ bbox: indiaBbox, limit: 3 }, ctx);
    expect(result.data).toHaveLength(3);
  });
});
