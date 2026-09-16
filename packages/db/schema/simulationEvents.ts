import { bigserial, jsonb, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

// architecture/database-design.md §4.12. Deliberately isolated from
// `transactions` so a simulation can never contaminate the analysable
// corpus (FR-24.1). Truncated by simulation reset.
export const simulationEvents = pgTable(
  "simulation_events",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    eventRef: text("event_ref").notNull(),
    payload: jsonb("payload").notNull(),
    emittedAt: timestamp("emitted_at", { withTimezone: true, mode: "string" }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("idx_sim_event_ref").on(table.eventRef)],
);
