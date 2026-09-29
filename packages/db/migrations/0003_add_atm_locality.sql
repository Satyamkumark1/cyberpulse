-- 0003_add_atm_locality — additive. Adds the locality inside a city
-- ("T Nagar" within Chennai) so a ranked hotspot is distinguishable from the
-- four other cells in the same city. Nullable by design: a web rollback to a
-- build that does not write it strands nothing.
--
-- Rollback: ALTER TABLE "atms" DROP COLUMN "locality";
ALTER TABLE "atms" ADD COLUMN "locality" text;