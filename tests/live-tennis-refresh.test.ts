import assert from 'node:assert/strict';
import test from 'node:test';
import { providerId } from '../src/domain/ids.ts';
import type { NormalizationBatch } from '../src/application/normalization.ts';
import type { NormalizationWriteRepository, NormalizationWriteResult } from '../src/application/scoreboard-repository.ts';
import type { RefreshRepository } from '../src/application/refresh-repository.ts';
import { runLiveTennisRefreshCycle, type RefreshResourceHandler } from '../src/application/live-tennis-refresh.ts';

const liveTennis = providerId('live-tennis');
const now = '2026-09-09T12:00:00Z';

function batch(overrides: Partial<NormalizationBatch> = {}): NormalizationBatch {
  return { providerId: liveTennis, observedAt: now, records: [], mappings: [], warnings: [], ...overrides };
}

interface FakeRefreshRepository extends RefreshRepository {
  readonly calls: { readonly method: string; readonly resource: string }[];
  readonly failInputs: { readonly resource: string; readonly code: string; readonly retryAt: string }[];
}

function fakeRefreshRepository(leaseByResource: Record<string, 'acquired' | 'leased' | 'fresh' | 'quota_exhausted'>): FakeRefreshRepository {
  const calls: { readonly method: string; readonly resource: string }[] = [];
  const failInputs: { readonly resource: string; readonly code: string; readonly retryAt: string }[] = [];
  return {
    calls,
    failInputs,
    async acquire(_providerId, resource) {
      calls.push({ method: 'acquire', resource });
      const decision = leaseByResource[resource] ?? 'fresh';
      if (decision === 'acquired') return { type: 'acquired', token: `token-${resource}`, expiresAt: now };
      if (decision === 'quota_exhausted') return { type: 'wait', reason: 'quota_exhausted', nextRefreshAt: now };
      if (decision === 'leased') return { type: 'wait', reason: 'leased', nextRefreshAt: now };
      return { type: 'wait', reason: 'fresh', nextRefreshAt: now };
    },
    async complete(input) {
      calls.push({ method: 'complete', resource: input.resource });
      return true;
    },
    async fail(input) {
      calls.push({ method: 'fail', resource: input.resource });
      failInputs.push({ resource: input.resource, code: input.code, retryAt: input.retryAt });
      return true;
    },
  };
}

function fakeWriteRepository(result: NormalizationWriteResult = { status: 'accepted', observedAt: now }): NormalizationWriteRepository & { readonly written: NormalizationBatch[] } {
  const written: NormalizationBatch[] = [];
  return { written, async writeNormalizationBatch(input) { written.push(input); return result; } };
}

test('a resource that is not due is never fetched', async () => {
  const refreshRepository = fakeRefreshRepository({ live_matches: 'fresh' });
  const writeRepository = fakeWriteRepository();
  let fetched = false;
  const handlers: readonly RefreshResourceHandler[] = [{
    resource: 'live_matches', reserveCalls: 2,
    async fetchAndNormalize() { fetched = true; return batch(); },
  }];

  const outcomes = await runLiveTennisRefreshCycle({ refreshRepository, writeRepository, providerId: liveTennis, now, handlers });

  assert.equal(fetched, false);
  assert.deepEqual(outcomes, [{ resource: 'live_matches', type: 'waited', reason: 'fresh' }]);
  assert.deepEqual(refreshRepository.calls, [{ method: 'acquire', resource: 'live_matches' }]);
});

test('an acquired resource fetches, writes, and completes its lease', async () => {
  const refreshRepository = fakeRefreshRepository({ live_matches: 'acquired' });
  const writeRepository = fakeWriteRepository({ status: 'accepted', observedAt: now });
  const producedBatch = batch();
  const handlers: readonly RefreshResourceHandler[] = [{ resource: 'live_matches', reserveCalls: 2, async fetchAndNormalize() { return producedBatch; } }];

  const outcomes = await runLiveTennisRefreshCycle({ refreshRepository, writeRepository, providerId: liveTennis, now, handlers });

  assert.deepEqual(outcomes, [{ resource: 'live_matches', type: 'written', status: 'accepted' }]);
  assert.deepEqual(writeRepository.written, [producedBatch]);
  assert.deepEqual(refreshRepository.calls, [{ method: 'acquire', resource: 'live_matches' }, { method: 'complete', resource: 'live_matches' }]);
});

test('an acquired resource with nothing to normalize still completes its lease without writing', async () => {
  const refreshRepository = fakeRefreshRepository({ fixtures: 'acquired' });
  const writeRepository = fakeWriteRepository();
  const handlers: readonly RefreshResourceHandler[] = [{ resource: 'fixtures', reserveCalls: 1, async fetchAndNormalize() { return undefined; } }];

  const outcomes = await runLiveTennisRefreshCycle({ refreshRepository, writeRepository, providerId: liveTennis, now, handlers });

  assert.deepEqual(outcomes, [{ resource: 'fixtures', type: 'skipped' }]);
  assert.deepEqual(writeRepository.written, []);
  assert.deepEqual(refreshRepository.calls, [{ method: 'acquire', resource: 'fixtures' }, { method: 'complete', resource: 'fixtures' }]);
});

test('a handler that throws releases its lease with a bounded retry and does not block other resources', async () => {
  const refreshRepository = fakeRefreshRepository({ live_matches: 'acquired', upcoming_matches: 'acquired' });
  const writeRepository = fakeWriteRepository();
  const upcomingBatch = batch();
  const handlers: readonly RefreshResourceHandler[] = [
    { resource: 'live_matches', reserveCalls: 2, async fetchAndNormalize() { throw new Error('network_error'); } },
    { resource: 'upcoming_matches', reserveCalls: 2, async fetchAndNormalize() { return upcomingBatch; } },
  ];

  const outcomes = await runLiveTennisRefreshCycle({ refreshRepository, writeRepository, providerId: liveTennis, now, handlers, retryDelayMs: 30_000 });

  assert.deepEqual(outcomes, [
    { resource: 'live_matches', type: 'failed', code: 'Error' },
    { resource: 'upcoming_matches', type: 'written', status: 'accepted' },
  ]);
  assert.deepEqual(writeRepository.written, [upcomingBatch]);
  assert.deepEqual(refreshRepository.calls, [
    { method: 'acquire', resource: 'live_matches' }, { method: 'fail', resource: 'live_matches' },
    { method: 'acquire', resource: 'upcoming_matches' }, { method: 'complete', resource: 'upcoming_matches' },
  ]);
});

test('a structured provider error with a code and rate-limit reset time honors that reset instead of the default backoff', async () => {
  const refreshRepository = fakeRefreshRepository({ live_matches: 'acquired' });
  const writeRepository = fakeWriteRepository();
  class FakeLiveTennisHttpError extends Error {
    readonly code = 'rate_limited';
    readonly rateLimit = { resetsAt: '2026-09-09T13:00:00Z' };
  }
  const handlers: readonly RefreshResourceHandler[] = [{
    resource: 'live_matches', reserveCalls: 2,
    async fetchAndNormalize() { throw new FakeLiveTennisHttpError('rate limited'); },
  }];

  const outcomes = await runLiveTennisRefreshCycle({ refreshRepository, writeRepository, providerId: liveTennis, now, handlers, retryDelayMs: 30_000 });

  assert.deepEqual(outcomes, [{ resource: 'live_matches', type: 'failed', code: 'rate_limited' }]);
  assert.deepEqual(refreshRepository.failInputs, [{ resource: 'live_matches', code: 'rate_limited', retryAt: '2026-09-09T13:00:00Z' }]);
});
