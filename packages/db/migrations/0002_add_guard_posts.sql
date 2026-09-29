-- 0002_add_guard_posts — additive. Creates `guard_posts`: staffed duty
-- positions at ATMs, carrying no personal identifier by design (FR-01.7,
-- TC-SEC-022).
--
-- Rollback: DROP TABLE "guard_posts"; — safe in isolation. Nothing references
-- it, so a web rollback to a build that does not know the table strands
-- nothing; the table simply goes unread.
CREATE TABLE "guard_posts" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"post_id" text NOT NULL,
	"atm_id" bigint NOT NULL,
	"shift_start_hour_ist" integer NOT NULL,
	"shift_end_hour_ist" integer NOT NULL,
	"origin" "record_origin" DEFAULT 'SEED' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "guard_posts_post_id_format" CHECK ("guard_posts"."post_id" ~ '^GRD-[0-9]{5}$'),
	CONSTRAINT "guard_posts_shift_start_hour" CHECK ("guard_posts"."shift_start_hour_ist" BETWEEN 0 AND 23),
	CONSTRAINT "guard_posts_shift_end_hour" CHECK ("guard_posts"."shift_end_hour_ist" BETWEEN 0 AND 23),
	CONSTRAINT "guard_posts_shift_distinct" CHECK ("guard_posts"."shift_start_hour_ist" <> "guard_posts"."shift_end_hour_ist")
);
--> statement-breakpoint
ALTER TABLE "guard_posts" ADD CONSTRAINT "guard_posts_atm_id_atms_id_fk" FOREIGN KEY ("atm_id") REFERENCES "public"."atms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_guard_posts_post_id" ON "guard_posts" USING btree ("post_id");--> statement-breakpoint
CREATE INDEX "idx_guard_posts_atm_id" ON "guard_posts" USING btree ("atm_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_guard_posts_atm_shift" ON "guard_posts" USING btree ("atm_id","shift_start_hour_ist");