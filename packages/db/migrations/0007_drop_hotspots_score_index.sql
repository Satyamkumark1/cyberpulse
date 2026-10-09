-- The hotspot list, map and dashboard rail now rank cells by their current
-- predictions (queries/currentPredictions.ts), not hotspots.risk_score, so no
-- query uses this index (RULE-database: an index goes with its query).
-- Rollback: CREATE INDEX "idx_hotspots_score" ON "hotspots" USING btree ("risk_score" DESC NULLS LAST);
DROP INDEX "idx_hotspots_score";
