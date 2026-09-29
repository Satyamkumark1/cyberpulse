import { afterEach, describe, expect, it, vi } from "vitest";
import { parseCoordinateSearch } from "@/lib/location";
import { normalizePlaces } from "./locationService";

const feature = (properties: Record<string, unknown> = {}, coordinates = [80.245382, 13.039568]) => ({
  type: "Feature", geometry: { type: "Point", coordinates },
  properties: { name: "Sir Thyagaraya Road", countrycode: "IN", city: "Chennai", state: "Tamil Nadu", postcode: "600018", ...properties },
});
const response = (...features: unknown[]) => ({ type: "FeatureCollection", features });
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.restoreAllMocks(); });

describe("geographic lookup provenance", () => {
  it("keeps longitude/latitude ordering and labels reverse results as nearby", () => {
    const [place] = normalizePlaces(response(feature()), true);
    expect(place).toMatchObject({ latitude: 13.039568, longitude: 80.245382, postalCode: "600018", matchType: "nearby" });
  });
  it("never guesses a missing or malformed PIN from a place name", () => {
    const places = normalizePlaces(response(feature({ postcode: undefined, name: "600018" }), feature({ postcode: "600018;600017" })), true);
    expect(places.map((p) => p.postalCode)).toEqual([null, null]);
  });
  it("accepts a code explicitly classified as a postal feature", () => {
    const [place] = normalizePlaces(response(feature({ postcode: undefined, name: "201301", osm_key: "place", osm_value: "postcode" })), false);
    expect(place?.postalCode).toBe("201301");
  });
  it("drops non-Indian, malformed, and out-of-bounds provider results", () => {
    expect(normalizePlaces(response(feature({ countrycode: "US" }), feature({}, [180, 90]), { broken: true }), false)).toEqual([]);
  });
  it("validates latitude-first coordinate input without accepting reversed axes", () => {
    expect(parseCoordinateSearch("13.039568, 80.245382")).toEqual({ latitude: 13.039568, longitude: 80.245382 });
    expect(parseCoordinateSearch("80.245382, 13.039568")).toBeNull();
    expect(parseCoordinateSearch("600018")).toBeNull();
    expect(parseCoordinateSearch("NaN, 80")).toBeNull();
  });
});

describe("provider request handling", () => {
  async function service() { vi.resetModules(); return import("./locationService"); }
  it("deduplicates concurrent lookups and caches only geographic results", async () => {
    const fetcher = vi.fn().mockResolvedValue(Response.json(response(feature())));
    vi.stubGlobal("fetch", fetcher);
    const { lookupLocation } = await service();
    const query = { latitude: 13.039568, longitude: 80.245382 };
    const [first, second] = await Promise.all([lookupLocation(query), lookupLocation(query)]);
    expect(first).toEqual(second);
    expect(await lookupLocation(query)).toEqual(first);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it("uses structured PIN search and excludes fuzzy mismatches", async () => {
    const fetcher = vi.fn().mockResolvedValue(Response.json(response(feature(), feature({ postcode: "600017" }))));
    vi.stubGlobal("fetch", fetcher);
    const { lookupLocation } = await service();
    const result = await lookupLocation({ q: "600018" });
    const url = fetcher.mock.calls[0]![0] as URL;
    expect(url.pathname).toBe("/structured");
    expect(url.searchParams.get("postcode")).toBe("600018");
    expect(url.searchParams.get("countrycode")).toBe("IN");
    expect(result.data).toHaveLength(1);
    expect(result.data[0]?.postalCode).toBe("600018");
  });
  it("returns no geographic values when the provider fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("unavailable", { status: 503 })));
    const { lookupLocation } = await service();
    await expect(lookupLocation({ q: "Chennai" })).rejects.toMatchObject({ code: "TIMEOUT" });
  });
  it("limits different upstream requests within one second", async () => {
    const fetcher = vi.fn().mockResolvedValue(Response.json(response(feature())));
    vi.stubGlobal("fetch", fetcher);
    const { lookupLocation } = await service();
    await lookupLocation({ q: "Chennai" });
    await expect(lookupLocation({ q: "Mumbai" })).rejects.toMatchObject({ code: "RATE_LIMITED" });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});
