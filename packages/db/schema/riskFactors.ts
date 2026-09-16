import { sql } from "drizzle-orm";
import { bigint, bigserial, check, pgTable, real, smallint, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { factorDirection } from "./enums";
import { predictions } from "./predictions";

// architecture/database-design.md §4.8. Cascade delete is correct here and
// only here: a factor has no meaning without its prediction.
export const riskFactors = pgTable(
  "risk_factors",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    predictionId: bigint("prediction_id", { mode: "number" })
      .notNull()
      .references(() => predictions.id, { onDelete: "cascade" }),
    factorName: text("factor_name").notNull(),
    contribution: real("contribution").notNull(),
    direction: factorDirection("direction").notNull(),
    rank: smallint("rank").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_rf_prediction_rank").on(table.predictionId, table.rank),
    check("risk_factors_contribution_range", sql`${table.contribution} BETWEEN -100 AND 100`),
  ],
);
