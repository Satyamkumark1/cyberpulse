import { z } from "zod";
import { CoordinateSchema, type LocationResponse, type PlaceLocation } from "@/lib/location";
import { AppError } from "@/lib/errors";

const FeatureSchema = z.object({
  geometry: z.object({ type: z.literal("Point"), coordinates: z.tuple([z.number(), z.number()]) }),
  properties: z.object({
    name: z.string().optional(), street: z.string().optional(), city: z.string().optional(),
    district: z.string().optional(), county: z.string().optional(), state: z.string().optional(),
    countrycode: z.string(), postcode: z.string().optional(),
    osm_key: z.string().optional(), osm_value: z.string().optional(),
    osm_id: z.number().optional(), osm_type: z.string().optional(),
  }),
});
const ResponseSchema = z.object({ features: z.array(z.unknown()) });

export function normalizePlaces(body: unknown, reverse: boolean): PlaceLocation[] {
  return ResponseSchema.parse(body).features.flatMap((raw) => {
    const parsed = FeatureSchema.safeParse(raw);
    if (!parsed.success) return [];
    const { properties: p, geometry: { coordinates: [longitude, latitude] } } = parsed.data;
    if (p.countrycode.toUpperCase() !== "IN" || !CoordinateSchema.safeParse({ latitude, longitude }).success) return [];
    const name = p.name ?? p.street ?? p.city ?? p.district ?? "Mapped location";
    // Photon postal-area features carry the code in their name, explicitly
    // classified as place/postcode. Other place names must never become PINs.
    const postal = p.postcode ?? (p.osm_key === "place" && p.osm_value === "postcode" ? p.name : undefined);
    return [{
      id: `${p.osm_type ?? "point"}-${p.osm_id ?? `${longitude},${latitude}`}`,
      name, label: [...new Set([name, p.district, p.city, p.county, p.state].filter(Boolean))].join(", "),
      latitude, longitude, locality: p.city ?? p.district ?? null,
      district: p.district ?? p.county ?? null, state: p.state ?? null,
      postalCode: postal && /^[1-9]\d{5}$/.test(postal) ? postal : null,
      source: "OpenStreetMap / Photon" as const, matchType: reverse ? "nearby" as const : "place" as const,
    }];
  });
}

// Geographic metadata only. Prediction responses never enter this cache.
const cache = new Map<string, { expires: number; value: LocationResponse }>();
const pending = new Map<string, Promise<LocationResponse>>();
let nextRequestAt = 0;

export async function lookupLocation(input: { q: string } | { latitude: number; longitude: number }): Promise<LocationResponse> {
  const reverse = "latitude" in input;
  const postalSearch = !reverse && /^[1-9]\d{5}$/.test(input.q);
  const base = process.env.LOCATION_SERVICE_URL ?? "https://photon.komoot.io";
  const url = new URL(reverse ? "reverse" : postalSearch ? "structured" : "api", `${base.replace(/\/$/, "")}/`);
  url.searchParams.set("lang", "en");
  url.searchParams.set("limit", reverse ? "1" : "6");
  if (reverse) {
    url.searchParams.set("lat", String(input.latitude));
    url.searchParams.set("lon", String(input.longitude));
    url.searchParams.set("radius", "1");
  } else {
    url.searchParams.set(postalSearch ? "postcode" : "q", input.q);
    url.searchParams.set("countrycode", "IN");
  }
  const key = url.toString();
  const now = Date.now();
  const cached = cache.get(key);
  if (cached && cached.expires > now) return cached.value;
  const existing = pending.get(key);
  if (existing) return existing;
  // Bound public demo-provider use across all users of this process.
  // Configure a private provider/shared limiter for a multi-instance deployment.
  if (now < nextRequestAt) throw new AppError("RATE_LIMITED", "Location lookup is busy. Retry in a moment.");
  nextRequestAt = now + 1100;
  const request = (async () => { try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(8000), cache: "no-store",
      headers: { Accept: "application/json", "User-Agent": "CyberPulseAI-Prototype/0.1 (interactive location lookup)" },
    });
    if (!res.ok) throw new Error("Location provider unavailable");
    let data = normalizePlaces(await res.json(), reverse);
    // A fuzzy postcode match must not silently navigate to a different PIN.
    if (!reverse && /^[1-9]\d{5}$/.test(input.q)) data = data.filter((place) => place.postalCode === input.q);
    const value = { data, lookedUpAt: new Date().toISOString() };
    if (cache.size >= 500) cache.delete(cache.keys().next().value!);
    cache.set(key, { expires: now + 3_600_000, value });
    return value;
  } catch {
    throw new AppError("TIMEOUT", "Location lookup unavailable. Retry. The risk map is still available.");
  } finally { pending.delete(key); } })();
  pending.set(key, request);
  return request;
}
