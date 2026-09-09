import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { buildScoreboardData } from '../src/application/build-scoreboard-data.ts';
import { canonicalScoreboardPresentation, canonicalSeed, CANONICAL_DEMO_NOW, LOCAL_PRIMARY_OWNER_ID } from '../src/data/canonical-seed.ts';
import { createMemoryScoreboardRepository } from '../src/data/mock-scoreboard-repository.ts';
import { hydrateScoreboardGraph, ScoreboardRepositoryError, type ScoreboardRows } from '../src/db/scoreboard-repository.ts';
import { ownerId } from '../src/domain/ids.ts';
import { DomainInvariantError } from '../src/domain/invariants.ts';
import type { CollectionMemberTarget, FollowTarget } from '../src/domain/model.ts';

function collectionTargetColumns(target: CollectionMemberTarget) {
  return {
    participantId: target.type === 'participant' ? target.id : null,
    competitionId: target.type === 'competition' ? target.id : null,
    competitionGroupId: target.type === 'competition_group' ? target.id : null,
  };
}

function followTargetColumns(target: FollowTarget) {
  return {
    participantId: target.type === 'participant' ? target.id : null,
    competitionId: target.type === 'competition' ? target.id : null,
    competitionGroupId: target.type === 'competition_group' ? target.id : null,
    collectionId: target.type === 'collection' ? target.id : null,
  };
}

function sourceFiles(directory: string): readonly string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? sourceFiles(path) : path.endsWith('.ts') || path.endsWith('.tsx') ? [path] : [];
  });
}

function databaseRows(): ScoreboardRows {
  const sportsByEvent = new Map(canonicalSeed.events.map(event => [event.id, event.sportId]));
  return {
    sports: canonicalSeed.sports,
    participants: canonicalSeed.participants.map(participant => ({
      ...participant,
      countryCode: participant.countryCode ?? null,
      mark: participant.mark ?? null,
    })),
    competitionGroups: canonicalSeed.competitionGroups,
    competitions: canonicalSeed.competitions.map(competition => ({
      ...competition,
      category: competition.category ?? null,
      competitionGroupId: competition.competitionGroupId ?? null,
    })),
    seasons: canonicalSeed.seasons.map(season => ({
      ...season,
      startsOn: season.startsOn ?? null,
      endsOn: season.endsOn ?? null,
    })),
    events: canonicalSeed.events.map(event => ({
      ...event,
      startsAt: event.startsAt.replace('T', ' ').replace('Z', '+00'),
      seasonId: event.seasonId ?? null,
      venueName: event.venueName ?? null,
      observedAt: null,
    })),
    eventParticipants: canonicalSeed.eventParticipants.map(relation => ({
      ...relation,
      sportId: sportsByEvent.get(relation.eventId)!,
      designation: relation.designation ?? null,
      result: relation.result ?? null,
      seed: relation.seed ?? null,
    })),
    collections: canonicalSeed.collections,
    collectionMembers: canonicalSeed.collectionMembers.map(member => ({
      collectionId: member.collectionId,
      position: member.position,
      targetType: member.target.type,
      ...collectionTargetColumns(member.target),
    })),
    follows: canonicalSeed.follows.map(follow => ({
      id: follow.id,
      ownerId: follow.ownerId,
      position: follow.position,
      targetType: follow.target.type,
      ...followTargetColumns(follow.target),
    })),
  };
}

test('the repository-backed application boundary builds the complete scoreboard catalog', async () => {
  const data = await buildScoreboardData({
    repository: createMemoryScoreboardRepository(canonicalSeed),
    ownerId: LOCAL_PRIMARY_OWNER_ID,
    presentation: canonicalScoreboardPresentation,
    asOf: CANONICAL_DEMO_NOW,
  });

  assert.equal(data.asOf, CANONICAL_DEMO_NOW);
  assert.equal(data.records.length, canonicalSeed.events.length);
  assert.deepEqual(new Set(data.records.map(record => record.event.sport)), new Set(['soccer', 'tennis', 'baseball', 'football']));
  assert.deepEqual(new Set(data.records.map(record => record.event.status)), new Set(['scheduled', 'live', 'final']));
});

test('the server read model is serializable and contains follow matches without domain rows', async () => {
  const data = await buildScoreboardData({
    repository: createMemoryScoreboardRepository(canonicalSeed),
    ownerId: LOCAL_PRIMARY_OWNER_ID,
    presentation: canonicalScoreboardPresentation,
    asOf: CANONICAL_DEMO_NOW,
  });
  const tennis = data.records.find(record => record.eventId === 'alcaraz-sinner');

  assert.deepEqual(JSON.parse(JSON.stringify(data)), data);
  assert.ok(tennis);
  assert.deepEqual(
    tennis.targetMatches.map(match => match.target.type),
    ['participant', 'participant', 'competition', 'competition_group', 'collection'],
  );
  assert.deepEqual(tennis.targetMatches.at(-1)?.via, { type: 'competition_group', id: 'us-open' });
  assert.equal('state' in tennis.event, false);
  assert.equal('providerMappings' in data, false);
});

test('the memory repository scopes canonical follows to the requested owner', async () => {
  const repository = createMemoryScoreboardRepository(canonicalSeed);

  assert.equal((await repository.readGraph(LOCAL_PRIMARY_OWNER_ID)).follows.length, canonicalSeed.follows.length);
  assert.deepEqual((await repository.readGraph(ownerId('another-owner'))).follows, []);
});

test('database rows hydrate into validated canonical records for every supported sport', () => {
  const graph = hydrateScoreboardGraph(databaseRows());

  assert.equal(graph.events.length, canonicalSeed.events.length);
  assert.deepEqual(new Set(graph.events.map(event => event.sportId)), new Set(['soccer', 'tennis', 'baseball', 'football']));
  assert.equal(graph.events[0].startsAt, '2026-09-06T19:15:00.000Z');
  assert.deepEqual(graph.collectionMembers[0].target, canonicalSeed.collectionMembers[0].target);
  assert.deepEqual(graph.follows.map(follow => follow.target), canonicalSeed.follows.map(follow => follow.target));
  assert.deepEqual(graph.providers, []);
  assert.deepEqual(graph.providerMappings, []);
});

test('database target discriminators cannot hydrate a missing target', () => {
  const rows = databaseRows();
  const broken = {
    ...rows,
    follows: rows.follows.map((follow, index) => index === 0 ? { ...follow, collectionId: null } : follow),
  };

  assert.throws(
    () => hydrateScoreboardGraph(broken),
    (error: unknown) => error instanceof ScoreboardRepositoryError && error.message.includes('Follow collection'),
  );
});

test('malformed database JSON state fails with an explicit domain error', () => {
  const rows = databaseRows();
  const broken = {
    ...rows,
    events: rows.events.map((event, index) => index === 0 ? { ...event, state: { goals: [{ side: 0, minute: 'late' }] } } : event),
  } as unknown as ScoreboardRows;

  assert.throws(
    () => hydrateScoreboardGraph(broken),
    (error: unknown) => error instanceof DomainInvariantError && error.code === 'invalid_score_state',
  );

  const missingGames = {
    ...rows,
    events: rows.events.map(event => event.sportId === 'tennis'
      ? { ...event, state: { round: 'Quarterfinal', sets: [{ status: 'complete' }] } }
      : event),
  } as unknown as ScoreboardRows;
  assert.throws(
    () => hydrateScoreboardGraph(missingGames),
    (error: unknown) => error instanceof DomainInvariantError && error.code === 'invalid_score_state',
  );

  const invalidOptionalValues = [
    { sportId: 'tennis', state: { round: 'Quarterfinal', sets: [], points: 0 } },
    { sportId: 'football', state: { quarters: [[], []], fieldPosition: { yardLine: 25 } } },
  ] as const;
  for (const invalid of invalidOptionalValues) {
    const malformed = {
      ...rows,
      events: rows.events.map(event => event.sportId === invalid.sportId ? { ...event, state: invalid.state } : event),
    } as unknown as ScoreboardRows;
    assert.throws(
      () => hydrateScoreboardGraph(malformed),
      (error: unknown) => error instanceof DomainInvariantError,
    );
  }
});

test('client modules cannot import the canonical seed, Drizzle, or server data access', () => {
  const clientFiles = [...sourceFiles('src/components'), 'src/data/scoreboard.ts'];
  for (const file of clientFiles) {
    const source = readFileSync(file, 'utf8');
    assert.doesNotMatch(source, /from\s+['"][^'"]*canonical-seed/, `${file} imports the canonical seed.`);
    assert.doesNotMatch(source, /from\s+['"][^'"]*(?:drizzle-orm|\/db\/|\/server\/)/, `${file} imports server data access.`);
  }
});
