import type { ProviderDecoder } from '../../application/normalization.ts';
import {
  liveTennisDraws,
  liveTennisEventStatuses,
  liveTennisMatchStatuses,
  liveTennisRoundCodes,
  liveTennisTournamentCategories,
  liveTennisTours,
  type LiveTennisFixture,
  type LiveTennisFixtureList,
  type LiveTennisListMeta,
  type LiveTennisMatch,
  type LiveTennisMatchList,
  type LiveTennisPlayer,
  type LiveTennisPlayerCompleteness,
  type LiveTennisPlayerDetail,
  type LiveTennisScore,
  type LiveTennisTournament,
  type LiveTennisTournamentList,
  type LiveTennisUsage,
} from './types.ts';

export type LiveTennisEndpoint = 'matches' | 'match' | 'score' | 'fixtures' | 'tournaments' | 'tournament' | 'player' | 'usage';

export class LiveTennisDecodeError extends Error {
  readonly code = 'invalid_provider_payload';
  readonly endpoint: LiveTennisEndpoint;
  readonly path: string;

  constructor(endpoint: LiveTennisEndpoint, path: string, detail: string) {
    super(`Live Tennis API ${endpoint} response failed validation at ${path}: ${detail}`);
    this.name = 'LiveTennisDecodeError';
    this.endpoint = endpoint;
    this.path = path;
  }
}

type Context = { readonly endpoint: LiveTennisEndpoint };

function fail(context: Context, path: string, detail: string): never {
  throw new LiveTennisDecodeError(context.endpoint, path, detail);
}

function record(value: unknown, path: string, context: Context): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) fail(context, path, 'expected an object');
  return value as Record<string, unknown>;
}

function array(value: unknown, path: string, context: Context): readonly unknown[] {
  if (!Array.isArray(value)) fail(context, path, 'expected an array');
  return value;
}

function string(value: unknown, path: string, context: Context): string {
  if (typeof value !== 'string' || !value.trim()) fail(context, path, 'expected a non-empty string');
  return value;
}

function nullableString(value: unknown, path: string, context: Context): string | null {
  return value === null ? null : string(value, path, context);
}

function integer(value: unknown, path: string, context: Context, minimum = 0): number {
  if (!Number.isSafeInteger(value) || (value as number) < minimum) fail(context, path, `expected an integer of at least ${minimum}`);
  return value as number;
}

function nullableInteger(value: unknown, path: string, context: Context, minimum = 0): number | null {
  return value === null ? null : integer(value, path, context, minimum);
}

function boolean(value: unknown, path: string, context: Context): boolean {
  if (typeof value !== 'boolean') fail(context, path, 'expected a boolean');
  return value;
}

function oneOf<T extends string | number>(value: unknown, allowed: readonly T[], path: string, context: Context): T {
  if (!allowed.includes(value as T)) fail(context, path, `expected one of ${allowed.join(', ')}`);
  return value as T;
}

function nullableOneOf<T extends string | number>(value: unknown, allowed: readonly T[], path: string, context: Context): T | null {
  return value === null ? null : oneOf(value, allowed, path, context);
}

function instant(value: unknown, path: string, context: Context): string {
  const result = string(value, path, context);
  if (!result.endsWith('Z') || !Number.isFinite(Date.parse(result))) fail(context, path, 'expected a UTC ISO 8601 timestamp');
  return result;
}

function nullableInstant(value: unknown, path: string, context: Context): string | null {
  return value === null ? null : instant(value, path, context);
}

function date(value: unknown, path: string, context: Context): string {
  const result = string(value, path, context);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(result) || Number.isNaN(Date.parse(`${result}T00:00:00Z`))) fail(context, path, 'expected a calendar date');
  return result;
}

function nullableDate(value: unknown, path: string, context: Context): string | null {
  return value === null ? null : date(value, path, context);
}

function optional<T>(source: Record<string, unknown>, key: string, parse: (value: unknown) => T): T | undefined {
  return source[key] === undefined ? undefined : parse(source[key]);
}

function parseMeta(value: unknown, path: string, context: Context): LiveTennisListMeta {
  const meta = record(value, path, context);
  return {
    limit: integer(meta.limit, `${path}.limit`, context),
    offset: integer(meta.offset, `${path}.offset`, context),
    count: integer(meta.count, `${path}.count`, context),
    total: optional(meta, 'total', item => nullableInteger(item, `${path}.total`, context)),
    has_more: optional(meta, 'has_more', item => boolean(item, `${path}.has_more`, context)),
  };
}

function parseCompleteness(value: unknown, path: string, context: Context): LiveTennisPlayerCompleteness {
  const completeness = record(value, path, context);
  return {
    known: nullableInteger(completeness.known, `${path}.known`, context),
    of: nullableInteger(completeness.of, `${path}.of`, context),
    missing: array(completeness.missing, `${path}.missing`, context).map((item, index) => string(item, `${path}.missing[${index}]`, context)),
    note: optional(completeness, 'note', item => string(item, `${path}.note`, context)),
  };
}

function parsePlayer(value: unknown, path: string, context: Context): LiveTennisPlayer {
  const player = record(value, path, context);
  return {
    id: integer(player.id, `${path}.id`, context, 1),
    name: string(player.name, `${path}.name`, context),
    tour: nullableString(player.tour, `${path}.tour`, context),
    country: nullableString(player.country, `${path}.country`, context),
    ranking: nullableInteger(player.ranking, `${path}.ranking`, context, 1),
    ranking_points: nullableInteger(player.ranking_points, `${path}.ranking_points`, context),
    ranking_movement: nullableOneOf(player.ranking_movement, ['up', 'down', 'same'] as const, `${path}.ranking_movement`, context),
    hand: nullableOneOf(player.hand, ['R', 'L'] as const, `${path}.hand`, context),
    backhand: nullableOneOf(player.backhand, [1, 2] as const, `${path}.backhand`, context),
    birthday: nullableDate(player.birthday, `${path}.birthday`, context),
    is_doubles_team: boolean(player.is_doubles_team, `${path}.is_doubles_team`, context),
    data_completeness: parseCompleteness(player.data_completeness, `${path}.data_completeness`, context),
  };
}

function sideArray(value: unknown, path: string, context: Context, parse: (item: unknown, path: string) => number | string | null): readonly [number | string | null, number | string | null] {
  const values = array(value, path, context);
  if (values.length !== 2) fail(context, path, 'expected exactly two player values');
  return [parse(values[0], `${path}[0]`), parse(values[1], `${path}[1]`)];
}

function parseScore(value: unknown, path: string, context: Context): LiveTennisScore {
  const score = record(value, path, context);
  const sets = sideArray(score.sets, `${path}.sets`, context, (item, itemPath) => integer(item, itemPath, context));
  const games = array(score.games, `${path}.games`, context);
  if (games.length !== 2) fail(context, `${path}.games`, 'expected exactly two player game arrays');
  const gameSides = games.map((side, sideIndex) => array(side, `${path}.games[${sideIndex}]`, context).map((item, index) => integer(item, `${path}.games[${sideIndex}][${index}]`, context)));
  if (gameSides[0].length !== gameSides[1].length) fail(context, `${path}.games`, 'expected equal per-player set counts');
  const points = sideArray(score.points, `${path}.points`, context, (item, itemPath) => item === null ? null : string(item, itemPath, context));
  return {
    sets: sets as readonly [number, number],
    games: gameSides as unknown as readonly [readonly number[], readonly number[]],
    points: points as readonly [string | null, string | null],
    server: nullableOneOf(score.server, [1, 2] as const, `${path}.server`, context),
    is_tiebreak: boolean(score.is_tiebreak, `${path}.is_tiebreak`, context),
    timestamp: nullableInstant(score.timestamp, `${path}.timestamp`, context),
    age_seconds: optional(score, 'age_seconds', item => nullableInteger(item, `${path}.age_seconds`, context)),
    observed_age_seconds: optional(score, 'observed_age_seconds', item => nullableInteger(item, `${path}.observed_age_seconds`, context)),
    sequence: optional(score, 'sequence', item => nullableInteger(item, `${path}.sequence`, context)),
    stale: optional(score, 'stale', item => boolean(item, `${path}.stale`, context)),
    sources_count: optional(score, 'sources_count', item => nullableInteger(item, `${path}.sources_count`, context)),
  };
}

function parseMatch(value: unknown, path: string, context: Context): LiveTennisMatch {
  const match = record(value, path, context);
  const players = record(match.players, `${path}.players`, context);
  return {
    id: integer(match.id, `${path}.id`, context, 1),
    tournament: string(match.tournament, `${path}.tournament`, context),
    tournament_id: match.tournament_id === null ? null : string(match.tournament_id, `${path}.tournament_id`, context),
    tour: nullableOneOf(match.tour, liveTennisTours, `${path}.tour`, context),
    surface: nullableOneOf(match.surface, ['hard', 'clay', 'grass'] as const, `${path}.surface`, context),
    indoor: boolean(match.indoor, `${path}.indoor`, context),
    format: nullableOneOf(match.format, ['BO3', 'BO5'] as const, `${path}.format`, context),
    round: nullableString(match.round, `${path}.round`, context),
    round_code: nullableOneOf(match.round_code, liveTennisRoundCodes, `${path}.round_code`, context),
    status: oneOf(match.status, liveTennisMatchStatuses, `${path}.status`, context),
    event_status: nullableOneOf(match.event_status, liveTennisEventStatuses, `${path}.event_status`, context),
    event_status_updated_at: nullableInstant(match.event_status_updated_at, `${path}.event_status_updated_at`, context),
    gender: nullableOneOf(match.gender, ['men', 'women'] as const, `${path}.gender`, context),
    is_doubles: boolean(match.is_doubles, `${path}.is_doubles`, context),
    is_qualifying: boolean(match.is_qualifying, `${path}.is_qualifying`, context),
    draw: nullableOneOf(match.draw, liveTennisDraws, `${path}.draw`, context),
    outcome: nullableString(match.outcome, `${path}.outcome`, context),
    scheduled_time: nullableInstant(match.scheduled_time, `${path}.scheduled_time`, context),
    live_at: optional(match, 'live_at', item => nullableInstant(item, `${path}.live_at`, context)),
    updated_at: instant(match.updated_at, `${path}.updated_at`, context),
    has_analysis: boolean(match.has_analysis, `${path}.has_analysis`, context),
    has_market: boolean(match.has_market, `${path}.has_market`, context),
    players: { p1: parsePlayer(players.p1, `${path}.players.p1`, context), p2: parsePlayer(players.p2, `${path}.players.p2`, context) },
    score: match.score === null ? null : parseScore(match.score, `${path}.score`, context),
    winner: optional(match, 'winner', item => nullableOneOf(item, [1, 2] as const, `${path}.winner`, context)),
    withdrew: optional(match, 'withdrew', item => nullableOneOf(item, [1, 2] as const, `${path}.withdrew`, context)),
  };
}

function parseList<T>(input: unknown, context: Context, parseItem: (item: unknown, path: string, context: Context) => T): { readonly data: readonly T[]; readonly meta: LiveTennisListMeta } {
  const payload = record(input, '$', context);
  return {
    data: array(payload.data, '$.data', context).map((item, index) => parseItem(item, `$.data[${index}]`, context)),
    meta: parseMeta(payload.meta, '$.meta', context),
  };
}

function parseFixture(value: unknown, path: string, context: Context): LiveTennisFixture {
  const fixture = record(value, path, context);
  return {
    id: integer(fixture.id, `${path}.id`, context, 1),
    match_id: integer(fixture.match_id, `${path}.match_id`, context, 1),
    event_date: nullableDate(fixture.event_date, `${path}.event_date`, context),
    start_time: nullableInstant(fixture.start_time, `${path}.start_time`, context),
    player1_id: nullableInteger(fixture.player1_id, `${path}.player1_id`, context, 1),
    player2_id: nullableInteger(fixture.player2_id, `${path}.player2_id`, context, 1),
    gender: nullableOneOf(fixture.gender, ['men', 'women'] as const, `${path}.gender`, context),
    is_qualifying: boolean(fixture.is_qualifying, `${path}.is_qualifying`, context),
    tour: nullableString(fixture.tour, `${path}.tour`, context),
    tournament: nullableString(fixture.tournament, `${path}.tournament`, context),
    round: nullableString(fixture.round, `${path}.round`, context),
    round_code: nullableOneOf(fixture.round_code, liveTennisRoundCodes, `${path}.round_code`, context),
    surface: nullableString(fixture.surface, `${path}.surface`, context),
    player1_name: nullableString(fixture.player1_name, `${path}.player1_name`, context),
    player2_name: nullableString(fixture.player2_name, `${path}.player2_name`, context),
    reason: nullableString(fixture.reason, `${path}.reason`, context),
    status: nullableString(fixture.status, `${path}.status`, context),
    updated_at: instant(fixture.updated_at, `${path}.updated_at`, context),
  };
}

function parseTournament(value: unknown, path: string, context: Context): LiveTennisTournament {
  const tournament = record(value, path, context);
  return {
    id: string(tournament.id, `${path}.id`, context),
    name: nullableString(tournament.name, `${path}.name`, context),
    tour: nullableOneOf(tournament.tour, liveTennisTours, `${path}.tour`, context),
    surface: nullableOneOf(tournament.surface, ['hard', 'clay', 'grass'] as const, `${path}.surface`, context),
    indoor: boolean(tournament.indoor, `${path}.indoor`, context),
    gender: nullableOneOf(tournament.gender, ['men', 'women'] as const, `${path}.gender`, context),
    city: nullableString(tournament.city, `${path}.city`, context),
    country: nullableString(tournament.country, `${path}.country`, context),
    category: nullableOneOf(tournament.category, liveTennisTournamentCategories, `${path}.category`, context),
    updated_at: instant(tournament.updated_at, `${path}.updated_at`, context),
  };
}

function parseUsage(input: unknown): LiveTennisUsage {
  const context = { endpoint: 'usage' as const };
  const usage = record(input, '$', context);
  const limits = record(usage.limits, '$.limits', context);
  const today = record(usage.today, '$.today', context);
  return {
    principal: string(usage.principal, '$.principal', context),
    tier: oneOf(usage.tier, ['free', 'basic', 'pro', 'ultra'] as const, '$.tier', context),
    base_tier: string(usage.base_tier, '$.base_tier', context),
    tier_expires_at: nullableInstant(usage.tier_expires_at, '$.tier_expires_at', context),
    channel: string(usage.channel, '$.channel', context),
    limits: { per_minute: nullableInteger(limits.per_minute, '$.limits.per_minute', context), per_day: nullableInteger(limits.per_day, '$.limits.per_day', context) },
    today: {
      calls: integer(today.calls, '$.today.calls', context),
      errors: integer(today.errors, '$.today.errors', context),
      remaining_day: nullableInteger(today.remaining_day, '$.today.remaining_day', context),
    },
    history: array(usage.history, '$.history', context).map((item, index) => {
      const entry = record(item, `$.history[${index}]`, context);
      return { day: date(entry.day, `$.history[${index}].day`, context), calls: integer(entry.calls, `$.history[${index}].calls`, context), errors: integer(entry.errors, `$.history[${index}].errors`, context) };
    }),
    as_of: instant(usage.as_of, '$.as_of', context),
  };
}

export const liveTennisMatchListDecoder: ProviderDecoder<LiveTennisMatchList> = {
  parse: input => parseList(input, { endpoint: 'matches' }, parseMatch),
};
export const liveTennisMatchDecoder: ProviderDecoder<LiveTennisMatch> = {
  parse: input => parseMatch(input, '$', { endpoint: 'match' }),
};
export const liveTennisScoreDecoder: ProviderDecoder<LiveTennisScore> = {
  parse: input => parseScore(input, '$', { endpoint: 'score' }),
};
export const liveTennisFixtureListDecoder: ProviderDecoder<LiveTennisFixtureList> = {
  parse: input => parseList(input, { endpoint: 'fixtures' }, parseFixture),
};
export const liveTennisTournamentListDecoder: ProviderDecoder<LiveTennisTournamentList> = {
  parse: input => parseList(input, { endpoint: 'tournaments' }, parseTournament),
};
export const liveTennisTournamentDecoder: ProviderDecoder<LiveTennisTournament> = {
  parse: input => parseTournament(input, '$', { endpoint: 'tournament' }),
};
export const liveTennisPlayerDecoder: ProviderDecoder<LiveTennisPlayerDetail> = {
  parse(input) {
    const context = { endpoint: 'player' as const };
    const payload = record(input, '$', context);
    const player = parsePlayer(payload, '$', context);
    return { ...player, stats: record(payload.stats, '$.stats', context) };
  },
};
export const liveTennisUsageDecoder: ProviderDecoder<LiveTennisUsage> = { parse: parseUsage };
