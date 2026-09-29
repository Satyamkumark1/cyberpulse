import { sql } from "drizzle-orm";
import { bigint, check, pgSequence, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { complaints } from "./complaints";

// architecture/database-design.md §4.17, ADR-022. A citizen report is a
// complaint plus a hash of its one-time tracking code — nothing else. No name,
// phone or contact column exists, so there is nowhere to put one.
//
// Citizen complaint IDs come from their own range. The seed corpus tops out at
// C-10284, so C-90000…C-99999 cannot collide with it; demo reset never rewinds
// the sequence, so IDs only move forward.
// ponytail: 10,000 IDs is enough for a prototype; widen the C-##### format if
// it is ever exhausted.
export const citizenComplaintSeq = pgSequence("citizen_complaint_seq", {
  startWith: 90000,
  minValue: 90000,
  maxValue: 99999,
  cycle: false,
});

export const citizenReports = pgTable(
  "citizen_reports",
  {
    complaintId: bigint("complaint_id", { mode: "number" })
      .primaryKey()
      .references(() => complaints.id, { onDelete: "cascade" }),
    trackingHash: text("tracking_hash").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
  },
  (table) => [check("citizen_reports_tracking_hash_sha256", sql`${table.trackingHash} ~ '^[0-9a-f]{64}$'`)],
);
