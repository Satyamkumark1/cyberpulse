import { sql } from "drizzle-orm";
import { bigint, bigserial, check, index, jsonb, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { alerts } from "./alerts";
import { notificationChannel, notificationKind, notificationStatus, recipientKind, recordOrigin } from "./enums";
import { predictions } from "./predictions";

// architecture/database-design.md §4.18, DEC-020. One row per message: an
// alert dispatched to a recipient group, or an automatic HIGH-risk notice.
// Addressed to a recipient *group*, never a person — there is no phone,
// email or name column, so there is nowhere to put one. `payload` is the
// exact body that was shown (DASHBOARD) or would be POSTed (WEBHOOK, always
// SIMULATED: nothing leaves the prototype).
export const notifications = pgTable(
  "notifications",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    notificationId: text("notification_id").notNull(),
    kind: notificationKind("kind").notNull(),
    channel: notificationChannel("channel").notNull(),
    recipient: recipientKind("recipient").notNull(),
    // Cascade: a notification is a record of its alert or prediction, so the
    // demo reset that deletes those deletes it too.
    alertId: bigint("alert_id", { mode: "number" }).references(() => alerts.id, { onDelete: "cascade" }),
    predictionId: bigint("prediction_id", { mode: "number" })
      .notNull()
      .references(() => predictions.id, { onDelete: "cascade" }),
    payload: jsonb("payload").notNull(),
    status: notificationStatus("status").notNull(),
    origin: recordOrigin("origin").notNull().default("USER"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_notifications_notification_id").on(table.notificationId),
    // The header bell and the outbox: newest first for one recipient group on one channel.
    index("idx_notifications_channel_recipient_created").on(table.channel, table.recipient, table.createdAt.desc()),
    check("notifications_id_format", sql`${table.notificationId} ~ '^NTF-[0-9]{4,}$'`),
    // An alert notification names its alert; a HIGH-risk notice has none yet.
    check(
      "notifications_alert_matches_kind",
      sql`(${table.kind} = 'ALERT_DISPATCHED') = (${table.alertId} IS NOT NULL)`,
    ),
    // Webhooks are never really sent in the prototype; the dashboard always shows.
    check(
      "notifications_status_matches_channel",
      sql`(${table.channel} = 'WEBHOOK' AND ${table.status} = 'SIMULATED') OR (${table.channel} = 'DASHBOARD' AND ${table.status} = 'DELIVERED')`,
    ),
  ],
);
