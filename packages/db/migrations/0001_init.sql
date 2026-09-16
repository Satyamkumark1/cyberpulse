CREATE TYPE "public"."account_status" AS ENUM('ACTIVE', 'DORMANT', 'FROZEN_SIMULATED', 'CLOSED');--> statement-breakpoint
CREATE TYPE "public"."account_type" AS ENUM('VICTIM', 'MULE', 'SUSPICIOUS', 'MERCHANT', 'NORMAL');--> statement-breakpoint
CREATE TYPE "public"."actor_role" AS ENUM('LEA', 'BANK', 'ADMIN');--> statement-breakpoint
CREATE TYPE "public"."alert_severity" AS ENUM('LOW', 'MEDIUM', 'HIGH');--> statement-breakpoint
CREATE TYPE "public"."alert_status" AS ENUM('DRAFT', 'SENT', 'ACKNOWLEDGED', 'CLOSED');--> statement-breakpoint
CREATE TYPE "public"."atm_status" AS ENUM('ACTIVE', 'INACTIVE', 'MAINTENANCE');--> statement-breakpoint
CREATE TYPE "public"."complaint_status" AS ENUM('OPEN', 'ANALYZING', 'UNDER_REVIEW', 'ALERT_SENT', 'MONITORING', 'RESOLVED');--> statement-breakpoint
CREATE TYPE "public"."confidence_level" AS ENUM('LOW', 'MEDIUM', 'HIGH');--> statement-breakpoint
CREATE TYPE "public"."factor_direction" AS ENUM('INCREASES', 'REDUCES');--> statement-breakpoint
CREATE TYPE "public"."fraud_type" AS ENUM('UPI_FRAUD', 'INVESTMENT_SCAM', 'PHISHING', 'JOB_SCAM', 'QR_FRAUD', 'CARD_FRAUD');--> statement-breakpoint
CREATE TYPE "public"."investigation_status" AS ENUM('NEW', 'ANALYZING', 'UNDER_REVIEW', 'ALERT_SENT', 'MONITORING', 'RESOLVED');--> statement-breakpoint
CREATE TYPE "public"."priority_level" AS ENUM('LOW', 'MEDIUM', 'HIGH');--> statement-breakpoint
CREATE TYPE "public"."recipient_kind" AS ENUM('LEA', 'BANK', 'I4C');--> statement-breakpoint
CREATE TYPE "public"."record_origin" AS ENUM('SEED', 'USER', 'DEMO');--> statement-breakpoint
CREATE TYPE "public"."risk_indicator" AS ENUM('NONE', 'LOW', 'MEDIUM', 'HIGH');--> statement-breakpoint
CREATE TYPE "public"."risk_level" AS ENUM('LOW', 'MEDIUM', 'HIGH');--> statement-breakpoint
CREATE TYPE "public"."txn_channel" AS ENUM('UPI', 'IMPS', 'NEFT', 'RTGS', 'CARD', 'ATM', 'WALLET');--> statement-breakpoint
CREATE TABLE "complaints" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"complaint_id" text NOT NULL,
	"fraud_type" "fraud_type" NOT NULL,
	"amount_paise" bigint NOT NULL,
	"complaint_timestamp" timestamp with time zone NOT NULL,
	"victim_lat" double precision NOT NULL,
	"victim_lon" double precision NOT NULL,
	"victim_h3_r8" text NOT NULL,
	"city" text NOT NULL,
	"district" text NOT NULL,
	"state" text NOT NULL,
	"status" "complaint_status" DEFAULT 'OPEN' NOT NULL,
	"origin" "record_origin" DEFAULT 'SEED' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "complaints_complaint_id_format" CHECK ("complaints"."complaint_id" ~ '^C-[0-9]{5}$'),
	CONSTRAINT "complaints_amount_positive" CHECK ("complaints"."amount_paise" > 0),
	CONSTRAINT "complaints_victim_lat_india" CHECK ("complaints"."victim_lat" BETWEEN 6.0 AND 37.5),
	CONSTRAINT "complaints_victim_lon_india" CHECK ("complaints"."victim_lon" BETWEEN 68.0 AND 97.5)
);
--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"account_type" "account_type" NOT NULL,
	"bank_name" text NOT NULL,
	"risk_score" real DEFAULT 0 NOT NULL,
	"opened_at" timestamp with time zone NOT NULL,
	"last_activity" timestamp with time zone,
	"status" "account_status" DEFAULT 'ACTIVE' NOT NULL,
	"home_h3_r8" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "accounts_account_id_format" CHECK ("accounts"."account_id" ~ '^ACC-[0-9]{8}$'),
	CONSTRAINT "accounts_risk_score_range" CHECK ("accounts"."risk_score" BETWEEN 0 AND 1)
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"transaction_id" text NOT NULL,
	"complaint_id" bigint,
	"from_account_id" bigint NOT NULL,
	"to_account_id" bigint NOT NULL,
	"amount_paise" bigint NOT NULL,
	"timestamp" timestamp with time zone NOT NULL,
	"channel" "txn_channel" NOT NULL,
	"latitude" double precision,
	"longitude" double precision,
	"h3_r8" text,
	"risk_indicator" "risk_indicator" DEFAULT 'NONE' NOT NULL,
	"hop_index" smallint DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "transactions_transaction_id_format" CHECK ("transactions"."transaction_id" ~ '^TXN-[0-9]{10}$'),
	CONSTRAINT "transactions_amount_positive" CHECK ("transactions"."amount_paise" > 0),
	CONSTRAINT "transactions_no_self_transfer" CHECK ("transactions"."from_account_id" <> "transactions"."to_account_id")
);
--> statement-breakpoint
CREATE TABLE "withdrawals" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"withdrawal_id" text NOT NULL,
	"account_id" bigint NOT NULL,
	"atm_id" bigint NOT NULL,
	"complaint_id" bigint,
	"amount_paise" bigint NOT NULL,
	"timestamp" timestamp with time zone NOT NULL,
	"h3_r8" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "withdrawals_amount_positive" CHECK ("withdrawals"."amount_paise" > 0)
);
--> statement-breakpoint
CREATE TABLE "atms" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"atm_id" text NOT NULL,
	"bank_name" text NOT NULL,
	"latitude" double precision NOT NULL,
	"longitude" double precision NOT NULL,
	"h3_r8" text NOT NULL,
	"h3_r9" text NOT NULL,
	"city" text NOT NULL,
	"district" text NOT NULL,
	"state" text NOT NULL,
	"status" "atm_status" DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "atms_atm_id_format" CHECK ("atms"."atm_id" ~ '^ATM-[0-9]{3,5}$'),
	CONSTRAINT "atms_lat_india" CHECK ("atms"."latitude" BETWEEN 6.0 AND 37.5),
	CONSTRAINT "atms_lon_india" CHECK ("atms"."longitude" BETWEEN 68.0 AND 97.5)
);
--> statement-breakpoint
CREATE TABLE "hotspots" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"h3_index" text NOT NULL,
	"name" text NOT NULL,
	"latitude" double precision NOT NULL,
	"longitude" double precision NOT NULL,
	"city" text NOT NULL,
	"district" text NOT NULL,
	"state" text NOT NULL,
	"risk_score" real NOT NULL,
	"risk_level" "risk_level" NOT NULL,
	"expected_start" timestamp with time zone,
	"expected_end" timestamp with time zone,
	"likely_atm_count" integer DEFAULT 0 NOT NULL,
	"historical_frequency" real DEFAULT 0 NOT NULL,
	"last_refreshed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hotspots_risk_score_range" CHECK ("hotspots"."risk_score" BETWEEN 0 AND 1)
);
--> statement-breakpoint
CREATE TABLE "predictions" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"prediction_ref" text NOT NULL,
	"complaint_id" bigint NOT NULL,
	"hotspot_id" bigint NOT NULL,
	"risk_score" real NOT NULL,
	"risk_level" "risk_level" NOT NULL,
	"confidence" "confidence_level" NOT NULL,
	"predicted_start" timestamp with time zone NOT NULL,
	"predicted_end" timestamp with time zone NOT NULL,
	"window_confidence" "confidence_level" NOT NULL,
	"window_fallback" boolean DEFAULT false NOT NULL,
	"likely_atms" integer DEFAULT 0 NOT NULL,
	"estimated_exposure_paise" bigint DEFAULT 0 NOT NULL,
	"ranked_hotspots" jsonb NOT NULL,
	"explanation_available" boolean DEFAULT true NOT NULL,
	"clustering_fallback" boolean DEFAULT false NOT NULL,
	"model_version" text NOT NULL,
	"feature_schema_version" text NOT NULL,
	"inference_ms" integer,
	"origin" "record_origin" DEFAULT 'USER' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "predictions_prediction_ref_format" CHECK ("predictions"."prediction_ref" ~ '^PRD-[0-9]{4,}$'),
	CONSTRAINT "predictions_risk_score_range" CHECK ("predictions"."risk_score" BETWEEN 0 AND 1),
	CONSTRAINT "predictions_window_bounds" CHECK ("predictions"."predicted_end" > "predictions"."predicted_start" AND "predictions"."predicted_end" - "predictions"."predicted_start" <= interval '4 hours')
);
--> statement-breakpoint
CREATE TABLE "risk_factors" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"prediction_id" bigint NOT NULL,
	"factor_name" text NOT NULL,
	"contribution" real NOT NULL,
	"direction" "factor_direction" NOT NULL,
	"rank" smallint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "risk_factors_contribution_range" CHECK ("risk_factors"."contribution" BETWEEN -100 AND 100)
);
--> statement-breakpoint
CREATE TABLE "alerts" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"alert_id" text NOT NULL,
	"prediction_id" bigint NOT NULL,
	"investigation_id" bigint,
	"severity" "alert_severity" NOT NULL,
	"location_name" text NOT NULL,
	"latitude" double precision NOT NULL,
	"longitude" double precision NOT NULL,
	"window_start" timestamp with time zone NOT NULL,
	"window_end" timestamp with time zone NOT NULL,
	"exposure_paise" bigint NOT NULL,
	"recipients" "recipient_kind"[] NOT NULL,
	"notes" text,
	"status" "alert_status" DEFAULT 'SENT' NOT NULL,
	"created_by_role" "actor_role" NOT NULL,
	"origin" "record_origin" DEFAULT 'USER' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"acknowledged_at" timestamp with time zone,
	"acknowledged_by_role" "actor_role",
	CONSTRAINT "alerts_alert_id_format" CHECK ("alerts"."alert_id" ~ '^ALT-[0-9]{4,}$'),
	CONSTRAINT "alerts_recipients_nonempty" CHECK (cardinality("alerts"."recipients") >= 1)
);
--> statement-breakpoint
CREATE TABLE "investigations" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"case_id" text NOT NULL,
	"complaint_id" bigint NOT NULL,
	"assigned_role" "actor_role" DEFAULT 'LEA' NOT NULL,
	"status" "investigation_status" DEFAULT 'NEW' NOT NULL,
	"priority" "priority_level" DEFAULT 'MEDIUM' NOT NULL,
	"origin" "record_origin" DEFAULT 'USER' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "investigations_case_id_format" CHECK ("investigations"."case_id" ~ '^INV-[0-9]{4,}$')
);
--> statement-breakpoint
CREATE TABLE "investigation_notes" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"investigation_id" bigint NOT NULL,
	"body" text NOT NULL,
	"author_role" "actor_role" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "investigation_notes_body_nonblank" CHECK (length(trim("investigation_notes"."body")) > 0)
);
--> statement-breakpoint
CREATE TABLE "simulation_events" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"event_ref" text NOT NULL,
	"payload" jsonb NOT NULL,
	"emitted_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "model_metrics" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"model_version" text NOT NULL,
	"trained_at" timestamp with time zone NOT NULL,
	"dataset_seed" integer NOT NULL,
	"split" text NOT NULL,
	"precision" real NOT NULL,
	"recall" real NOT NULL,
	"f1" real NOT NULL,
	"roc_auc" real NOT NULL,
	"top1_hit_rate" real NOT NULL,
	"top3_hit_rate" real NOT NULL,
	"top5_hit_rate" real NOT NULL,
	"temporal_exact" real NOT NULL,
	"temporal_within_1" real NOT NULL,
	"calibration_ece" real,
	"operating_threshold" real NOT NULL,
	"n_train" integer NOT NULL,
	"n_test" integer NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "model_metrics_split_enum" CHECK ("model_metrics"."split" IN ('holdout', 'cv'))
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"threshold_high" real DEFAULT 0.7 NOT NULL,
	"threshold_medium" real DEFAULT 0.4 NOT NULL,
	"system_mode" text DEFAULT 'PROTOTYPE' NOT NULL,
	"data_mode" text DEFAULT 'SYNTHETIC' NOT NULL,
	"active_model_version" text NOT NULL,
	"notify_toast_on_alert" boolean,
	"notify_announce_prediction" boolean,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "settings_single_row" CHECK ("settings"."id" = 1),
	CONSTRAINT "settings_threshold_order" CHECK ("settings"."threshold_high" > "settings"."threshold_medium")
);
--> statement-breakpoint
CREATE TABLE "audit_events" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"actor_role" "actor_role" NOT NULL,
	"action" text NOT NULL,
	"subject_type" text NOT NULL,
	"subject_id" bigint NOT NULL,
	"metadata" jsonb,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "analytics_events" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"event" text NOT NULL,
	"session_id" uuid NOT NULL,
	"role" "actor_role" NOT NULL,
	"route" text NOT NULL,
	"props" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"app_version" text,
	"model_version" text,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_complaint_id_complaints_id_fk" FOREIGN KEY ("complaint_id") REFERENCES "public"."complaints"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_from_account_id_accounts_id_fk" FOREIGN KEY ("from_account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_to_account_id_accounts_id_fk" FOREIGN KEY ("to_account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "withdrawals" ADD CONSTRAINT "withdrawals_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "withdrawals" ADD CONSTRAINT "withdrawals_atm_id_atms_id_fk" FOREIGN KEY ("atm_id") REFERENCES "public"."atms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "withdrawals" ADD CONSTRAINT "withdrawals_complaint_id_complaints_id_fk" FOREIGN KEY ("complaint_id") REFERENCES "public"."complaints"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "predictions" ADD CONSTRAINT "predictions_complaint_id_complaints_id_fk" FOREIGN KEY ("complaint_id") REFERENCES "public"."complaints"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "predictions" ADD CONSTRAINT "predictions_hotspot_id_hotspots_id_fk" FOREIGN KEY ("hotspot_id") REFERENCES "public"."hotspots"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "risk_factors" ADD CONSTRAINT "risk_factors_prediction_id_predictions_id_fk" FOREIGN KEY ("prediction_id") REFERENCES "public"."predictions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_prediction_id_predictions_id_fk" FOREIGN KEY ("prediction_id") REFERENCES "public"."predictions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_investigation_id_investigations_id_fk" FOREIGN KEY ("investigation_id") REFERENCES "public"."investigations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "investigations" ADD CONSTRAINT "investigations_complaint_id_complaints_id_fk" FOREIGN KEY ("complaint_id") REFERENCES "public"."complaints"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "investigation_notes" ADD CONSTRAINT "investigation_notes_investigation_id_investigations_id_fk" FOREIGN KEY ("investigation_id") REFERENCES "public"."investigations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_complaints_complaint_id" ON "complaints" USING btree ("complaint_id");--> statement-breakpoint
CREATE INDEX "idx_complaints_ts" ON "complaints" USING btree ("complaint_timestamp" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_complaints_filters" ON "complaints" USING btree ("state","fraud_type","complaint_timestamp" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_complaints_status" ON "complaints" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_complaints_city" ON "complaints" USING btree ("city");--> statement-breakpoint
CREATE INDEX "idx_complaints_h3" ON "complaints" USING btree ("victim_h3_r8");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_accounts_account_id" ON "accounts" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "idx_accounts_risk" ON "accounts" USING btree ("risk_score" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "idx_txn_transaction_id" ON "transactions" USING btree ("transaction_id");--> statement-breakpoint
CREATE INDEX "idx_txn_from_ts" ON "transactions" USING btree ("from_account_id","timestamp");--> statement-breakpoint
CREATE INDEX "idx_txn_to_ts" ON "transactions" USING btree ("to_account_id","timestamp");--> statement-breakpoint
CREATE INDEX "idx_txn_complaint" ON "transactions" USING btree ("complaint_id");--> statement-breakpoint
CREATE INDEX "idx_txn_ts" ON "transactions" USING btree ("timestamp" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_txn_risk" ON "transactions" USING btree ("risk_indicator");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_wd_withdrawal_id" ON "withdrawals" USING btree ("withdrawal_id");--> statement-breakpoint
CREATE INDEX "idx_wd_account" ON "withdrawals" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "idx_wd_atm_ts" ON "withdrawals" USING btree ("atm_id","timestamp");--> statement-breakpoint
CREATE INDEX "idx_wd_h3_ts" ON "withdrawals" USING btree ("h3_r8","timestamp");--> statement-breakpoint
CREATE INDEX "idx_wd_complaint" ON "withdrawals" USING btree ("complaint_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_atms_atm_id" ON "atms" USING btree ("atm_id");--> statement-breakpoint
CREATE INDEX "idx_atms_h3r8" ON "atms" USING btree ("h3_r8");--> statement-breakpoint
CREATE INDEX "idx_atms_h3r9" ON "atms" USING btree ("h3_r9");--> statement-breakpoint
CREATE INDEX "idx_atms_bbox" ON "atms" USING btree ("latitude","longitude");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_hotspots_h3" ON "hotspots" USING btree ("h3_index");--> statement-breakpoint
CREATE INDEX "idx_hotspots_score" ON "hotspots" USING btree ("risk_score" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "idx_pred_prediction_ref" ON "predictions" USING btree ("prediction_ref");--> statement-breakpoint
CREATE INDEX "idx_pred_complaint_created" ON "predictions" USING btree ("complaint_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "idx_rf_prediction_rank" ON "risk_factors" USING btree ("prediction_id","rank");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_alerts_alert_id" ON "alerts" USING btree ("alert_id");--> statement-breakpoint
CREATE INDEX "idx_alerts_status_created" ON "alerts" USING btree ("status","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_alerts_severity" ON "alerts" USING btree ("severity");--> statement-breakpoint
CREATE INDEX "idx_alerts_prediction" ON "alerts" USING btree ("prediction_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_inv_case_id" ON "investigations" USING btree ("case_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_inv_complaint" ON "investigations" USING btree ("complaint_id");--> statement-breakpoint
CREATE INDEX "idx_inv_status_updated" ON "investigations" USING btree ("status","updated_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_notes_inv_created" ON "investigation_notes" USING btree ("investigation_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "idx_sim_event_ref" ON "simulation_events" USING btree ("event_ref");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_metrics_version_trained" ON "model_metrics" USING btree ("model_version","trained_at");--> statement-breakpoint
CREATE INDEX "idx_metrics_version" ON "model_metrics" USING btree ("model_version","trained_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_audit_subject" ON "audit_events" USING btree ("subject_type","subject_id","occurred_at" DESC NULLS LAST);