import { sql } from "drizzle-orm";
import { bigint, bigserial, check, index, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { actorRole } from "./enums";
import { investigations } from "./investigations";

// architecture/database-design.md §4.11. The CHECK enforces AC-012-04's
// rejection of empty notes in the database.
export const investigationNotes = pgTable(
  "investigation_notes",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    investigationId: bigint("investigation_id", { mode: "number" })
      .notNull()
      .references(() => investigations.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    authorRole: actorRole("author_role").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_notes_inv_created").on(table.investigationId, table.createdAt.desc()),
    check("investigation_notes_body_nonblank", sql`length(trim(${table.body})) > 0`),
  ],
);
