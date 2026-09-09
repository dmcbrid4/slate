import assert from 'node:assert/strict';
import test from 'node:test';
import { projectScoreboardData } from '../src/application/build-scoreboard-data.ts';
import { canonicalScoreboardPresentation, canonicalSeed, CANONICAL_DEMO_NOW } from '../src/data/canonical-seed.ts';
import { defaultFollowing, entities } from '../src/data/entities.ts';
import { DEMO_NOW, fixtures } from '../src/data/fixtures.ts';
import { isPersonal, selectScoreboardEvents } from '../src/data/scoreboard.ts';
import { DEFAULT_SCORE_ROUTE, parseScoreRoute } from '../src/lib/navigation.ts';
import { dateKey, formatFullDay, reorderFollowing, selectedDate, swipeDestination } from '../src/lib/scores.ts';
import { parsePreferences } from '../src/lib/preferences.ts';

const zone = 'America/New_York';
const scoreboardData = projectScoreboardData(canonicalSeed, {
  presentation: canonicalScoreboardPresentation,
  asOf: CANONICAL_DEMO_NOW,
});

test('For You deduplicates overlapping team, player, tour, and competition follows', () => {
  const followed = [...defaultFollowing, 'alcaraz', 'sinner', 'us-open'];
  const selected = selectScoreboardEvents(scoreboardData, 'for-you', followed, 'today', zone, DEMO_NOW);
  assert.equal(selected.filter(event => event.id === 'tot-liv').length, 1);
  assert.equal(selected.filter(event => event.id === 'alcaraz-sinner').length, 1);
  assert.equal(selected.length, new Set(selected.map(event => event.id)).size);

  const tennis = selected.find(event => event.id === 'alcaraz-sinner');
  assert.ok(tennis);
  assert.deepEqual(tennis.relevance.matches.map(match => match.target.type), [
    'collection',
    'participant',
    'participant',
    'competition_group',
  ]);
  assert.equal(tennis.relevance.primaryMatch?.target.type, 'participant');
  assert.equal(tennis.relevance.matches[0].via?.type, 'competition_group');
});

test('direct team and player follows precede broad league follows', () => {
  const selected = selectScoreboardEvents(scoreboardData, 'for-you', defaultFollowing, 'today', zone, DEMO_NOW);
  assert.ok(isPersonal(selected[0]));
  const lastPersonal = selected.findLastIndex(event => isPersonal(event));
  const firstBroad = selected.findIndex(event => !isPersonal(event));
  assert.ok(lastPersonal < firstBroad);
});

test('following/unfollowing changes relevance without hiding an overlapping league follow', () => {
  assert.equal(selectScoreboardEvents(scoreboardData, 'for-you', [], 'today', zone, DEMO_NOW).length, 0);
  const leagueOnly = selectScoreboardEvents(scoreboardData, 'for-you', ['premier-league'], 'today', zone, DEMO_NOW);
  assert.ok(leagueOnly.some(event => event.id === 'tot-liv'));
  assert.ok(!leagueOnly.some(event => event.id === 'nyy-bos'));

  const teamAndLeague = selectScoreboardEvents(scoreboardData, 'for-you', ['tottenham', 'premier-league'], 'today', zone, DEMO_NOW);
  const tottenham = teamAndLeague.find(event => event.id === 'tot-liv');
  assert.ok(tottenham);
  assert.equal(teamAndLeague.filter(event => event.id === 'tot-liv').length, 1);
  assert.deepEqual(tottenham.relevance.matches.map(match => match.target.type), ['participant', 'competition']);
});

test('ATP/WTA and US Open combine both tours by default', () => {
  for (const destination of ['atp-wta', 'us-open']) {
    const selected = selectScoreboardEvents(scoreboardData, destination, [], 'today', zone, DEMO_NOW);
    assert.deepEqual(new Set(selected.map(event => event.sport === 'tennis' ? event.category : null)), new Set(['Men', 'Women']));
  }
});

test('all scheduled/live/final states are represented for each sport', () => {
  for (const sport of ['soccer', 'tennis', 'baseball', 'football']) {
    assert.deepEqual(new Set(fixtures.filter(event => event.sport === sport).map(event => event.status)), new Set(['scheduled', 'live', 'final']));
  }
});

test('midnight UTC events appear on the viewer’s local calendar date', () => {
  const event = fixtures.find(event => event.id === 'bal-kc');
  assert.ok(event);
  assert.equal(dateKey(event.start, zone), '2026-09-07');
  assert.equal(dateKey(event.start, 'Asia/Tokyo'), '2026-09-08');
  assert.ok(selectScoreboardEvents(scoreboardData, 'nfl', [], 'tomorrow', zone, DEMO_NOW).some(item => item.id === event.id));
  assert.ok(selectScoreboardEvents(scoreboardData, 'nfl', [], 'tomorrow', 'Asia/Tokyo', DEMO_NOW).some(item => item.id === event.id));
});

test('date controls use calendar days across DST, year changes, and extreme offsets', () => {
  assert.equal(selectedDate('2026-03-08T16:00:00Z', 'yesterday', zone), '2026-03-07');
  assert.equal(selectedDate('2026-03-08T16:00:00Z', 'tomorrow', zone), '2026-03-09');
  assert.equal(selectedDate('2026-11-01T16:00:00Z', 'yesterday', zone), '2026-10-31');
  assert.equal(selectedDate('2026-12-31T23:30:00Z', 'today', 'Pacific/Kiritimati'), '2027-01-01');
  assert.equal(selectedDate('2027-01-01T06:00:00Z', 'yesterday', zone), '2026-12-31');
  assert.equal(formatFullDay('2027-01-01'), 'Friday, January 1, 2027');
});

test('reordering follows changes only order and respects both boundaries', () => {
  const initial = ['atp-wta', 'tottenham', 'nfl'];
  assert.deepEqual(reorderFollowing(initial, 'tottenham', -1), ['tottenham', 'atp-wta', 'nfl']);
  assert.deepEqual(reorderFollowing(initial, 'tottenham', 1), ['atp-wta', 'nfl', 'tottenham']);
  assert.deepEqual(reorderFollowing(initial, 'atp-wta', -1), initial);
  assert.deepEqual(reorderFollowing(initial, 'nfl', 1), initial);
  assert.deepEqual(reorderFollowing(initial, 'unknown', 1), initial);
  assert.deepEqual(initial, ['atp-wta', 'tottenham', 'nfl']);
});

test('page swipes follow the user’s order and ignore vertical movement, taps, and rail edges', () => {
  const follows = ['nfl', 'tottenham'];
  assert.equal(swipeDestination('for-you', follows, -100, 10), 'nfl');
  assert.equal(swipeDestination('nfl', follows, -100, 10), 'tottenham');
  assert.equal(swipeDestination('nfl', follows, 100, 10), 'for-you');
  assert.equal(swipeDestination('nfl', follows, 10, 5), undefined);
  assert.equal(swipeDestination('nfl', follows, 100, 130), undefined);
  assert.equal(swipeDestination('for-you', follows, 100, 0), undefined);
  assert.equal(swipeDestination('tottenham', follows, -100, 0), undefined);
  assert.equal(swipeDestination('us-open', follows, -100, 0), undefined);
});

test('score routes preserve valid destinations and days while rejecting invalid history sources', () => {
  assert.deepEqual(parseScoreRoute('/scores/tottenham/tomorrow'), {
    destination: 'tottenham',
    day: 'tomorrow',
    path: '/scores/tottenham/tomorrow',
  });
  assert.equal(parseScoreRoute('/scores/missing/today'), undefined);
  assert.equal(parseScoreRoute('/scores/tottenham/next-week'), undefined);
  assert.equal(parseScoreRoute('/search'), undefined);
  assert.deepEqual(parseScoreRoute(DEFAULT_SCORE_ROUTE), {
    destination: 'for-you',
    day: 'today',
    path: DEFAULT_SCORE_ROUTE,
  });
});

test('stored preferences tolerate corruption and preserve intentional empty follows', () => {
  assert.deepEqual(parsePreferences('{broken').following, defaultFollowing);
  assert.deepEqual(parsePreferences('null').following, defaultFollowing);
  assert.deepEqual(parsePreferences('{"following":[],"theme":"dark"}'), { following: [], theme: 'dark' });
  assert.deepEqual(parsePreferences('{"following":["nfl","nfl","missing","__proto__",123],"theme":"invalid"}'), { following: ['nfl'], theme: 'system' });
});

test('fixtures have valid dates, unique IDs, known follow targets, and consistent line scores', () => {
  assert.equal(new Set(fixtures.map(event => event.id)).size, fixtures.length);
  const ids = new Set(entities.map(entity => entity.id));
  for (const event of fixtures) {
    assert.ok(Number.isFinite(Date.parse(event.start)), event.id);
    assert.ok(event.follows.every(id => ids.has(id)), event.id);
    if (event.context) assert.ok(event.context.length < 85, event.id);
    const periods = event.sport === 'baseball' ? event.innings : event.sport === 'football' ? event.quarters : undefined;
    if (periods && 'score' in event) {
      assert.deepEqual(periods.map(row => row.reduce((sum, value) => sum + value, 0)), event.score, event.id);
    }
  }
});
