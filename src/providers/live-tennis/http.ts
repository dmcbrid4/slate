import type { LiveTennisDraw, LiveTennisMatchStatus, LiveTennisTour } from './types.ts';

export const LIVE_TENNIS_BASE_URL = 'https://api.livetennisapi.com/api/public/v1';

export type LiveTennisHttpEndpoint = 'matches' | 'match' | 'score' | 'fixtures' | 'tournaments' | 'tournament' | 'player' | 'usage';

export interface LiveTennisRateLimit {
  readonly limit: number | null;
  readonly remaining: number | null;
  readonly reset: string | null;
  readonly retryAfterSeconds: number | null;
  readonly scope: 'minute' | 'day' | 'abuse' | null;
  readonly resetsAt: string | null;
}

export interface LiveTennisHttpResult {
  readonly body: unknown;
  readonly rateLimit: LiveTennisRateLimit;
}

export type LiveTennisHttpErrorCode = 'unauthorized' | 'forbidden' | 'not_found' | 'merged' | 'rate_limited' | 'http_error' | 'network_error' | 'invalid_json';

export class LiveTennisHttpError extends Error {
  readonly code: LiveTennisHttpErrorCode;
  readonly endpoint: LiveTennisHttpEndpoint;
  readonly status: number | null;
  readonly rateLimit: LiveTennisRateLimit;
  readonly mergedInto: number | null;
  readonly mergedAt: string | null;

  constructor(
    code: LiveTennisHttpErrorCode,
    endpoint: LiveTennisHttpEndpoint,
    status: number | null,
    rateLimit: LiveTennisRateLimit,
    merge: { readonly mergedInto: number | null; readonly mergedAt: string | null } = {
      mergedInto: null,
      mergedAt: null,
    },
  ) {
    super(`Live Tennis API ${endpoint} request failed (${code}${status === null ? '' : `, HTTP ${status}`}).`);
    this.name = 'LiveTennisHttpError';
    this.code = code;
    this.endpoint = endpoint;
    this.status = status;
    this.rateLimit = rateLimit;
    this.mergedInto = merge.mergedInto;
    this.mergedAt = merge.mergedAt;
  }
}

export interface LiveTennisListOptions {
  readonly tour?: LiveTennisTour;
  readonly draw?: LiveTennisDraw;
  readonly limit?: number;
  readonly offset?: number;
}

export interface LiveTennisMatchListOptions extends LiveTennisListOptions {
  readonly status: Extract<LiveTennisMatchStatus, 'live' | 'upcoming'>;
}

export interface LiveTennisTournamentListOptions extends LiveTennisListOptions {
  readonly search?: string;
}

export interface LiveTennisHttpClient {
  listMatches(options: LiveTennisMatchListOptions): Promise<LiveTennisHttpResult>;
  getMatch(matchId: number): Promise<LiveTennisHttpResult>;
  getScore(matchId: number): Promise<LiveTennisHttpResult>;
  listFixtures(options?: LiveTennisListOptions): Promise<LiveTennisHttpResult>;
  listTournaments(options?: LiveTennisTournamentListOptions): Promise<LiveTennisHttpResult>;
  getTournament(tournamentId: string): Promise<LiveTennisHttpResult>;
  getPlayer(playerId: number): Promise<LiveTennisHttpResult>;
  getUsage(): Promise<LiveTennisHttpResult>;
}

export interface LiveTennisHttpClientOptions {
  readonly apiKey: string;
  readonly fetch?: typeof fetch;
  readonly timeoutMs?: number;
}

function headerInteger(value: string | null): number | null {
  if (value === null || !/^\d+$/.test(value)) return null;
  const result = Number(value);
  return Number.isSafeInteger(result) ? result : null;
}

function rateLimitFrom(headers: Headers, body: unknown): LiveTennisRateLimit {
  let scope: LiveTennisRateLimit['scope'] = null;
  let resetsAt: string | null = null;
  if (typeof body === 'object' && body !== null && !Array.isArray(body)) {
    const error = (body as Record<string, unknown>).error;
    const bodyScope = (body as Record<string, unknown>).scope;
    if (error === 'abuse_throttled') scope = 'abuse';
    else if (bodyScope === 'day') scope = 'day';
    else if (error === 'rate_limited') scope = 'minute';
    const candidate = (body as Record<string, unknown>).resets_at;
    if (typeof candidate === 'string' && candidate.endsWith('Z') && Number.isFinite(Date.parse(candidate))) resetsAt = candidate;
  }
  return {
    limit: headerInteger(headers.get('x-ratelimit-limit')),
    remaining: headerInteger(headers.get('x-ratelimit-remaining')),
    reset: headers.get('x-ratelimit-reset'),
    retryAfterSeconds: headerInteger(headers.get('retry-after')),
    scope,
    resetsAt,
  };
}

function assertId(value: number, name: string): void {
  if (!Number.isSafeInteger(value) || value < 1) throw new TypeError(`${name} must be a positive integer.`);
}

function mergeFrom(body: unknown): { readonly mergedInto: number | null; readonly mergedAt: string | null } {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return { mergedInto: null, mergedAt: null };
  }
  const record = body as Record<string, unknown>;
  const mergedInto = record.merged_into === null
    ? null
    : Number.isSafeInteger(record.merged_into) && (record.merged_into as number) > 0
      ? record.merged_into as number
      : null;
  const mergedAt = typeof record.merged_at === 'string'
    && record.merged_at.endsWith('Z')
    && Number.isFinite(Date.parse(record.merged_at))
    ? record.merged_at
    : null;
  return { mergedInto, mergedAt };
}

function pagination(search: URLSearchParams, options: LiveTennisListOptions): void {
  if (options.limit !== undefined) {
    if (!Number.isSafeInteger(options.limit) || options.limit < 1 || options.limit > 200) throw new TypeError('limit must be an integer from 1 to 200.');
    search.set('limit', String(options.limit));
  }
  if (options.offset !== undefined) {
    if (!Number.isSafeInteger(options.offset) || options.offset < 0) throw new TypeError('offset must be a non-negative integer.');
    search.set('offset', String(options.offset));
  }
  if (options.tour !== undefined) search.set('tour', options.tour);
  if (options.draw !== undefined) search.set('draw', options.draw);
}

export function createLiveTennisHttpClient(options: LiveTennisHttpClientOptions): LiveTennisHttpClient {
  const apiKey = options.apiKey.trim();
  if (!apiKey) throw new TypeError('Live Tennis API key is required.');
  const fetchImplementation = options.fetch ?? fetch;
  const timeoutMs = options.timeoutMs ?? 15_000;
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) throw new TypeError('timeoutMs must be a positive number.');

  async function request(endpoint: LiveTennisHttpEndpoint, pathname: string, search?: URLSearchParams): Promise<LiveTennisHttpResult> {
    const url = new URL(`${LIVE_TENNIS_BASE_URL}${pathname}`);
    if (search) url.search = search.toString();
    let response: Response;
    try {
      response = await fetchImplementation(url, {
        method: 'GET',
        headers: { Accept: 'application/json', 'X-API-Key': apiKey },
        cache: 'no-store',
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch {
      throw new LiveTennisHttpError('network_error', endpoint, null, rateLimitFrom(new Headers(), undefined));
    }

    let body: unknown;
    try {
      body = await response.json() as unknown;
    } catch {
      throw new LiveTennisHttpError('invalid_json', endpoint, response.status, rateLimitFrom(response.headers, undefined));
    }
    const rateLimit = rateLimitFrom(response.headers, body);
    if (!response.ok) {
      const code = response.status === 401 ? 'unauthorized'
        : response.status === 403 ? 'forbidden'
          : response.status === 404 ? 'not_found'
            : response.status === 410 ? 'merged'
            : response.status === 429 ? 'rate_limited'
              : 'http_error';
      throw new LiveTennisHttpError(code, endpoint, response.status, rateLimit, mergeFrom(body));
    }
    return { body, rateLimit };
  }

  return {
    listMatches(options) {
      const search = new URLSearchParams({ status: options.status });
      pagination(search, options);
      return request('matches', '/matches', search);
    },
    getMatch(matchId) { assertId(matchId, 'matchId'); return request('match', `/matches/${matchId}`); },
    getScore(matchId) { assertId(matchId, 'matchId'); return request('score', `/matches/${matchId}/score`); },
    listFixtures(options = {}) { const search = new URLSearchParams(); pagination(search, options); return request('fixtures', '/fixtures', search); },
    listTournaments(options = {}) {
      const search = new URLSearchParams();
      pagination(search, options);
      if (options.search !== undefined) {
        const term = options.search.trim();
        if (!term) throw new TypeError('search must be non-empty when provided.');
        search.set('search', term);
      }
      return request('tournaments', '/tournaments', search);
    },
    getTournament(tournamentId) {
      const id = tournamentId.trim();
      if (!id) throw new TypeError('tournamentId must be non-empty.');
      return request('tournament', `/tournaments/${encodeURIComponent(id)}`);
    },
    getPlayer(playerId) { assertId(playerId, 'playerId'); return request('player', `/players/${playerId}`); },
    getUsage() { return request('usage', '/usage'); },
  };
}
