import { sql } from 'drizzle-orm';
import {
  check,
  date,
  foreignKey,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  unique,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import type { AssetRef, CanonicalEvent } from '../domain/model.ts';

export const sportCodeEnum = pgEnum('sport_code', ['soccer', 'tennis', 'baseball', 'football']);
export const participantTypeEnum = pgEnum('participant_type', ['team', 'player']);
export const competitionCategoryEnum = pgEnum('competition_category', ['men', 'women', 'mixed', 'open']);
export const eventStatusEnum = pgEnum('event_status', ['scheduled', 'live', 'final', 'postponed', 'cancelled', 'suspended']);
export const eventDesignationEnum = pgEnum('event_designation', ['home', 'away']);
export const eventResultEnum = pgEnum('event_result', ['win', 'loss', 'draw']);
export const collectionTargetTypeEnum = pgEnum('collection_target_type', ['participant', 'competition', 'competition_group']);
export const followTargetTypeEnum = pgEnum('follow_target_type', ['participant', 'competition', 'competition_group', 'collection']);
export const providerCanonicalTypeEnum = pgEnum('provider_canonical_type', ['participant', 'competition', 'competition_group', 'season', 'event']);

const canonicalIdPattern = sql.raw("'^[a-z0-9]+(-[a-z0-9]+)*$'");

export const sports = pgTable('sports', {
  id: sportCodeEnum('id').primaryKey(),
  name: text('name').notNull(),
}, table => [
  check('sports_name_nonempty', sql`length(btrim(${table.name})) > 0`),
]);

export const participants = pgTable('participants', {
  id: text('id').primaryKey(),
  sportId: sportCodeEnum('sport_id').notNull().references(() => sports.id),
  type: participantTypeEnum('type').notNull(),
  name: text('name').notNull(),
  shortName: text('short_name').notNull(),
  slug: text('slug').notNull().unique(),
  countryCode: text('country_code'),
  mark: jsonb('mark').$type<AssetRef>(),
}, table => [
  unique('participants_id_sport_unique').on(table.id, table.sportId),
  check('participants_id_format', sql`${table.id} ~ ${canonicalIdPattern}`),
  check('participants_name_nonempty', sql`length(btrim(${table.name})) > 0`),
  check('participants_short_name_nonempty', sql`length(btrim(${table.shortName})) > 0`),
  check('participants_slug_format', sql`${table.slug} ~ ${canonicalIdPattern}`),
  check('participants_country_code_format', sql`${table.countryCode} is null or ${table.countryCode} ~ '^[A-Z]{2}$'`),
  check('participants_mark_object', sql`${table.mark} is null or jsonb_typeof(${table.mark}) = 'object'`),
]);

export const competitionGroups = pgTable('competition_groups', {
  id: text('id').primaryKey(),
  sportId: sportCodeEnum('sport_id').notNull().references(() => sports.id),
  name: text('name').notNull(),
  shortName: text('short_name').notNull(),
  slug: text('slug').notNull().unique(),
}, table => [
  unique('competition_groups_id_sport_unique').on(table.id, table.sportId),
  check('competition_groups_id_format', sql`${table.id} ~ ${canonicalIdPattern}`),
  check('competition_groups_name_nonempty', sql`length(btrim(${table.name})) > 0`),
  check('competition_groups_short_name_nonempty', sql`length(btrim(${table.shortName})) > 0`),
  check('competition_groups_slug_format', sql`${table.slug} ~ ${canonicalIdPattern}`),
]);

export const competitions = pgTable('competitions', {
  id: text('id').primaryKey(),
  sportId: sportCodeEnum('sport_id').notNull().references(() => sports.id),
  name: text('name').notNull(),
  shortName: text('short_name').notNull(),
  slug: text('slug').notNull().unique(),
  category: competitionCategoryEnum('category'),
  competitionGroupId: text('competition_group_id'),
}, table => [
  unique('competitions_id_sport_unique').on(table.id, table.sportId),
  foreignKey({
    name: 'competitions_group_sport_fk',
    columns: [table.competitionGroupId, table.sportId],
    foreignColumns: [competitionGroups.id, competitionGroups.sportId],
  }),
  check('competitions_id_format', sql`${table.id} ~ ${canonicalIdPattern}`),
  check('competitions_name_nonempty', sql`length(btrim(${table.name})) > 0`),
  check('competitions_short_name_nonempty', sql`length(btrim(${table.shortName})) > 0`),
  check('competitions_slug_format', sql`${table.slug} ~ ${canonicalIdPattern}`),
]);

export const seasons = pgTable('seasons', {
  id: text('id').primaryKey(),
  competitionId: text('competition_id').notNull().references(() => competitions.id),
  name: text('name').notNull(),
  startsOn: date('starts_on', { mode: 'string' }),
  endsOn: date('ends_on', { mode: 'string' }),
}, table => [
  unique('seasons_id_competition_unique').on(table.id, table.competitionId),
  check('seasons_id_format', sql`${table.id} ~ ${canonicalIdPattern}`),
  check('seasons_name_nonempty', sql`length(btrim(${table.name})) > 0`),
  check('seasons_date_order', sql`${table.startsOn} is null or ${table.endsOn} is null or ${table.startsOn} <= ${table.endsOn}`),
]);

export const events = pgTable('events', {
  id: text('id').primaryKey(),
  sportId: sportCodeEnum('sport_id').notNull().references(() => sports.id),
  competitionId: text('competition_id').notNull(),
  seasonId: text('season_id'),
  startsAt: timestamp('starts_at', { withTimezone: true, mode: 'string' }).notNull(),
  status: eventStatusEnum('status').notNull(),
  venueName: text('venue_name'),
  state: jsonb('state').$type<CanonicalEvent['state']>().notNull(),
  observedAt: timestamp('observed_at', { withTimezone: true, mode: 'string' }),
}, table => [
  unique('events_id_sport_unique').on(table.id, table.sportId),
  foreignKey({
    name: 'events_competition_sport_fk',
    columns: [table.competitionId, table.sportId],
    foreignColumns: [competitions.id, competitions.sportId],
  }),
  foreignKey({
    name: 'events_season_competition_fk',
    columns: [table.seasonId, table.competitionId],
    foreignColumns: [seasons.id, seasons.competitionId],
  }),
  index('events_competition_start_idx').on(table.competitionId, table.startsAt),
  index('events_sport_start_idx').on(table.sportId, table.startsAt),
  index('events_status_start_idx').on(table.status, table.startsAt),
  check('events_id_format', sql`${table.id} ~ ${canonicalIdPattern}`),
  check('events_venue_nonempty', sql`${table.venueName} is null or length(btrim(${table.venueName})) > 0`),
  check('events_state_shape', sql`
    jsonb_typeof(${table.state}) = 'object' and
    case ${table.sportId}
      when 'soccer' then jsonb_typeof(${table.state}->'goals') = 'array'
      when 'tennis' then jsonb_typeof(${table.state}->'sets') = 'array' and jsonb_typeof(${table.state}->'round') = 'string'
      when 'baseball' then jsonb_typeof(${table.state}->'innings') = 'array'
      when 'football' then jsonb_typeof(${table.state}->'quarters') = 'array'
      else false
    end
  `),
]);

export const eventParticipants = pgTable('event_participants', {
  eventId: text('event_id').notNull(),
  participantId: text('participant_id').notNull(),
  sportId: sportCodeEnum('sport_id').notNull(),
  side: smallint('side').notNull(),
  order: integer('order').notNull(),
  designation: eventDesignationEnum('designation'),
  result: eventResultEnum('result'),
  seed: integer('seed'),
}, table => [
  primaryKey({ name: 'event_participants_pk', columns: [table.eventId, table.side, table.order] }),
  unique('event_participants_event_participant_unique').on(table.eventId, table.participantId),
  foreignKey({
    name: 'event_participants_event_sport_fk',
    columns: [table.eventId, table.sportId],
    foreignColumns: [events.id, events.sportId],
  }),
  foreignKey({
    name: 'event_participants_participant_sport_fk',
    columns: [table.participantId, table.sportId],
    foreignColumns: [participants.id, participants.sportId],
  }),
  index('event_participants_participant_idx').on(table.participantId),
  check('event_participants_side', sql`${table.side} in (0, 1)`),
  check('event_participants_order', sql`${table.order} >= 0`),
  check('event_participants_seed', sql`${table.seed} is null or ${table.seed} >= 1`),
]);

export const collections = pgTable('collections', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  shortName: text('short_name').notNull(),
  slug: text('slug').notNull().unique(),
}, table => [
  check('collections_id_format', sql`${table.id} ~ ${canonicalIdPattern}`),
  check('collections_name_nonempty', sql`length(btrim(${table.name})) > 0`),
  check('collections_short_name_nonempty', sql`length(btrim(${table.shortName})) > 0`),
  check('collections_slug_format', sql`${table.slug} ~ ${canonicalIdPattern}`),
]);

export const collectionMembers = pgTable('collection_members', {
  collectionId: text('collection_id').notNull().references(() => collections.id),
  position: integer('position').notNull(),
  targetType: collectionTargetTypeEnum('target_type').notNull(),
  participantId: text('participant_id').references(() => participants.id),
  competitionId: text('competition_id').references(() => competitions.id),
  competitionGroupId: text('competition_group_id').references(() => competitionGroups.id),
}, table => [
  primaryKey({ name: 'collection_members_pk', columns: [table.collectionId, table.position] }),
  uniqueIndex('collection_members_participant_unique').on(table.collectionId, table.participantId).where(sql`${table.participantId} is not null`),
  uniqueIndex('collection_members_competition_unique').on(table.collectionId, table.competitionId).where(sql`${table.competitionId} is not null`),
  uniqueIndex('collection_members_group_unique').on(table.collectionId, table.competitionGroupId).where(sql`${table.competitionGroupId} is not null`),
  check('collection_members_position', sql`${table.position} >= 0`),
  check('collection_members_target', sql`
    (${table.targetType} = 'participant' and ${table.participantId} is not null and ${table.competitionId} is null and ${table.competitionGroupId} is null) or
    (${table.targetType} = 'competition' and ${table.participantId} is null and ${table.competitionId} is not null and ${table.competitionGroupId} is null) or
    (${table.targetType} = 'competition_group' and ${table.participantId} is null and ${table.competitionId} is null and ${table.competitionGroupId} is not null)
  `),
]);

export const providers = pgTable('providers', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
}, table => [
  check('providers_id_format', sql`${table.id} ~ ${canonicalIdPattern}`),
  check('providers_name_nonempty', sql`length(btrim(${table.name})) > 0`),
]);

export const providerEntityMappings = pgTable('provider_entity_mappings', {
  providerId: text('provider_id').notNull().references(() => providers.id),
  providerEntityType: text('provider_entity_type').notNull(),
  providerEntityId: text('provider_entity_id').notNull(),
  canonicalType: providerCanonicalTypeEnum('canonical_type').notNull(),
  participantId: text('participant_id').references(() => participants.id),
  competitionId: text('competition_id').references(() => competitions.id),
  competitionGroupId: text('competition_group_id').references(() => competitionGroups.id),
  seasonId: text('season_id').references(() => seasons.id),
  eventId: text('event_id').references(() => events.id),
}, table => [
  primaryKey({
    name: 'provider_entity_mappings_pk',
    columns: [table.providerId, table.providerEntityType, table.providerEntityId],
  }),
  index('provider_mappings_participant_idx').on(table.participantId),
  index('provider_mappings_competition_idx').on(table.competitionId),
  index('provider_mappings_group_idx').on(table.competitionGroupId),
  index('provider_mappings_season_idx').on(table.seasonId),
  index('provider_mappings_event_idx').on(table.eventId),
  check('provider_entity_type_nonempty', sql`length(btrim(${table.providerEntityType})) > 0`),
  check('provider_entity_id_nonempty', sql`length(btrim(${table.providerEntityId})) > 0`),
  check('provider_entity_mappings_target', sql`
    (${table.canonicalType} = 'participant' and ${table.participantId} is not null and ${table.competitionId} is null and ${table.competitionGroupId} is null and ${table.seasonId} is null and ${table.eventId} is null) or
    (${table.canonicalType} = 'competition' and ${table.participantId} is null and ${table.competitionId} is not null and ${table.competitionGroupId} is null and ${table.seasonId} is null and ${table.eventId} is null) or
    (${table.canonicalType} = 'competition_group' and ${table.participantId} is null and ${table.competitionId} is null and ${table.competitionGroupId} is not null and ${table.seasonId} is null and ${table.eventId} is null) or
    (${table.canonicalType} = 'season' and ${table.participantId} is null and ${table.competitionId} is null and ${table.competitionGroupId} is null and ${table.seasonId} is not null and ${table.eventId} is null) or
    (${table.canonicalType} = 'event' and ${table.participantId} is null and ${table.competitionId} is null and ${table.competitionGroupId} is null and ${table.seasonId} is null and ${table.eventId} is not null)
  `),
]);

export const follows = pgTable('follows', {
  id: text('id').primaryKey(),
  ownerId: text('owner_id').notNull(),
  position: integer('position').notNull(),
  targetType: followTargetTypeEnum('target_type').notNull(),
  participantId: text('participant_id').references(() => participants.id),
  competitionId: text('competition_id').references(() => competitions.id),
  competitionGroupId: text('competition_group_id').references(() => competitionGroups.id),
  collectionId: text('collection_id').references(() => collections.id),
}, table => [
  unique('follows_owner_position_unique').on(table.ownerId, table.position),
  uniqueIndex('follows_owner_participant_unique').on(table.ownerId, table.participantId).where(sql`${table.participantId} is not null`),
  uniqueIndex('follows_owner_competition_unique').on(table.ownerId, table.competitionId).where(sql`${table.competitionId} is not null`),
  uniqueIndex('follows_owner_group_unique').on(table.ownerId, table.competitionGroupId).where(sql`${table.competitionGroupId} is not null`),
  uniqueIndex('follows_owner_collection_unique').on(table.ownerId, table.collectionId).where(sql`${table.collectionId} is not null`),
  check('follows_id_format', sql`${table.id} ~ ${canonicalIdPattern}`),
  check('follows_owner_id_nonempty', sql`length(btrim(${table.ownerId})) > 0`),
  check('follows_position', sql`${table.position} >= 0`),
  check('follows_target', sql`
    (${table.targetType} = 'participant' and ${table.participantId} is not null and ${table.competitionId} is null and ${table.competitionGroupId} is null and ${table.collectionId} is null) or
    (${table.targetType} = 'competition' and ${table.participantId} is null and ${table.competitionId} is not null and ${table.competitionGroupId} is null and ${table.collectionId} is null) or
    (${table.targetType} = 'competition_group' and ${table.participantId} is null and ${table.competitionId} is null and ${table.competitionGroupId} is not null and ${table.collectionId} is null) or
    (${table.targetType} = 'collection' and ${table.participantId} is null and ${table.competitionId} is null and ${table.competitionGroupId} is null and ${table.collectionId} is not null)
  `),
]);
