import { z } from "zod";
import { INDIA_BOUNDS } from "@cyberpulse/shared/constants";

export const CoordinateSchema = z.object({
  latitude: z.number().finite().min(INDIA_BOUNDS.latMin).max(INDIA_BOUNDS.latMax),
  longitude: z.number().finite().min(INDIA_BOUNDS.lonMin).max(INDIA_BOUNDS.lonMax),
});

export interface PlaceLocation {
  id: string;
  name: string;
  label: string;
  latitude: number;
  longitude: number;
  locality: string | null;
  district: string | null;
  state: string | null;
  postalCode: string | null;
  source: "OpenStreetMap / Photon";
  matchType: "place" | "nearby";
}

export interface LocationResponse {
  data: PlaceLocation[];
  lookedUpAt: string;
}

// The search field accepts latitude first, while GeoJSON uses longitude first.
export function parseCoordinateSearch(value: string) {
  const match = value.trim().match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/);
  if (!match) return null;
  const result = CoordinateSchema.safeParse({ latitude: Number(match[1]), longitude: Number(match[2]) });
  return result.success ? result.data : null;
}
