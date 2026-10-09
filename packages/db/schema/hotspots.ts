import { sql } from "drizzle-orm";
import {
  bigserial,
  check,
  doublePrecision,
  index,
  integer,
  pgTable,
  real,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { riskLevel } from "./enums";

// architecture/database-design.md §4.6. Refreshed by the hotspot engine, not
// user-mutable.
export const hotspots = pgTable(
  "hotspots",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    h3Index: text("h3_index").notNull(),
    name: text("name").notNull(),
    latitude: doublePrecision("latitude").notNull(),
    longitude: doublePrecision("longitude").notNull(),
    city: text("city").notNull(),
    district: text("district").notNull(),
    state: text("state").notNull(),
    riskScore: real("risk_score").notNull(),
    riskLevel: riskLevel("risk_level").notNull(),
    expectedStart: timestamp("expected_start", { withTimezone: true, mode: "string" }),
    expectedEnd: timestamp("expected_end", { withTimezone: true, mode: "string" }),
    likelyAtmCount: integer("likely_atm_count").notNull().default(0),
    historicalFrequency: real("historical_frequency").notNull().default(0),
    lastRefreshedAt: timestamp("last_refreshed_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_hotspots_h3").on(table.h3Index),
    check("hotspots_risk_score_range", sql`${table.riskScore} BETWEEN 0 AND 1`),
  ],
);
