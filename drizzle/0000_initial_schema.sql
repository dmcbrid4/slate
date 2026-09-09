CREATE TYPE "public"."collection_target_type" AS ENUM('participant', 'competition', 'competition_group');--> statement-breakpoint
CREATE TYPE "public"."competition_category" AS ENUM('men', 'women', 'mixed', 'open');--> statement-breakpoint
CREATE TYPE "public"."event_designation" AS ENUM('home', 'away');--> statement-breakpoint
CREATE TYPE "public"."event_result" AS ENUM('win', 'loss', 'draw');--> statement-breakpoint
CREATE TYPE "public"."event_status" AS ENUM('scheduled', 'live', 'final', 'postponed', 'cancelled', 'suspended');--> statement-breakpoint
CREATE TYPE "public"."follow_target_type" AS ENUM('participant', 'competition', 'competition_group', 'collection');--> statement-breakpoint
CREATE TYPE "public"."participant_type" AS ENUM('team', 'player');--> statement-breakpoint
CREATE TYPE "public"."provider_canonical_type" AS ENUM('participant', 'competition', 'competition_group', 'season', 'event');--> statement-breakpoint
CREATE TYPE "public"."sport_code" AS ENUM('soccer', 'tennis', 'baseball', 'football');--> statement-breakpoint
CREATE TABLE "collection_members" (
	"collection_id" text NOT NULL,
	"position" integer NOT NULL,
	"target_type" "collection_target_type" NOT NULL,
	"participant_id" text,
	"competition_id" text,
	"competition_group_id" text,
	CONSTRAINT "collection_members_pk" PRIMARY KEY("collection_id","position"),
	CONSTRAINT "collection_members_position" CHECK ("collection_members"."position" >= 0),
	CONSTRAINT "collection_members_target" CHECK (
    ("collection_members"."target_type" = 'participant' and "collection_members"."participant_id" is not null and "collection_members"."competition_id" is null and "collection_members"."competition_group_id" is null) or
    ("collection_members"."target_type" = 'competition' and "collection_members"."participant_id" is null and "collection_members"."competition_id" is not null and "collection_members"."competition_group_id" is null) or
    ("collection_members"."target_type" = 'competition_group' and "collection_members"."participant_id" is null and "collection_members"."competition_id" is null and "collection_members"."competition_group_id" is not null)
  )
);
--> statement-breakpoint
CREATE TABLE "collections" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"short_name" text NOT NULL,
	"slug" text NOT NULL,
	CONSTRAINT "collections_slug_unique" UNIQUE("slug"),
	CONSTRAINT "collections_id_format" CHECK ("collections"."id" ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
	CONSTRAINT "collections_name_nonempty" CHECK (length(btrim("collections"."name")) > 0),
	CONSTRAINT "collections_short_name_nonempty" CHECK (length(btrim("collections"."short_name")) > 0),
	CONSTRAINT "collections_slug_format" CHECK ("collections"."slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);
--> statement-breakpoint
CREATE TABLE "competition_groups" (
	"id" text PRIMARY KEY NOT NULL,
	"sport_id" "sport_code" NOT NULL,
	"name" text NOT NULL,
	"short_name" text NOT NULL,
	"slug" text NOT NULL,
	CONSTRAINT "competition_groups_slug_unique" UNIQUE("slug"),
	CONSTRAINT "competition_groups_id_sport_unique" UNIQUE("id","sport_id"),
	CONSTRAINT "competition_groups_id_format" CHECK ("competition_groups"."id" ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
	CONSTRAINT "competition_groups_name_nonempty" CHECK (length(btrim("competition_groups"."name")) > 0),
	CONSTRAINT "competition_groups_short_name_nonempty" CHECK (length(btrim("competition_groups"."short_name")) > 0),
	CONSTRAINT "competition_groups_slug_format" CHECK ("competition_groups"."slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);
--> statement-breakpoint
CREATE TABLE "competitions" (
	"id" text PRIMARY KEY NOT NULL,
	"sport_id" "sport_code" NOT NULL,
	"name" text NOT NULL,
	"short_name" text NOT NULL,
	"slug" text NOT NULL,
	"category" "competition_category",
	"competition_group_id" text,
	CONSTRAINT "competitions_slug_unique" UNIQUE("slug"),
	CONSTRAINT "competitions_id_sport_unique" UNIQUE("id","sport_id"),
	CONSTRAINT "competitions_id_format" CHECK ("competitions"."id" ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
	CONSTRAINT "competitions_name_nonempty" CHECK (length(btrim("competitions"."name")) > 0),
	CONSTRAINT "competitions_short_name_nonempty" CHECK (length(btrim("competitions"."short_name")) > 0),
	CONSTRAINT "competitions_slug_format" CHECK ("competitions"."slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);
--> statement-breakpoint
CREATE TABLE "event_participants" (
	"event_id" text NOT NULL,
	"participant_id" text NOT NULL,
	"sport_id" "sport_code" NOT NULL,
	"side" smallint NOT NULL,
	"order" integer NOT NULL,
	"designation" "event_designation",
	"result" "event_result",
	"seed" integer,
	CONSTRAINT "event_participants_pk" PRIMARY KEY("event_id","side","order"),
	CONSTRAINT "event_participants_event_participant_unique" UNIQUE("event_id","participant_id"),
	CONSTRAINT "event_participants_side" CHECK ("event_participants"."side" in (0, 1)),
	CONSTRAINT "event_participants_order" CHECK ("event_participants"."order" >= 0),
	CONSTRAINT "event_participants_seed" CHECK ("event_participants"."seed" is null or "event_participants"."seed" >= 1)
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" text PRIMARY KEY NOT NULL,
	"sport_id" "sport_code" NOT NULL,
	"competition_id" text NOT NULL,
	"season_id" text,
	"starts_at" timestamp with time zone NOT NULL,
	"status" "event_status" NOT NULL,
	"venue_name" text,
	"state" jsonb NOT NULL,
	"observed_at" timestamp with time zone,
	CONSTRAINT "events_id_sport_unique" UNIQUE("id","sport_id"),
	CONSTRAINT "events_id_format" CHECK ("events"."id" ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
	CONSTRAINT "events_venue_nonempty" CHECK ("events"."venue_name" is null or length(btrim("events"."venue_name")) > 0),
	CONSTRAINT "events_state_shape" CHECK (
    jsonb_typeof("events"."state") = 'object' and
    case "events"."sport_id"
      when 'soccer' then jsonb_typeof("events"."state"->'goals') = 'array'
      when 'tennis' then jsonb_typeof("events"."state"->'sets') = 'array' and jsonb_typeof("events"."state"->'round') = 'string'
      when 'baseball' then jsonb_typeof("events"."state"->'innings') = 'array'
      when 'football' then jsonb_typeof("events"."state"->'quarters') = 'array'
      else false
    end
  )
);
--> statement-breakpoint
CREATE TABLE "follows" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"position" integer NOT NULL,
	"target_type" "follow_target_type" NOT NULL,
	"participant_id" text,
	"competition_id" text,
	"competition_group_id" text,
	"collection_id" text,
	CONSTRAINT "follows_owner_position_unique" UNIQUE("owner_id","position"),
	CONSTRAINT "follows_id_format" CHECK ("follows"."id" ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
	CONSTRAINT "follows_owner_id_nonempty" CHECK (length(btrim("follows"."owner_id")) > 0),
	CONSTRAINT "follows_position" CHECK ("follows"."position" >= 0),
	CONSTRAINT "follows_target" CHECK (
    ("follows"."target_type" = 'participant' and "follows"."participant_id" is not null and "follows"."competition_id" is null and "follows"."competition_group_id" is null and "follows"."collection_id" is null) or
    ("follows"."target_type" = 'competition' and "follows"."participant_id" is null and "follows"."competition_id" is not null and "follows"."competition_group_id" is null and "follows"."collection_id" is null) or
    ("follows"."target_type" = 'competition_group' and "follows"."participant_id" is null and "follows"."competition_id" is null and "follows"."competition_group_id" is not null and "follows"."collection_id" is null) or
    ("follows"."target_type" = 'collection' and "follows"."participant_id" is null and "follows"."competition_id" is null and "follows"."competition_group_id" is null and "follows"."collection_id" is not null)
  )
);
--> statement-breakpoint
CREATE TABLE "participants" (
	"id" text PRIMARY KEY NOT NULL,
	"sport_id" "sport_code" NOT NULL,
	"type" "participant_type" NOT NULL,
	"name" text NOT NULL,
	"short_name" text NOT NULL,
	"slug" text NOT NULL,
	"country_code" text,
	"mark" jsonb,
	CONSTRAINT "participants_slug_unique" UNIQUE("slug"),
	CONSTRAINT "participants_id_sport_unique" UNIQUE("id","sport_id"),
	CONSTRAINT "participants_id_format" CHECK ("participants"."id" ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
	CONSTRAINT "participants_name_nonempty" CHECK (length(btrim("participants"."name")) > 0),
	CONSTRAINT "participants_short_name_nonempty" CHECK (length(btrim("participants"."short_name")) > 0),
	CONSTRAINT "participants_slug_format" CHECK ("participants"."slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
	CONSTRAINT "participants_country_code_format" CHECK ("participants"."country_code" is null or "participants"."country_code" ~ '^[A-Z]{2}$'),
	CONSTRAINT "participants_mark_object" CHECK ("participants"."mark" is null or jsonb_typeof("participants"."mark") = 'object')
);
--> statement-breakpoint
CREATE TABLE "provider_entity_mappings" (
	"provider_id" text NOT NULL,
	"provider_entity_type" text NOT NULL,
	"provider_entity_id" text NOT NULL,
	"canonical_type" "provider_canonical_type" NOT NULL,
	"participant_id" text,
	"competition_id" text,
	"competition_group_id" text,
	"season_id" text,
	"event_id" text,
	CONSTRAINT "provider_entity_mappings_pk" PRIMARY KEY("provider_id","provider_entity_type","provider_entity_id"),
	CONSTRAINT "provider_entity_type_nonempty" CHECK (length(btrim("provider_entity_mappings"."provider_entity_type")) > 0),
	CONSTRAINT "provider_entity_id_nonempty" CHECK (length(btrim("provider_entity_mappings"."provider_entity_id")) > 0),
	CONSTRAINT "provider_entity_mappings_target" CHECK (
    ("provider_entity_mappings"."canonical_type" = 'participant' and "provider_entity_mappings"."participant_id" is not null and "provider_entity_mappings"."competition_id" is null and "provider_entity_mappings"."competition_group_id" is null and "provider_entity_mappings"."season_id" is null and "provider_entity_mappings"."event_id" is null) or
    ("provider_entity_mappings"."canonical_type" = 'competition' and "provider_entity_mappings"."participant_id" is null and "provider_entity_mappings"."competition_id" is not null and "provider_entity_mappings"."competition_group_id" is null and "provider_entity_mappings"."season_id" is null and "provider_entity_mappings"."event_id" is null) or
    ("provider_entity_mappings"."canonical_type" = 'competition_group' and "provider_entity_mappings"."participant_id" is null and "provider_entity_mappings"."competition_id" is null and "provider_entity_mappings"."competition_group_id" is not null and "provider_entity_mappings"."season_id" is null and "provider_entity_mappings"."event_id" is null) or
    ("provider_entity_mappings"."canonical_type" = 'season' and "provider_entity_mappings"."participant_id" is null and "provider_entity_mappings"."competition_id" is null and "provider_entity_mappings"."competition_group_id" is null and "provider_entity_mappings"."season_id" is not null and "provider_entity_mappings"."event_id" is null) or
    ("provider_entity_mappings"."canonical_type" = 'event' and "provider_entity_mappings"."participant_id" is null and "provider_entity_mappings"."competition_id" is null and "provider_entity_mappings"."competition_group_id" is null and "provider_entity_mappings"."season_id" is null and "provider_entity_mappings"."event_id" is not null)
  )
);
--> statement-breakpoint
CREATE TABLE "providers" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "providers_id_format" CHECK ("providers"."id" ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
	CONSTRAINT "providers_name_nonempty" CHECK (length(btrim("providers"."name")) > 0)
);
--> statement-breakpoint
CREATE TABLE "seasons" (
	"id" text PRIMARY KEY NOT NULL,
	"competition_id" text NOT NULL,
	"name" text NOT NULL,
	"starts_on" date,
	"ends_on" date,
	CONSTRAINT "seasons_id_competition_unique" UNIQUE("id","competition_id"),
	CONSTRAINT "seasons_id_format" CHECK ("seasons"."id" ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
	CONSTRAINT "seasons_name_nonempty" CHECK (length(btrim("seasons"."name")) > 0),
	CONSTRAINT "seasons_date_order" CHECK ("seasons"."starts_on" is null or "seasons"."ends_on" is null or "seasons"."starts_on" <= "seasons"."ends_on")
);
--> statement-breakpoint
CREATE TABLE "sports" (
	"id" "sport_code" PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "sports_name_nonempty" CHECK (length(btrim("sports"."name")) > 0)
);
--> statement-breakpoint
ALTER TABLE "collection_members" ADD CONSTRAINT "collection_members_collection_id_collections_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."collections"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collection_members" ADD CONSTRAINT "collection_members_participant_id_participants_id_fk" FOREIGN KEY ("participant_id") REFERENCES "public"."participants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collection_members" ADD CONSTRAINT "collection_members_competition_id_competitions_id_fk" FOREIGN KEY ("competition_id") REFERENCES "public"."competitions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collection_members" ADD CONSTRAINT "collection_members_competition_group_id_competition_groups_id_fk" FOREIGN KEY ("competition_group_id") REFERENCES "public"."competition_groups"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "competition_groups" ADD CONSTRAINT "competition_groups_sport_id_sports_id_fk" FOREIGN KEY ("sport_id") REFERENCES "public"."sports"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "competitions" ADD CONSTRAINT "competitions_sport_id_sports_id_fk" FOREIGN KEY ("sport_id") REFERENCES "public"."sports"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "competitions" ADD CONSTRAINT "competitions_group_sport_fk" FOREIGN KEY ("competition_group_id","sport_id") REFERENCES "public"."competition_groups"("id","sport_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_participants" ADD CONSTRAINT "event_participants_event_sport_fk" FOREIGN KEY ("event_id","sport_id") REFERENCES "public"."events"("id","sport_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_participants" ADD CONSTRAINT "event_participants_participant_sport_fk" FOREIGN KEY ("participant_id","sport_id") REFERENCES "public"."participants"("id","sport_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_sport_id_sports_id_fk" FOREIGN KEY ("sport_id") REFERENCES "public"."sports"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_competition_sport_fk" FOREIGN KEY ("competition_id","sport_id") REFERENCES "public"."competitions"("id","sport_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_season_competition_fk" FOREIGN KEY ("season_id","competition_id") REFERENCES "public"."seasons"("id","competition_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follows" ADD CONSTRAINT "follows_participant_id_participants_id_fk" FOREIGN KEY ("participant_id") REFERENCES "public"."participants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follows" ADD CONSTRAINT "follows_competition_id_competitions_id_fk" FOREIGN KEY ("competition_id") REFERENCES "public"."competitions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follows" ADD CONSTRAINT "follows_competition_group_id_competition_groups_id_fk" FOREIGN KEY ("competition_group_id") REFERENCES "public"."competition_groups"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follows" ADD CONSTRAINT "follows_collection_id_collections_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."collections"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "participants" ADD CONSTRAINT "participants_sport_id_sports_id_fk" FOREIGN KEY ("sport_id") REFERENCES "public"."sports"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_entity_mappings" ADD CONSTRAINT "provider_entity_mappings_provider_id_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."providers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_entity_mappings" ADD CONSTRAINT "provider_entity_mappings_participant_id_participants_id_fk" FOREIGN KEY ("participant_id") REFERENCES "public"."participants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_entity_mappings" ADD CONSTRAINT "provider_entity_mappings_competition_id_competitions_id_fk" FOREIGN KEY ("competition_id") REFERENCES "public"."competitions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_entity_mappings" ADD CONSTRAINT "provider_entity_mappings_competition_group_id_competition_groups_id_fk" FOREIGN KEY ("competition_group_id") REFERENCES "public"."competition_groups"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_entity_mappings" ADD CONSTRAINT "provider_entity_mappings_season_id_seasons_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_entity_mappings" ADD CONSTRAINT "provider_entity_mappings_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seasons" ADD CONSTRAINT "seasons_competition_id_competitions_id_fk" FOREIGN KEY ("competition_id") REFERENCES "public"."competitions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "collection_members_participant_unique" ON "collection_members" USING btree ("collection_id","participant_id") WHERE "collection_members"."participant_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "collection_members_competition_unique" ON "collection_members" USING btree ("collection_id","competition_id") WHERE "collection_members"."competition_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "collection_members_group_unique" ON "collection_members" USING btree ("collection_id","competition_group_id") WHERE "collection_members"."competition_group_id" is not null;--> statement-breakpoint
CREATE INDEX "event_participants_participant_idx" ON "event_participants" USING btree ("participant_id");--> statement-breakpoint
CREATE INDEX "events_competition_start_idx" ON "events" USING btree ("competition_id","starts_at");--> statement-breakpoint
CREATE INDEX "events_sport_start_idx" ON "events" USING btree ("sport_id","starts_at");--> statement-breakpoint
CREATE INDEX "events_status_start_idx" ON "events" USING btree ("status","starts_at");--> statement-breakpoint
CREATE UNIQUE INDEX "follows_owner_participant_unique" ON "follows" USING btree ("owner_id","participant_id") WHERE "follows"."participant_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "follows_owner_competition_unique" ON "follows" USING btree ("owner_id","competition_id") WHERE "follows"."competition_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "follows_owner_group_unique" ON "follows" USING btree ("owner_id","competition_group_id") WHERE "follows"."competition_group_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "follows_owner_collection_unique" ON "follows" USING btree ("owner_id","collection_id") WHERE "follows"."collection_id" is not null;--> statement-breakpoint
CREATE INDEX "provider_mappings_participant_idx" ON "provider_entity_mappings" USING btree ("participant_id");--> statement-breakpoint
CREATE INDEX "provider_mappings_competition_idx" ON "provider_entity_mappings" USING btree ("competition_id");--> statement-breakpoint
CREATE INDEX "provider_mappings_group_idx" ON "provider_entity_mappings" USING btree ("competition_group_id");--> statement-breakpoint
CREATE INDEX "provider_mappings_season_idx" ON "provider_entity_mappings" USING btree ("season_id");--> statement-breakpoint
CREATE INDEX "provider_mappings_event_idx" ON "provider_entity_mappings" USING btree ("event_id");