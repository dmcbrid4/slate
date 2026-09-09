import type { ProviderId } from '../domain/ids.ts';

export const refreshResources = ['live_matches', 'upcoming_matches', 'fixtures', 'tournaments', 'match_resolution'] as const;
export type RefreshResource = typeof refreshResources[number];

export const LIVE_TENNIS_DAILY_CALL_LIMIT = 80;
export const LIVE_TENNIS_LEASE_MS = 90_000;

const refreshIntervals: Readonly<Record<RefreshResource, number>> = {
  live_matches: 30 * 60_000,
  upcoming_matches: 6 * 60 * 60_000,
  fixtures: 6 * 60 * 60_000,
  tournaments: 24 * 60 * 60_000,
  match_resolution: 30 * 60_000,
};

export interface ProviderSyncSnapshot {
  readonly providerId: ProviderId;
  readonly resource: RefreshResource;
  readonly nextRefreshAt: string;
  readonly leaseToken: string | null;
  readonly leaseExpiresAt: string | null;
  readonly dailyCalls: number;
}

export type RefreshDecision =
  | { readonly type: 'acquire'; readonly reserveCalls: number; readonly leaseExpiresAt: string }
  | { readonly type: 'wait'; readonly reason: 'fresh' | 'leased' | 'quota_exhausted'; readonly nextRefreshAt: string };

function instant(value: string): number {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) throw new TypeError('Refresh timestamps must be ISO-8601 instants.');
  return parsed;
}

export function utcDay(value: string): string {
  return new Date(instant(value)).toISOString().slice(0, 10);
}

export function nextRefreshAt(resource: RefreshResource, acceptedAt: string): string {
  return new Date(instant(acceptedAt) + refreshIntervals[resource]).toISOString();
}

export function decideRefresh(snapshot: ProviderSyncSnapshot, now: string, reserveCalls = 1): RefreshDecision {
  const nowMs = instant(now);
  if (!Number.isSafeInteger(reserveCalls) || reserveCalls < 1) throw new TypeError('Refresh call reservation must be a positive integer.');
  if (snapshot.dailyCalls + reserveCalls > LIVE_TENNIS_DAILY_CALL_LIMIT) {
    return { type: 'wait', reason: 'quota_exhausted', nextRefreshAt: snapshot.nextRefreshAt };
  }
  if (snapshot.leaseExpiresAt !== null && instant(snapshot.leaseExpiresAt) > nowMs) {
    return { type: 'wait', reason: 'leased', nextRefreshAt: snapshot.leaseExpiresAt };
  }
  if (instant(snapshot.nextRefreshAt) > nowMs) {
    return { type: 'wait', reason: 'fresh', nextRefreshAt: snapshot.nextRefreshAt };
  }
  return { type: 'acquire', reserveCalls, leaseExpiresAt: new Date(nowMs + LIVE_TENNIS_LEASE_MS).toISOString() };
}
