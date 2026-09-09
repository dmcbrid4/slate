CREATE TYPE "public"."provider_refresh_resource" AS ENUM('live_matches', 'upcoming_matches', 'fixtures', 'tournaments');--> statement-breakpoint
CREATE TABLE "provider_daily_budgets" (
	"provider_id" text NOT NULL,
	"day" date NOT NULL,
	"calls" integer NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "provider_daily_budgets_pk" PRIMARY KEY("provider_id","day"),
	CONSTRAINT "provider_daily_budgets_calls" CHECK ("provider_daily_budgets"."calls" >= 0)
);
--> statement-breakpoint
CREATE TABLE "provider_sync_states" (
	"provider_id" text NOT NULL,
	"resource" "provider_refresh_resource" NOT NULL,
	"next_refresh_at" timestamp with time zone NOT NULL,
	"lease_token" text,
	"lease_expires_at" timestamp with time zone,
	"last_accepted_at" timestamp with time zone,
	"last_provider_observed_at" timestamp with time zone,
	"last_failure_code" text,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "provider_sync_states_pk" PRIMARY KEY("provider_id","resource"),
	CONSTRAINT "provider_sync_states_lease_pair" CHECK (("provider_sync_states"."lease_token" is null and "provider_sync_states"."lease_expires_at" is null) or ("provider_sync_states"."lease_token" is not null and "provider_sync_states"."lease_expires_at" is not null))
);
--> statement-breakpoint
ALTER TABLE "provider_daily_budgets" ADD CONSTRAINT "provider_daily_budgets_provider_id_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."providers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_sync_states" ADD CONSTRAINT "provider_sync_states_provider_id_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."providers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "provider_sync_states_due_idx" ON "provider_sync_states" USING btree ("next_refresh_at");