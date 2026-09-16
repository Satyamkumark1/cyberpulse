import { db, dbSchema } from "@cyberpulse/db";
import { and, gte, lte } from "drizzle-orm";
import { requireCapability, type RequestContext } from "./lib/auth";

const { atms } = dbSchema;

export interface AtmListQuery {
  bbox: { minLon: number; minLat: number; maxLon: number; maxLat: number };
  limit: number;
}

// architecture/api-design.md API-032. `bbox` is required by the schema at
// the route boundary — there is no code path here that can issue an
// unbounded ATM query (RULE-security.md §Input, TC-API-032).
export async function list(query: AtmListQuery, ctx: RequestContext) {
  requireCapability(ctx.role, "hotspots:read");

  const rows = await db
    .select()
    .from(atms)
    .where(
      and(
        gte(atms.latitude, query.bbox.minLat),
        lte(atms.latitude, query.bbox.maxLat),
        gte(atms.longitude, query.bbox.minLon),
        lte(atms.longitude, query.bbox.maxLon),
      ),
    )
    .limit(query.limit);

  return { data: rows };
}
