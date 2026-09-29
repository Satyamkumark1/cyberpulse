-- 0006_add_citizen_reports — additive (FEAT-17, ADR-022, DEC-013).
-- Adds the CITIZEN actor role, the citizen complaint ID sequence
-- (C-90000…C-99999; the seed corpus tops out at C-10284) and citizen_reports,
-- which holds only a complaint FK and a SHA-256 hash of the one-time tracking
-- code. No personal-data column.
--
-- Rollback: DROP TABLE citizen_reports; DROP SEQUENCE citizen_complaint_seq.
-- The enum value cannot be dropped in place — reverting it needs the type
-- rebuild described in 0005_add_guard_i4c_roles.sql, after migrating any
-- audit_events.actor_role row holding 'CITIZEN'. A web rollback alone is safe
-- and needs nothing here, since an older build never writes CITIZEN.
ALTER TYPE "public"."actor_role" ADD VALUE 'CITIZEN';
--> statement-breakpoint
CREATE SEQUENCE "public"."citizen_complaint_seq" INCREMENT BY 1 MINVALUE 90000 MAXVALUE 99999 START WITH 90000 CACHE 1;
--> statement-breakpoint
CREATE TABLE "citizen_reports" (
	"complaint_id" bigint PRIMARY KEY NOT NULL,
	"tracking_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "citizen_reports_tracking_hash_sha256" CHECK ("citizen_reports"."tracking_hash" ~ '^[0-9a-f]{64}$')
);
--> statement-breakpoint
ALTER TABLE "citizen_reports" ADD CONSTRAINT "citizen_reports_complaint_id_complaints_id_fk" FOREIGN KEY ("complaint_id") REFERENCES "public"."complaints"("id") ON DELETE cascade ON UPDATE no action;