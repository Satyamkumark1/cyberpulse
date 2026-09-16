import { sql } from "drizzle-orm";
import { boolean, check, integer, pgTable, real, text, timestamp } from "drizzle-orm/pg-core";

// architecture/database-design.md §4.14. Single row enforced by CHECK(id=1).
// The threshold CHECK implements AC-015-03's rejection rule at the storage
// layer — threshold changes affect level *display* only; stored risk_score
// values are never rewritten.
export const settings = pgTable(
  "settings",
  {
    id: integer("id").primaryKey().default(1),
    thresholdHigh: real("threshold_high").notNull().default(0.7),
    thresholdMedium: real("threshold_medium").notNull().default(0.4),
    systemMode: text("system_mode").notNull().default("PROTOTYPE"),
    dataMode: text("data_mode").notNull().default("SYNTHETIC"),
    activeModelVersion: text("active_model_version").notNull(),
    notifyToastOnAlert: boolean("notify_toast_on_alert"),
    notifyAnnouncePrediction: boolean("notify_announce_prediction"),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
  },
  (table) => [
    check("settings_single_row", sql`${table.id} = 1`),
    check("settings_threshold_order", sql`${table.thresholdHigh} > ${table.thresholdMedium}`),
  ],
);
