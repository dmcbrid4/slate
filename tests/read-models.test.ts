import assert from 'node:assert/strict';
import test from 'node:test';
import { canonicalScoreboardPresentation, canonicalSeed } from '../src/data/canonical-seed.ts';
import { fixtures } from '../src/data/fixtures.ts';
import { createScoreboardProjector, projectScoreboardEvents } from '../src/read-models/project-scoreboard.ts';

function withoutLegacyFollows() {
  return fixtures.map(({ follows, ...event }) => {
    assert.ok(Array.isArray(follows));
    return event;
  });
}

function withoutNewFields() {
  return projectScoreboardEvents(canonicalSeed, canonicalScoreboardPresentation).map(event => {
    if (event.sport !== 'tennis') return event;
    const { bestOf, ...legacyShape } = event;
    assert.ok(bestOf === 3 || bestOf === 5);
    return legacyShape;
  });
}

test('canonical seed is complete and projects every Phase 0 event', () => {
  const projected = projectScoreboardEvents(canonicalSeed, canonicalScoreboardPresentation);
  assert.equal(projected.length, fixtures.length);
  assert.deepEqual(new Set(projected.map(event => event.id)), new Set(fixtures.map(event => event.id)));
  assert.deepEqual(new Set(canonicalSeed.events.map(event => event.sportId)), new Set(['soccer', 'tennis', 'baseball', 'football']));
});

test('canonical scoreboard projection preserves the proven Phase 0 card data', () => {
  assert.deepEqual(withoutNewFields(), withoutLegacyFollows());
});

test('US Open competitions project through one stable competition group', () => {
  const projected = projectScoreboardEvents(canonicalSeed, canonicalScoreboardPresentation).filter(event => event.sport === 'tennis');
  assert.ok(projected.length > 0);
  assert.ok(projected.some(event => event.category === 'Men'));
  assert.ok(projected.some(event => event.category === 'Women'));
  assert.ok(projected.every(event => event.competition === 'US Open' && event.competitionId === 'us-open'));
});

test('projector resolves structured live state into sport-specific presentation', () => {
  const project = createScoreboardProjector(canonicalSeed, canonicalScoreboardPresentation);
  const tennis = project(canonicalSeed.events.find(event => event.id === 'alcaraz-sinner')!);
  const baseball = project(canonicalSeed.events.find(event => event.id === 'nyy-bos')!);
  const football = project(canonicalSeed.events.find(event => event.id === 'ne-buf')!);
  const soccer = project(canonicalSeed.events.find(event => event.id === 'tot-liv')!);

  assert.equal(tennis.sport === 'tennis' ? tennis.duration : undefined, '1h 42m');
  assert.equal(tennis.sport === 'tennis' ? tennis.server : undefined, 1);
  assert.equal(baseball.sport === 'baseball' ? baseball.count : undefined, '1–2');
  assert.deepEqual(baseball.sport === 'baseball' ? baseball.pitchers : undefined, ['Gerrit Cole', 'Garrett Crochet']);
  assert.equal(football.sport === 'football' ? football.situation : undefined, '2nd & 7 · NE 42');
  assert.deepEqual(soccer.sport === 'soccer' ? soccer.goals.map(goal => goal.player) : [], ['Solanke', 'Salah', 'Kulusevski']);
});

test('projector falls back to canonical identity when optional presentation metadata is absent', () => {
  const project = createScoreboardProjector(canonicalSeed, {});
  const soccer = project(canonicalSeed.events.find(event => event.id === 'tot-liv')!);
  const tennis = project(canonicalSeed.events.find(event => event.id === 'alcaraz-sinner')!);

  assert.equal(soccer.participants[0].name, 'Tottenham Hotspur');
  assert.equal(soccer.participants[0].short, 'Tottenham');
  assert.equal(soccer.participants[0].mark, 'T');
  assert.equal(soccer.participants[0].color, 'neutral');
  assert.equal(tennis.participants[0].mark, 'ES');
  assert.equal(tennis.context, undefined);
});
