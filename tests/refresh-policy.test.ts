import assert from 'node:assert/strict';
import test from 'node:test';
import { decideRefresh, LIVE_TENNIS_DAILY_CALL_LIMIT, nextRefreshAt, utcDay } from '../src/application/refresh-policy.ts';
import { providerId } from '../src/domain/ids.ts';

const now = '2026-09-09T12:00:00Z';
const base = { providerId: providerId('live-tennis'), resource: 'live_matches' as const, nextRefreshAt: '2026-09-09T11:30:00Z', leaseToken: null, leaseExpiresAt: null, dailyCalls: 12 };

test('refresh policy allows one due shared refresh and enforces its lease', () => {
  assert.deepEqual(decideRefresh(base, now), { type: 'acquire', reserveCalls: 1, leaseExpiresAt: '2026-09-09T12:01:30.000Z' });
  assert.deepEqual(decideRefresh({ ...base, leaseToken: 'lease', leaseExpiresAt: '2026-09-09T12:01:00Z' }, now), { type: 'wait', reason: 'leased', nextRefreshAt: '2026-09-09T12:01:00Z' });
  assert.deepEqual(decideRefresh({ ...base, nextRefreshAt: '2026-09-09T12:30:00Z' }, now), { type: 'wait', reason: 'fresh', nextRefreshAt: '2026-09-09T12:30:00Z' });
});

test('refresh policy uses UTC days, hard-caps all reserved calls, and keeps free-tier cadence explicit', () => {
  assert.equal(utcDay('2026-09-09T23:30:00-02:00'), '2026-09-10');
  assert.deepEqual(decideRefresh({ ...base, dailyCalls: LIVE_TENNIS_DAILY_CALL_LIMIT }, now), { type: 'wait', reason: 'quota_exhausted', nextRefreshAt: base.nextRefreshAt });
  assert.equal(nextRefreshAt('live_matches', now), '2026-09-09T12:30:00.000Z');
  assert.equal(nextRefreshAt('upcoming_matches', now), '2026-09-09T18:00:00.000Z');
  assert.equal(nextRefreshAt('tournaments', now), '2026-09-10T12:00:00.000Z');
});
