import { sql } from "drizzle-orm";
import {
  bigint,
  bigserial,
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgTable,
  real,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { complaints } from "./complaints";
import { confidenceLevel, recordOrigin, riskLevel } from "./enums";
import { hotspots } from "./hotspots";

// architecture/database-design.md §4.7. The window CHECK enforces AC-008-02
// in the database, so no code path can persist an over-wide window.
// `ranked_hotspots` is jsonb because it is written once, read whole, and
// never queried by its elements — storing it preserves exactly what the
// model returned (NFR-26).
export const predictions = pgTable(
  "predictions",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    predictionRef: text("prediction_ref").notNull(),
    complaintId: bigint("complaint_id", { mode: "number" })
      .notNull()
      .references(() => complaints.id),
    hotspotId: bigint("hotspot_id", { mode: "number" })
      .notNull()
      .references(() => hotspots.id),
    riskScore: real("risk_score").notNull(),
    riskLevel: riskLevel("risk_level").notNull(),
    confidence: confidenceLevel("confidence").notNull(),
    predictedStart: timestamp("predicted_start", { withTimezone: true, mode: "string" }).notNull(),
    predictedEnd: timestamp("predicted_end", { withTimezone: true, mode: "string" }).notNull(),
    windowConfidence: confidenceLevel("window_confidence").notNull(),
    windowFallback: boolean("window_fallback").notNull().default(false),
    likelyAtms: integer("likely_atms").notNull().default(0),
    estimatedExposurePaise: bigint("estimated_exposure_paise", { mode: "number" }).notNull().default(0),
    rankedHotspots: jsonb("ranked_hotspots").notNull(),
    explanationAvailable: boolean("explanation_available").notNull().default(true),
    clusteringFallback: boolean("clustering_fallback").notNull().default(false),
    modelVersion: text("model_version").notNull(),
    featureSchemaVersion: text("feature_schema_version").notNull(),
    inferenceMs: integer("inference_ms"),
    origin: recordOrigin("origin").notNull().default("USER"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_pred_prediction_ref").on(table.predictionRef),
    index("idx_pred_complaint_created").on(table.complaintId, table.createdAt.desc()),
    check("predictions_prediction_ref_format", sql`${table.predictionRef} ~ '^PRD-[0-9]{4,}$'`),
    check("predictions_risk_score_range", sql`${table.riskScore} BETWEEN 0 AND 1`),
    check(
      "predictions_window_bounds",
      sql`${table.predictedEnd} > ${table.predictedStart} AND ${table.predictedEnd} - ${table.predictedStart} <= interval '4 hours'`,
    ),
  ],
);
