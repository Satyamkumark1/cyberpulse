import { sql } from "drizzle-orm";
import { bigint, bigserial, check, index, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { complaints } from "./complaints";
import { actorRole, investigationStatus, priorityLevel, recordOrigin } from "./enums";

// architecture/database-design.md §4.10. The unique constraint on
// `complaint_id` guarantees "one complaint, one case" and makes the
// alert-dispatch upsert deterministic under concurrency.
export const investigations = pgTable(
  "investigations",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    caseId: text("case_id").notNull(),
    complaintId: bigint("complaint_id", { mode: "number" })
      .notNull()
      .references(() => complaints.id),
    assignedRole: actorRole("assigned_role").notNull().default("LEA"),
    status: investigationStatus("status").notNull().default("NEW"),
    priority: priorityLevel("priority").notNull().default("MEDIUM"),
    origin: recordOrigin("origin").notNull().default("USER"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_inv_case_id").on(table.caseId),
    uniqueIndex("idx_inv_complaint").on(table.complaintId),
    index("idx_inv_status_updated").on(table.status, table.updatedAt.desc()),
    check("investigations_case_id_format", sql`${table.caseId} ~ '^INV-[0-9]{4,}$'`),
  ],
);
