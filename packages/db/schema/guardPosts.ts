import { sql } from "drizzle-orm";
import { bigint, bigserial, check, index, integer, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { atms } from "./atms";
import { recordOrigin } from "./enums";

/**
 * A staffed duty position at one ATM — a *post*, not a person.
 *
 * The schema has nowhere to put a guard's name, phone or any other personal
 * identifier, and that is deliberate: FR-01.7 and `pii_scan.py` reject those
 * shapes in the corpus, and TC-SEC-022 introspects the whole schema for them.
 * A post is an operational asset, the same way `atms` and `accounts` carry no
 * holder. Who is standing at the post during a shift is the operating bank's
 * record, never this prototype's.
 */
export const guardPosts = pgTable(
  "guard_posts",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    postId: text("post_id").notNull(),
    atmId: bigint("atm_id", { mode: "number" })
      .notNull()
      .references(() => atms.id),
    // A recurring daily shift in IST hours — the edge renders it, storage keeps
    // it as the two integers the generator produced.
    shiftStartHourIst: integer("shift_start_hour_ist").notNull(),
    shiftEndHourIst: integer("shift_end_hour_ist").notNull(),
    origin: recordOrigin("origin").notNull().default("SEED"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_guard_posts_post_id").on(table.postId),
    // Serves: the posts covering the ATMs inside a predicted hotspot cell
    // (guardPostService.listForCell).
    index("idx_guard_posts_atm_id").on(table.atmId),
    uniqueIndex("idx_guard_posts_atm_shift").on(table.atmId, table.shiftStartHourIst),
    check("guard_posts_post_id_format", sql`${table.postId} ~ '^GRD-[0-9]{5}$'`),
    check("guard_posts_shift_start_hour", sql`${table.shiftStartHourIst} BETWEEN 0 AND 23`),
    check("guard_posts_shift_end_hour", sql`${table.shiftEndHourIst} BETWEEN 0 AND 23`),
    check("guard_posts_shift_distinct", sql`${table.shiftStartHourIst} <> ${table.shiftEndHourIst}`),
  ],
);
