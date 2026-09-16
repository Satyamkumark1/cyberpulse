import { sql } from "drizzle-orm";
import {
  bigint,
  bigserial,
  check,
  doublePrecision,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { complaintStatus, fraudType, recordOrigin } from "./enums";

// architecture/database-design.md §4.1. The lat/lon CHECKs are not decoration —
// they make it impossible for a generator bug or bad import to place a
// complaint outside India and silently break the map.
export const complaints = pgTable(
  "complaints",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    complaintId: text("complaint_id").notNull(),
    fraudType: fraudType("fraud_type").notNull(),
    amountPaise: bigint("amount_paise", { mode: "number" }).notNull(),
    complaintTimestamp: timestamp("complaint_timestamp", { withTimezone: true, mode: "string" }).notNull(),
    victimLat: doublePrecision("victim_lat").notNull(),
    victimLon: doublePrecision("victim_lon").notNull(),
    victimH3R8: text("victim_h3_r8").notNull(),
    city: text("city").notNull(),
    district: text("district").notNull(),
    state: text("state").notNull(),
    status: complaintStatus("status").notNull().default("OPEN"),
    origin: recordOrigin("origin").notNull().default("SEED"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_complaints_complaint_id").on(table.complaintId),
    index("idx_complaints_ts").on(table.complaintTimestamp.desc()),
    index("idx_complaints_filters").on(table.state, table.fraudType, table.complaintTimestamp.desc()),
    index("idx_complaints_status").on(table.status),
    index("idx_complaints_city").on(table.city),
    index("idx_complaints_h3").on(table.victimH3R8),
    check("complaints_complaint_id_format", sql`${table.complaintId} ~ '^C-[0-9]{5}$'`),
    check("complaints_amount_positive", sql`${table.amountPaise} > 0`),
    check("complaints_victim_lat_india", sql`${table.victimLat} BETWEEN 6.0 AND 37.5`),
    check("complaints_victim_lon_india", sql`${table.victimLon} BETWEEN 68.0 AND 97.5`),
  ],
);
