import { sql } from "drizzle-orm";
import { bigserial, check, index, integer, pgTable, real, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

// architecture/database-design.md §4.13. `dataset_seed` is stored so any
// published metric can be traced to the exact corpus it was measured on.
// Read by GET /api/reports/metrics — a hard-coded metric fails TC-INT-011.
export const modelMetrics = pgTable(
  "model_metrics",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    modelVersion: text("model_version").notNull(),
    trainedAt: timestamp("trained_at", { withTimezone: true, mode: "string" }).notNull(),
    datasetSeed: integer("dataset_seed").notNull(),
    split: text("split").notNull(),
    precision: real("precision").notNull(),
    recall: real("recall").notNull(),
    f1: real("f1").notNull(),
    rocAuc: real("roc_auc").notNull(),
    top1HitRate: real("top1_hit_rate").notNull(),
    top3HitRate: real("top3_hit_rate").notNull(),
    top5HitRate: real("top5_hit_rate").notNull(),
    temporalExact: real("temporal_exact").notNull(),
    temporalWithin1: real("temporal_within_1").notNull(),
    calibrationEce: real("calibration_ece"),
    operatingThreshold: real("operating_threshold").notNull(),
    nTrain: integer("n_train").notNull(),
    nTest: integer("n_test").notNull(),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_metrics_version_trained").on(table.modelVersion, table.trainedAt),
    index("idx_metrics_version").on(table.modelVersion, table.trainedAt.desc()),
    check("model_metrics_split_enum", sql`${table.split} IN ('holdout', 'cv')`),
  ],
);
