import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { getTableConfig, type PgTable } from 'drizzle-orm/pg-core';
import {
  collectionMembers,
  collections,
  competitionGroups,
  competitions,
  eventParticipants,
  events,
  eventStatusEnum,
  follows,
  participants,
  providerCanonicalTypeEnum,
  providerEntityMappings,
  providers,
  seasons,
  sportCodeEnum,
  sports,
} from '../src/db/schema.ts';

const tables: readonly PgTable[] = [
  sports,
  participants,
  competitionGroups,
  competitions,
  seasons,
  events,
  eventParticipants,
  collections,
  collectionMembers,
  providers,
  providerEntityMappings,
  follows,
];

const migration = readFileSync(new URL('../drizzle/0000_initial_schema.sql', import.meta.url), 'utf8');

function constraintNames(table: PgTable) {
  const config = getTableConfig(table);
  return new Set([
    ...config.checks.map(check => check.name),
    ...config.foreignKeys.map(foreignKey => foreignKey.getName()),
    ...config.primaryKeys.map(primaryKey => primaryKey.getName()),
    ...config.uniqueConstraints.map(constraint => constraint.name),
  ]);
}

test('the initial schema contains the approved canonical tables and enum values', () => {
  assert.deepEqual(
    tables.map(table => getTableConfig(table).name),
    [
      'sports',
      'participants',
      'competition_groups',
      'competitions',
      'seasons',
      'events',
      'event_participants',
      'collections',
      'collection_members',
      'providers',
      'provider_entity_mappings',
      'follows',
    ],
  );
  assert.deepEqual(sportCodeEnum.enumValues, ['soccer', 'tennis', 'baseball', 'football']);
  assert.deepEqual(eventStatusEnum.enumValues, ['scheduled', 'live', 'final', 'postponed', 'cancelled', 'suspended']);
  assert.deepEqual(providerCanonicalTypeEnum.enumValues, ['participant', 'competition', 'competition_group', 'season', 'event']);
});

test('relational constraints preserve sport, season, and provider identity invariants', () => {
  const competitionConstraints = constraintNames(competitions);
  const eventConstraints = constraintNames(events);
  const participantConstraints = constraintNames(eventParticipants);
  const mappingConstraints = constraintNames(providerEntityMappings);

  assert.ok(competitionConstraints.has('competitions_group_sport_fk'));
  assert.ok(eventConstraints.has('events_competition_sport_fk'));
  assert.ok(eventConstraints.has('events_season_competition_fk'));
  assert.ok(participantConstraints.has('event_participants_event_sport_fk'));
  assert.ok(participantConstraints.has('event_participants_participant_sport_fk'));
  assert.ok(mappingConstraints.has('provider_entity_mappings_pk'));
});

test('polymorphic relationships require exactly one target matching their discriminator', () => {
  assert.ok(constraintNames(collectionMembers).has('collection_members_target'));
  assert.ok(constraintNames(providerEntityMappings).has('provider_entity_mappings_target'));
  assert.ok(constraintNames(follows).has('follows_target'));

  assert.match(migration, /CREATE UNIQUE INDEX "follows_owner_participant_unique"[\s\S]*WHERE "follows"\."participant_id" is not null/);
  assert.match(migration, /CREATE UNIQUE INDEX "collection_members_group_unique"[\s\S]*WHERE "collection_members"\."competition_group_id" is not null/);
});

test('the migration keeps event time and validated sport state at the persistence boundary', () => {
  assert.match(migration, /"starts_at" timestamp with time zone NOT NULL/);
  assert.match(migration, /"observed_at" timestamp with time zone/);
  assert.match(migration, /"state" jsonb NOT NULL/);
  assert.match(migration, /CONSTRAINT "events_state_shape" CHECK/);
  assert.match(migration, /when 'soccer' then jsonb_typeof\("events"\."state"->'goals'\) = 'array'/);
  assert.match(migration, /when 'tennis' then jsonb_typeof\("events"\."state"->'sets'\) = 'array'/);
  assert.match(migration, /when 'baseball' then jsonb_typeof\("events"\."state"->'innings'\) = 'array'/);
  assert.match(migration, /when 'football' then jsonb_typeof\("events"\."state"->'quarters'\) = 'array'/);
});
