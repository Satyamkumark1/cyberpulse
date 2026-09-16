import { describe, expect, it } from "vitest";
import { ValidationError } from "@/lib/errors";
import { haversineMeters, parseBbox } from "./geo";

describe("haversineMeters", () => {
  it("returns 0 for identical coordinates", () => {
    expect(haversineMeters(28.6, 77.2, 28.6, 77.2)).toBe(0);
  });

  it("returns the known great-circle distance between Delhi and Mumbai within 1%", () => {
    const meters = haversineMeters(28.6139, 77.209, 19.076, 72.8777);
    expect(meters).toBeGreaterThan(1140_000);
    expect(meters).toBeLessThan(1160_000);
  });
});

describe("parseBbox — RULE-security.md bbox clamped to India bounds", () => {
  it("parses a well-formed bbox", () => {
    expect(parseBbox("72,18,73,20")).toEqual({ minLon: 72, minLat: 18, maxLon: 73, maxLat: 20 });
  });

  it("clamps coordinates outside India's bounds rather than rejecting them", () => {
    expect(parseBbox("-10,-10,200,200")).toEqual({ minLon: 68.0, minLat: 6.0, maxLon: 97.5, maxLat: 37.5 });
  });

  it("throws ValidationError for a bbox with the wrong number of parts", () => {
    expect(() => parseBbox("72,18,73")).toThrow(ValidationError);
  });

  it("throws ValidationError when min is not less than max", () => {
    expect(() => parseBbox("73,18,72,20")).toThrow(ValidationError);
  });
});
