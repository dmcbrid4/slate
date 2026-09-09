import assert from 'node:assert/strict';
import test from 'node:test';
import {
  liveTennisFixtureListDecoder,
  liveTennisMatchDecoder,
  liveTennisMatchListDecoder,
  liveTennisPlayerDecoder,
  liveTennisScoreDecoder,
  liveTennisTournamentListDecoder,
  liveTennisUsageDecoder,
  LiveTennisDecodeError,
} from '../src/providers/live-tennis/decoder.ts';
import { createLiveTennisHttpClient, LiveTennisHttpError } from '../src/providers/live-tennis/http.ts';
import { createMappingReader } from '../src/application/normalization.ts';
import { providerId } from '../src/domain/ids.ts';
import { liveTennisNormalizer } from '../src/providers/live-tennis/normalizer.ts';
import { findLiveTennisTournament } from '../src/providers/live-tennis/tournament-registry.ts';

const score = {
  sets: [1, 0], games: [[6, 2], [4, 1]], points: ['30', null], server: 1,
  is_tiebreak: false, timestamp: '2026-09-09T15:00:00Z', sequence: 7,
  age_seconds: 4, observed_age_seconds: 2, stale: false, sources_count: 2,
};

const player = {
  id: 101, name: 'Player One', tour: 'atp', country: 'usa', ranking: 12,
  ranking_points: 2400, ranking_movement: 'up', hand: 'R', backhand: 2,
  birthday: '2000-01-02', is_doubles_team: false,
  data_completeness: { known: 5, of: 7, missing: ['height'] },
};

const match = {
  id: 501, tournament: 'Example Open', tournament_id: 'tour-44', tour: 'atp',
  surface: 'hard', indoor: false, format: 'BO3', round: 'Quarterfinal', round_code: 'QF',
  status: 'live', event_status: null, event_status_updated_at: null, gender: 'men',
  is_doubles: false, is_qualifying: false, draw: 'singles', outcome: null,
  scheduled_time: null, live_at: '2026-09-09T15:00:01Z', updated_at: '2026-09-09T15:00:02Z', has_analysis: false,
  has_market: false, players: { p1: player, p2: { ...player, id: 102, name: 'Player Two' } },
  score,
};

const meta = { limit: 25, offset: 0, count: 1, total: 1, has_more: false };

test('endpoint decoders accept the verified shapes and ignore additive fields', () => {
  assert.equal(liveTennisMatchDecoder.parse({ ...match, future_field: { value: true } }).id, 501);
  assert.equal(liveTennisMatchListDecoder.parse({ data: [match], meta, future_field: true }).data[0].players.p2.id, 102);
  assert.deepEqual(liveTennisScoreDecoder.parse(score).points, ['30', null]);
  assert.equal(liveTennisScoreDecoder.parse({ ...score, sequence: null, sources_count: null }).sequence, null);

  const fixtures = liveTennisFixtureListDecoder.parse({ data: [{
    id: 9001, match_id: 501, event_date: '2026-09-09', start_time: '2026-09-09T16:00:00Z',
    player1_id: 101, player2_id: 102, gender: 'men', is_qualifying: false, tour: 'atp',
    tournament: 'Example Open', round: 'Quarterfinal', round_code: 'QF', surface: 'hard',
    player1_name: 'Player One', player2_name: 'Player Two', reason: null, status: 'scheduled',
    updated_at: '2026-09-09T14:00:00Z',
  }], meta });
  assert.equal(fixtures.data[0].match_id, 501);
  assert.notEqual(fixtures.data[0].id, fixtures.data[0].match_id);

  const tournaments = liveTennisTournamentListDecoder.parse({ data: [{
    id: 'tour-44', name: 'Example Open', tour: 'atp', surface: 'hard', indoor: false,
    gender: 'men', city: 'Example City', country: 'US', category: 'atp_500',
    updated_at: '2026-09-09T12:00:00Z',
  }], meta });
  assert.equal(tournaments.data[0].id, 'tour-44');

  const detail = liveTennisPlayerDecoder.parse({ ...player, stats: { ratings: null, season: [] } });
  assert.equal(detail.ranking, 12);

  const usage = liveTennisUsageDecoder.parse({
    principal: 'opaque-key-reference', tier: 'free', base_tier: 'free', tier_expires_at: null,
    channel: 'direct', limits: { per_minute: 30, per_day: 100 },
    today: { calls: 8, errors: 0, remaining_day: 92 },
    history: [{ day: '2026-09-08', calls: 3, errors: 0 }], as_of: '2026-09-09T15:01:00Z',
  });
  assert.equal(usage.today.calls, 8);
});

test('decoders reject malformed IDs, enums, arrays, and timestamps with safe endpoint paths', () => {
  for (const [payload, decoder, path] of [
    [{ ...match, id: 0 }, liveTennisMatchDecoder, '$.id'],
    [{ ...match, status: 'finished' }, liveTennisMatchDecoder, '$.status'],
    [{ ...score, games: [[6], [4, 1]] }, liveTennisScoreDecoder, '$.games'],
    [{ ...score, timestamp: '2026-09-09 15:00' }, liveTennisScoreDecoder, '$.timestamp'],
  ] as const) {
    assert.throws(() => decoder.parse(payload), (error: unknown) => error instanceof LiveTennisDecodeError && error.path === path);
  }
});

test('HTTP client keeps the key in a header, opts out of caching, and returns an unknown body with rate metadata', async () => {
  const secret = 'synthetic-secret';
  let request: { input?: string; init?: RequestInit } = {};
  const fetchStub = (async (input: URL | RequestInfo, init?: RequestInit) => {
    request = { input: String(input), init };
    return new Response(JSON.stringify({ data: [], meta: { limit: 25, offset: 0, count: 0 } }), {
      status: 200,
      headers: { 'content-type': 'application/json', 'x-ratelimit-limit': '30', 'x-ratelimit-remaining': '29' },
    });
  }) as typeof fetch;
  const result = await createLiveTennisHttpClient({ apiKey: secret, fetch: fetchStub }).listMatches({ status: 'live', tour: 'atp', draw: 'singles', limit: 25 });

  assert.ok(request.input?.includes('/matches?'));
  assert.ok(!request.input?.includes(secret));
  assert.equal(new Headers(request.init?.headers).get('x-api-key'), secret);
  assert.equal(request.init?.cache, 'no-store');
  assert.equal(result.rateLimit.remaining, 29);
  assert.deepEqual(liveTennisMatchListDecoder.parse(result.body).data, []);
});

test('HTTP errors expose only structured status and rate-limit metadata', async () => {
  const secret = 'never-in-error';
  const fetchStub = (async () => new Response(JSON.stringify({
    error: 'rate_limited', scope: 'day', resets_at: '2026-09-10T00:00:00Z', detail: secret,
  }), { status: 429, headers: { 'retry-after': '60' } })) as typeof fetch;
  const client = createLiveTennisHttpClient({ apiKey: secret, fetch: fetchStub });

  await assert.rejects(client.getUsage(), (error: unknown) => {
    assert.ok(error instanceof LiveTennisHttpError);
    assert.equal(error.code, 'rate_limited');
    assert.equal(error.rateLimit.scope, 'day');
    assert.equal(error.rateLimit.retryAfterSeconds, 60);
    assert.ok(!error.message.includes(secret));
    assert.equal(Object.hasOwn(error, 'body'), false);
    return true;
  });
});

test('a merged match exposes only its validated forwarding identity', async () => {
  const fetchStub = (async () => new Response(JSON.stringify({
    error: 'merged', merged_into: 777, merged_at: '2026-09-09T15:00:00Z', detail: 'not retained',
  }), { status: 410 })) as typeof fetch;
  const client = createLiveTennisHttpClient({ apiKey: 'synthetic-secret', fetch: fetchStub });

  await assert.rejects(client.getMatch(501), (error: unknown) => {
    assert.ok(error instanceof LiveTennisHttpError);
    assert.equal(error.code, 'merged');
    assert.equal(error.mergedInto, 777);
    assert.equal(error.mergedAt, '2026-09-09T15:00:00Z');
    assert.ok(!error.message.includes('not retained'));
    return true;
  });
});

test('synthetic match and score variants cover lifecycle, event, round, draw, and nullable diagnostics', () => {
  for (const status of ['upcoming', 'live', 'completed', 'cancelled']) {
    assert.equal(liveTennisMatchDecoder.parse({ ...match, status }).status, status);
  }
  for (const event_status of ['Retired', 'Cancelled', 'Walk Over', 'Postponed', 'Interrupted']) {
    assert.equal(liveTennisMatchDecoder.parse({ ...match, event_status, event_status_updated_at: '2026-09-09T15:00:00Z' }).event_status, event_status);
  }
  for (const draw of ['singles', 'doubles', null]) {
    assert.equal(liveTennisMatchDecoder.parse({ ...match, draw }).draw, draw);
  }
  for (const round_code of ['F', 'SF', 'QF', 'R16', 'R32', 'R64', 'R128', 'RR', 'BR', 'Q', 'Q1', 'Q2', 'Q3', 'Q4', 'ER', null]) {
    assert.equal(liveTennisMatchDecoder.parse({ ...match, round_code }).round_code, round_code);
  }
  const mergerFields = liveTennisMatchDecoder.parse({ ...match, winner: 2, withdrew: 1, future_field: { ignored: true } });
  assert.equal(mergerFields.winner, 2);
  assert.equal(mergerFields.withdrew, 1);

  const tiebreak = liveTennisScoreDecoder.parse({ ...score, points: ['6', '5'], server: 2, is_tiebreak: true });
  assert.equal(tiebreak.is_tiebreak, true);
  assert.deepEqual(tiebreak.points, ['6', '5']);
  const completed = liveTennisScoreDecoder.parse({
    ...score, sets: [2, 0], games: [[6, 6], [3, 2]], points: ['0', '0'], server: 1,
    timestamp: null, sequence: null, age_seconds: null, observed_age_seconds: null, sources_count: null, stale: true,
  });
  assert.deepEqual(completed.points, ['0', '0']);
  assert.equal(completed.server, 1);
  assert.equal(completed.timestamp, null);
  assert.equal(completed.sequence, null);
  const reduced = liveTennisScoreDecoder.parse({ ...score, points: [null, null], server: null, timestamp: null });
  assert.deepEqual(reduced.points, [null, null]);
  assert.equal(reduced.server, null);
});

test('synthetic fixture, tournament, player, usage, and metadata variants preserve documented boundaries', () => {
  const fixtureBase = {
    id: 9001, match_id: 501, event_date: '2026-09-09', start_time: '2026-09-09T16:00:00Z',
    player1_id: 101, player2_id: 102, gender: 'men', is_qualifying: false, tour: 'atp',
    tournament: 'Synthetic Tournament', round: 'Quarterfinal', round_code: 'QF', surface: 'hard',
    player1_name: 'Synthetic Player A', player2_name: 'Synthetic Player B', reason: null, status: 'scheduled', updated_at: '2026-09-09T14:00:00Z',
  };
  for (const status of ['scheduled', 'live', 'finished', 'opaque-provider-state', null]) {
    const decoded = liveTennisFixtureListDecoder.parse({ data: [{ ...fixtureBase, status }], meta });
    assert.equal(decoded.data[0].status, status);
    assert.equal(decoded.data[0].match_id, 501);
    assert.notEqual(decoded.data[0].id, decoded.data[0].match_id);
  }
  const sparseFixture = liveTennisFixtureListDecoder.parse({ data: [{
    ...fixtureBase, event_date: null, start_time: null, player1_id: null, player2_id: null, gender: null,
    tour: null, tournament: null, round: null, round_code: null, surface: null, player1_name: null, player2_name: null, status: null,
  }], meta });
  assert.equal(sparseFixture.data[0].start_time, null);

  const tournament = liveTennisTournamentListDecoder.parse({ data: [{
    id: 'synthetic-tour', name: null, tour: 'wta', surface: null, indoor: false, gender: 'women', city: null, country: null,
    category: 'grand_slam', updated_at: '2026-09-09T12:00:00Z',
  }], meta: { limit: 25, offset: 0, count: 1, total: null, has_more: true } });
  assert.equal(tournament.data[0].category, 'grand_slam');
  assert.equal(tournament.meta.total, null);

  const detail = liveTennisPlayerDecoder.parse({ ...player,
    tour: null, country: null, ranking: null, ranking_points: null, ranking_movement: null, hand: null, backhand: null, birthday: null,
    data_completeness: { known: null, of: null, missing: [] }, stats: { ratings: null, seasons: [] },
  });
  assert.equal(detail.ranking, null);
  assert.deepEqual(detail.data_completeness.missing, []);
  const usage = liveTennisUsageDecoder.parse({
    principal: 'opaque-synthetic-principal', tier: 'free', base_tier: 'free', tier_expires_at: null, channel: 'direct',
    limits: { per_minute: 30, per_day: 100 }, today: { calls: 8, errors: 0, remaining_day: null },
    history: [{ day: '2026-09-08', calls: 3, errors: 0 }], as_of: '2026-09-09T15:01:00Z',
  });
  assert.equal(usage.limits.per_day, 100);
  assert.equal(usage.today.remaining_day, null);
});

test('expanded malformed matrix rejects invalid documented fields at safe paths', () => {
  const fixtureBase = {
    id: 9001, match_id: 501, event_date: null, start_time: null, player1_id: null, player2_id: null, gender: null,
    is_qualifying: false, tour: null, tournament: null, round: null, round_code: null, surface: null,
    player1_name: null, player2_name: null, reason: null, status: null, updated_at: '2026-09-09T14:00:00Z',
  };
  for (const [payload, decoder, path] of [
    [{ ...match, event_status: 'Suspended' }, liveTennisMatchDecoder, '$.event_status'],
    [{ ...match, round_code: 'R4' }, liveTennisMatchDecoder, '$.round_code'],
    [{ ...match, winner: 3 }, liveTennisMatchDecoder, '$.winner'],
    [{ ...score, points: ['15'] }, liveTennisScoreDecoder, '$.points'],
    [{ ...score, server: 3 }, liveTennisScoreDecoder, '$.server'],
    [{ data: [{ ...fixtureBase, match_id: 0 }], meta }, liveTennisFixtureListDecoder, '$.data[0].match_id'],
    [{ data: [{ id: 'synthetic', name: null, tour: null, surface: null, indoor: false, gender: null, city: null, country: null, category: 'major', updated_at: '2026-09-09T12:00:00Z' }], meta }, liveTennisTournamentListDecoder, '$.data[0].category'],
    [{ ...player, data_completeness: { known: 1, of: 1, missing: [null] }, stats: {} }, liveTennisPlayerDecoder, '$.data_completeness.missing[0]'],
    [{ principal: 'synthetic', tier: 'free', base_tier: 'free', tier_expires_at: null, channel: 'direct', limits: {}, today: {}, history: [], as_of: '2026-09-09T15:00:00Z' }, liveTennisUsageDecoder, '$.limits.per_minute'],
  ] as const) {
    assert.throws(() => decoder.parse(payload), (error: unknown) => error instanceof LiveTennisDecodeError && error.path === path);
  }
});

test('HTTP client covers all documented route shapes and structured failures', async () => {
  const requests: { url: URL; init?: RequestInit }[] = [];
  const fetchStub = (async (input: URL | RequestInfo, init?: RequestInit) => {
    requests.push({ url: new URL(String(input)), init });
    return new Response(JSON.stringify({ data: [], meta: { limit: 25, offset: 0, count: 0 } }), { status: 200 });
  }) as typeof fetch;
  const client = createLiveTennisHttpClient({ apiKey: 'synthetic-secret', fetch: fetchStub });
  await client.listMatches({ status: 'live', tour: 'atp', draw: 'singles', limit: 25, offset: 2 });
  await client.getMatch(501); await client.getScore(501); await client.listFixtures({ tour: 'wta' });
  await client.listTournaments({ tour: 'atp', draw: 'singles', search: 'synthetic' });
  await client.getTournament('tour / 44'); await client.getPlayer(101); await client.getUsage();
  assert.deepEqual(requests.map(({ url }) => `${url.pathname}${url.search}`), [
    '/api/public/v1/matches?status=live&limit=25&offset=2&tour=atp&draw=singles', '/api/public/v1/matches/501',
    '/api/public/v1/matches/501/score', '/api/public/v1/fixtures?tour=wta',
    '/api/public/v1/tournaments?tour=atp&draw=singles&search=synthetic', '/api/public/v1/tournaments/tour%20%2F%2044',
    '/api/public/v1/players/101', '/api/public/v1/usage',
  ]);
  for (const { url, init } of requests) {
    assert.ok(!url.toString().includes('synthetic-secret'));
    assert.equal(new Headers(init?.headers).get('x-api-key'), 'synthetic-secret');
    assert.equal(init?.cache, 'no-store');
  }

  for (const [status, body, code] of [[401, {}, 'unauthorized'], [403, {}, 'forbidden'], [404, {}, 'not_found'], [500, {}, 'http_error'], [429, { error: 'rate_limited', scope: 'day', resets_at: '2026-09-10T00:00:00Z' }, 'rate_limited']] as const) {
    const failing = createLiveTennisHttpClient({ apiKey: 'synthetic-secret', fetch: (async () => new Response(JSON.stringify(body), {
      status, headers: { 'retry-after': '60', 'x-ratelimit-remaining': '0' },
    })) as typeof fetch });
    await assert.rejects(failing.getUsage(), (error: unknown) => error instanceof LiveTennisHttpError && error.code === code && error.status === status && error.rateLimit.retryAfterSeconds === 60);
  }
  const malformedForward = createLiveTennisHttpClient({ apiKey: 'synthetic-secret', fetch: (async () => new Response(JSON.stringify({ merged_into: 0, merged_at: 'bad' }), { status: 410 })) as typeof fetch });
  await assert.rejects(malformedForward.getMatch(501), (error: unknown) => error instanceof LiveTennisHttpError && error.code === 'merged' && error.mergedInto === null && error.mergedAt === null);
});

test('reviewed tournament registry unifies provider members and normalizes truthful tennis state', () => {
  assert.equal(findLiveTennisTournament('1217')?.competitionGroupId, findLiveTennisTournament('1218')?.competitionGroupId);
  assert.equal(findLiveTennisTournament('unreviewed'), undefined);

  const typedMatch = liveTennisMatchDecoder.parse(match);
  const fixture = liveTennisFixtureListDecoder.parse({ data: [{
    id: 9001, match_id: 501, event_date: '2026-09-09', start_time: '2026-09-09T16:00:00Z',
    player1_id: 101, player2_id: 102, gender: 'men', is_qualifying: false, tour: 'atp',
    tournament: 'A provider display name is not identity', round: 'Quarterfinal', round_code: 'QF', surface: 'hard',
    player1_name: 'Player One', player2_name: 'Player Two', reason: null, status: 'scheduled', updated_at: '2026-09-09T14:00:00Z',
  }], meta }).data[0];
  const batch = liveTennisNormalizer.normalize({
    matches: [{ ...typedMatch, tournament_id: '1217', tournament: 'A changed provider display name', scheduled_time: null, score: { ...typedMatch.score!, points: ['30', '15'] as const } }],
    fixtures: [fixture],
  }, { providerId: providerId('live-tennis'), observedAt: '2026-09-09T15:01:00Z', mappings: createMappingReader([]) });

  const competition = batch.records.find(write => write.type === 'competition');
  const event = batch.records.find(write => write.type === 'event');
  assert.equal(competition?.type, 'competition');
  assert.equal(competition?.record.id, 'us-open-atp');
  assert.equal(competition?.record.competitionGroupId, 'us-open');
  assert.equal(event?.type, 'event');
  if (event?.type === 'event' && event.record.sportId === 'tennis') {
    assert.equal(event.record.startsAt, fixture.start_time);
    assert.deepEqual(event.record.state.points, ['30', '15']);
    assert.equal(event.record.state.servingParticipantId, 'live-tennis-player-101');
  }
  assert.equal(batch.warnings.length, 0);

  const finalBatch = liveTennisNormalizer.normalize({
    matches: [{ ...typedMatch, tournament_id: '1217', status: 'completed', scheduled_time: fixture.start_time, score: { ...typedMatch.score!, points: ['0', '0'] as const, server: 1 } }],
    fixtures: [],
  }, { providerId: providerId('live-tennis'), observedAt: '2026-09-09T15:02:00Z', mappings: createMappingReader([]) });
  const finalEvent = finalBatch.records.find(write => write.type === 'event');
  assert.equal(finalEvent?.type, 'event');
  if (finalEvent?.type === 'event' && finalEvent.record.sportId === 'tennis') {
    assert.equal(finalEvent.record.state.points, undefined);
    assert.equal(finalEvent.record.state.servingParticipantId, undefined);
  }
});

test('normalizer skips unknown and excluded tennis records with structured warnings', () => {
  const typedMatch = liveTennisMatchDecoder.parse(match);
  const batch = liveTennisNormalizer.normalize({
    matches: [
      { ...typedMatch, tournament_id: 'unreviewed', scheduled_time: '2026-09-09T16:00:00Z' },
      { ...typedMatch, id: 502, draw: 'doubles', is_doubles: true, tournament_id: '1217', scheduled_time: '2026-09-09T17:00:00Z' },
      { ...typedMatch, id: 503, tournament_id: null, scheduled_time: '2026-09-09T18:00:00Z' },
    ], fixtures: [],
  }, { providerId: providerId('live-tennis'), observedAt: '2026-09-09T15:01:00Z', mappings: createMappingReader([]) });
  assert.deepEqual(batch.records, []);
  assert.deepEqual(batch.warnings.map(warning => warning.code), ['unsupported_tournament', 'out_of_scope_match', 'unsupported_tournament']);
});
