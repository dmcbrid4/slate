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
