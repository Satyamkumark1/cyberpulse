import { sql } from "drizzle-orm";
import { bigserial, check, doublePrecision, index, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { atmStatus } from "./enums";

// architecture/database-design.md §4.5.
export const atms = pgTable(
  "atms",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    atmId: text("atm_id").notNull(),
    bankName: text("bank_name").notNull(),
    latitude: doublePrecision("latitude").notNull(),
    longitude: doublePrecision("longitude").notNull(),
    h3R8: text("h3_r8").notNull(),
    h3R9: text("h3_r9").notNull(),
    // The locality inside the city ("T Nagar" within Chennai). Nullable so the
    // column arrives additively; the generator populates it for every row.
    locality: text("locality"),
    city: text("city").notNull(),
    district: text("district").notNull(),
    state: text("state").notNull(),
    status: atmStatus("status").notNull().default("ACTIVE"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_atms_atm_id").on(table.atmId),
    index("idx_atms_h3r8").on(table.h3R8),
    index("idx_atms_h3r9").on(table.h3R9),
    index("idx_atms_bbox").on(table.latitude, table.longitude),
    check("atms_atm_id_format", sql`${table.atmId} ~ '^ATM-[0-9]{3,5}$'`),
    check("atms_lat_india", sql`${table.latitude} BETWEEN 6.0 AND 37.5`),
    check("atms_lon_india", sql`${table.longitude} BETWEEN 68.0 AND 97.5`),
  ],
);
