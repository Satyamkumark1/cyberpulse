import { bigint, bigserial, index, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { actorRole } from "./enums";

// architecture/database-design.md §4.15. No update or delete path exists in
// application code. The application's database role holds INSERT and SELECT
// on this table only (.claude/rules/security.md).
export const auditEvents = pgTable(
  "audit_events",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    actorRole: actorRole("actor_role").notNull(),
    action: text("action").notNull(),
    subjectType: text("subject_type").notNull(),
    subjectId: bigint("subject_id", { mode: "number" }).notNull(),
    metadata: jsonb("metadata"),
    occurredAt: timestamp("occurred_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
  },
  (table) => [index("idx_audit_subject").on(table.subjectType, table.subjectId, table.occurredAt.desc())],
);
