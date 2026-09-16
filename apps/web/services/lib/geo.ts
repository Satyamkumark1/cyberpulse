import { INDIA_BOUNDS } from "@cyberpulse/shared/constants";
import { ValidationError } from "@/lib/errors";

const EARTH_RADIUS_METERS = 6_371_000;

export interface Bbox {
  minLon: number;
  minLat: number;
  maxLon: number;
  maxLat: number;
}

// architecture/api-design.md API-030/032 — `bbox=minLon,minLat,maxLon,maxLat`,
// clamped to India bounds (RULE-security.md §Input: "bbox clamped to India").
// Clamping, not rejecting, out-of-range values — an evaluator panning a
// touch map slightly past the coastline should still see a result.
export function parseBbox(raw: string): Bbox {
  const parts = raw.split(",").map(Number);
  if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n))) {
    throw new ValidationError("bbox must be minLon,minLat,maxLon,maxLat", "bbox");
  }
  const [minLon, minLat, maxLon, maxLat] = parts as [number, number, number, number];
  if (minLon >= maxLon || minLat >= maxLat) {
    throw new ValidationError("bbox min must be less than max", "bbox");
  }
  const clamp = (n: number, lo: number, hi: number) => Math.min(Math.max(n, lo), hi);
  return {
    minLon: clamp(minLon, INDIA_BOUNDS.lonMin, INDIA_BOUNDS.lonMax),
    minLat: clamp(minLat, INDIA_BOUNDS.latMin, INDIA_BOUNDS.latMax),
    maxLon: clamp(maxLon, INDIA_BOUNDS.lonMin, INDIA_BOUNDS.lonMax),
    maxLat: clamp(maxLat, INDIA_BOUNDS.latMin, INDIA_BOUNDS.latMax),
  };
}

// Server-side distance computation for API payloads (e.g. `nearbyAtms[].distance`
// in API-031) — distinct from `lib/formatters.ts#formatDistanceMeters`, which
// only turns an already-computed number into display text.
export function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return EARTH_RADIUS_METERS * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
