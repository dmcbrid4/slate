import 'server-only';
import { MLB_BASE_URL } from './types.ts';

export class MlbHttpError extends Error {
  readonly status: number;
  constructor(status: number) {
    super(`MLB Stats API request failed with HTTP ${status}.`);
    this.name = 'MlbHttpError';
    this.status = status;
  }
}

export async function fetchMlbSchedule(startDate: string, endDate: string): Promise<unknown> {
  const url = new URL(`${MLB_BASE_URL}/schedule`);
  url.searchParams.set('sportId', '1');
  url.searchParams.set('leagueId', '103,104');
  url.searchParams.set('startDate', startDate);
  url.searchParams.set('endDate', endDate);
  url.searchParams.set('hydrate', 'team,linescore,probablePitcher');
  const response = await fetch(url, { cache: 'no-store', headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(8_000) });
  if (!response.ok) throw new MlbHttpError(response.status);
  return response.json() as Promise<unknown>;
}
