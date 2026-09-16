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
import { actorRole, alertSeverity, alertStatus, recipientKind, recordOrigin } from "./enums";
import { investigations } from "./investigations";
import { predictions } from "./predictions";

// architecture/database-design.md §4.9. The `array_length >= 1` check
// enforces AC-011-03 at the storage layer, not only in validation.
export const alerts = pgTable(
  "alerts",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    alertId: text("alert_id").notNull(),
    predictionId: bigint("prediction_id", { mode: "number" })
      .notNull()
      .references(() => predictions.id),
    investigationId: bigint("investigation_id", { mode: "number" }).references(() => investigations.id),
    severity: alertSeverity("severity").notNull(),
    locationName: text("location_name").notNull(),
    latitude: doublePrecision("latitude").notNull(),
    longitude: doublePrecision("longitude").notNull(),
    windowStart: timestamp("window_start", { withTimezone: true, mode: "string" }).notNull(),
    windowEnd: timestamp("window_end", { withTimezone: true, mode: "string" }).notNull(),
    exposurePaise: bigint("exposure_paise", { mode: "number" }).notNull(),
    recipients: recipientKind("recipients").array().notNull(),
    notes: text("notes"),
    status: alertStatus("status").notNull().default("SENT"),
    createdByRole: actorRole("created_by_role").notNull(),
    origin: recordOrigin("origin").notNull().default("USER"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
    acknowledgedAt: timestamp("acknowledged_at", { withTimezone: true, mode: "string" }),
    acknowledgedByRole: actorRole("acknowledged_by_role"),
  },
  (table) => [
    uniqueIndex("idx_alerts_alert_id").on(table.alertId),
    index("idx_alerts_status_created").on(table.status, table.createdAt.desc()),
    index("idx_alerts_severity").on(table.severity),
    index("idx_alerts_prediction").on(table.predictionId),
    check("alerts_alert_id_format", sql`${table.alertId} ~ '^ALT-[0-9]{4,}$'`),
    // cardinality(), not array_length(): array_length() returns NULL (not 0)
    // for an empty array, and a CHECK treats NULL as passing — TC-P2-02 caught
    // this letting an alert with zero recipients through.
    check("alerts_recipients_nonempty", sql`cardinality(${table.recipients}) >= 1`),
  ],
);
