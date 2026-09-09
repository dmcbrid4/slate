import assert from 'node:assert/strict';
import test from 'node:test';
import { buildScoreboardData } from '../src/application/build-scoreboard-data.ts';
import { canonicalScoreboardPresentation, canonicalSeed, CANONICAL_DEMO_NOW, LOCAL_PRIMARY_OWNER_ID } from '../src/data/canonical-seed.ts';
import { createMemoryScoreboardRepository } from '../src/data/mock-scoreboard-repository.ts';
import { ownerId } from '../src/domain/ids.ts';

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
