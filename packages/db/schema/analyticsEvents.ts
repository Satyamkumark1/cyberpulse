import { bigserial, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { actorRole } from "./enums";

// architecture/database-design.md §4.16. No identity column exists
// (product/product-analytics.md §6) — role, never identity; buckets, never
// raw values.
export const analyticsEvents = pgTable("analytics_events", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  event: text("event").notNull(),
  sessionId: uuid("session_id").notNull(),
  role: actorRole("role").notNull(),
  route: text("route").notNull(),
  props: jsonb("props").notNull().default({}),
  appVersion: text("app_version"),
  modelVersion: text("model_version"),
  occurredAt: timestamp("occurred_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
});
