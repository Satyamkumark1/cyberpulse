-- 0008_add_notifications — additive (DEC-020).
-- One row per notification: an alert dispatched to a recipient group, or an
-- automatic HIGH-risk notice, on the DASHBOARD or WEBHOOK channel. Addressed to
-- a recipient group, never a person: no phone, email or name column. WEBHOOK
-- rows are always SIMULATED (built and recorded, never sent).
--
-- Rollback: DROP TABLE notifications; DROP TYPE notification_status,
-- notification_channel, notification_kind. A web rollback alone is safe and
-- needs nothing here: an older build never reads or writes this table.
CREATE TYPE "public"."notification_channel" AS ENUM('DASHBOARD', 'WEBHOOK');--> statement-breakpoint
CREATE TYPE "public"."notification_kind" AS ENUM('ALERT_DISPATCHED', 'HIGH_RISK_NOTICE');--> statement-breakpoint
CREATE TYPE "public"."notification_status" AS ENUM('DELIVERED', 'SIMULATED');--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"notification_id" text NOT NULL,
	"kind" "notification_kind" NOT NULL,
	"channel" "notification_channel" NOT NULL,
	"recipient" "recipient_kind" NOT NULL,
	"alert_id" bigint,
	"prediction_id" bigint NOT NULL,
	"payload" jsonb NOT NULL,
	"status" "notification_status" NOT NULL,
	"origin" "record_origin" DEFAULT 'USER' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "notifications_id_format" CHECK ("notifications"."notification_id" ~ '^NTF-[0-9]{4,}$'),
	CONSTRAINT "notifications_alert_matches_kind" CHECK (("notifications"."kind" = 'ALERT_DISPATCHED') = ("notifications"."alert_id" IS NOT NULL)),
	CONSTRAINT "notifications_status_matches_channel" CHECK (("notifications"."channel" = 'WEBHOOK' AND "notifications"."status" = 'SIMULATED') OR ("notifications"."channel" = 'DASHBOARD' AND "notifications"."status" = 'DELIVERED'))
);
--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_alert_id_alerts_id_fk" FOREIGN KEY ("alert_id") REFERENCES "public"."alerts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_prediction_id_predictions_id_fk" FOREIGN KEY ("prediction_id") REFERENCES "public"."predictions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_notifications_notification_id" ON "notifications" USING btree ("notification_id");--> statement-breakpoint
CREATE INDEX "idx_notifications_channel_recipient_created" ON "notifications" USING btree ("channel","recipient","created_at" DESC NULLS LAST);