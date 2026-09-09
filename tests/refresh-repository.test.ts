import assert from 'node:assert/strict';
import test from 'node:test';
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core';
import { LIVE_TENNIS_DAILY_CALL_LIMIT, nextRefreshAt } from '../src/application/refresh-policy.ts';
import { providerId } from '../src/domain/ids.ts';
import { createDrizzleRefreshRepository } from '../src/db/refresh-repository.ts';
import * as schema from '../src/db/schema.ts';

type Operation =
  | { readonly type: 'transaction' }
  | { readonly type: 'insert'; readonly table: string; readonly values: unknown }
  | { readonly type: 'select'; readonly table: string }
  | { readonly type: 'lock'; readonly mode: string }
  | { readonly type: 'tx-update'; readonly table: string; readonly values: unknown }
  | { readonly type: 'update'; readonly table: string; readonly values: unknown };

function operationLabel(operation: Operation): string {
  switch (operation.type) {
    case 'transaction': return 'transaction';
    case 'insert': return `insert:${operation.table}`;
    case 'select': return `select:${operation.table}`;
    case 'lock': return `lock:${operation.mode}`;
    case 'tx-update': return `tx-update:${operation.table}`;
    case 'update': return `update:${operation.table}`;
  }
}

function tableName(table: unknown): string {
  if (table === schema.providerDailyBudgets) return 'provider_daily_budgets';
  if (table === schema.providerSyncStates) return 'provider_sync_states';
  throw new Error('Unexpected table in refresh repository test.');
}

interface StoredBudget { readonly calls: number }
interface StoredState { readonly nextRefreshAt: string; readonly leaseToken: string | null; readonly leaseExpiresAt: string | null }

interface RefreshDbOptions {
  readonly budget?: StoredBudget;
  readonly state?: StoredState;
  readonly returning?: readonly unknown[];
}

// A hand-rolled Drizzle stand-in, matching the style of normalization-repository.test.ts: it never
// evaluates a real WHERE predicate, it logs the operation sequence and returns rows configured up
// front to represent "what the database currently contains" for the scenario under test.
function createRefreshDb(options: RefreshDbOptions = {}) {
  const operations: Operation[] = [];
  const budgetRow = options.budget ?? { calls: 0 };
  const stateRow = options.state ?? { nextRefreshAt: '1970-01-01T00:00:00Z', leaseToken: null, leaseExpiresAt: null };
  const rowsFor = (table: unknown): readonly unknown[] => {
    if (table === schema.providerDailyBudgets) return [budgetRow];
    if (table === schema.providerSyncStates) return [stateRow];
    throw new Error('Unexpected table in refresh repository test.');
  };
  const writeTx = {
    insert(table: unknown) {
      return {
        values(values: unknown) {
          return {
            onConflictDoNothing: async () => {
              operations.push({ type: 'insert', table: tableName(table), values });
            },
          };
        },
      };
    },
    select() {
      return {
        from(table: unknown) {
          return {
            where() {
              operations.push({ type: 'select', table: tableName(table) });
              return {
                for: async (mode: string) => {
                  operations.push({ type: 'lock', mode });
                  return rowsFor(table);
                },
              };
            },
          };
        },
      };
    },
    update(table: unknown) {
      return {
        set(values: unknown) {
          return {
            where: async () => {
              operations.push({ type: 'tx-update', table: tableName(table), values });
            },
          };
        },
      };
    },
  };
  const db = {
    transaction: async <T>(callback: (tx: typeof writeTx) => Promise<T>) => {
      operations.push({ type: 'transaction' });
      return callback(writeTx);
    },
    update(table: unknown) {
      return {
        set(values: unknown) {
          return {
            where() {
              return {
                returning: async () => {
                  operations.push({ type: 'update', table: tableName(table), values });
                  return options.returning ?? [];
                },
              };
            },
          };
        },
      };
    },
  } as unknown as PgDatabase<PgQueryResultHKT, typeof schema>;
  return { db, operations };
}

const liveTennis = providerId('live-tennis');
const resource = 'live_matches' as const;
const now = '2026-09-09T12:00:00Z';

test('acquire locks both rows before deciding and mutates only on a granted lease', async () => {
  const { db, operations } = createRefreshDb({ budget: { calls: 5 }, state: { nextRefreshAt: now, leaseToken: null, leaseExpiresAt: null } });
  const repository = createDrizzleRefreshRepository(db);

  const result = await repository.acquire(liveTennis, resource, now);

  assert.equal(result.type, 'acquired');
  assert.deepEqual(operations.map(operationLabel), [
    'transaction',
    'insert:provider_daily_budgets',
    'insert:provider_sync_states',
    'select:provider_daily_budgets',
    'lock:update',
    'select:provider_sync_states',
    'lock:update',
    'tx-update:provider_daily_budgets',
    'tx-update:provider_sync_states',
  ]);
  const budgetInsert = operations.find((operation): operation is Extract<Operation, { readonly type: 'insert' }> => operation.type === 'insert' && operation.table === 'provider_daily_budgets');
  assert.deepEqual(budgetInsert?.values, { providerId: liveTennis, day: '2026-09-09', calls: 0, updatedAt: now });
  const stateInsert = operations.find((operation): operation is Extract<Operation, { readonly type: 'insert' }> => operation.type === 'insert' && operation.table === 'provider_sync_states');
  assert.deepEqual(stateInsert?.values, { providerId: liveTennis, resource, nextRefreshAt: now, leaseToken: null, leaseExpiresAt: null, lastAcceptedAt: null, lastProviderObservedAt: null, lastFailureCode: null, updatedAt: now });
});

test('acquire keys the daily budget row by the UTC calendar day, not a naive string slice of a local instant', async () => {
  // A non-UTC offset where the local date and the UTC date fall on different calendar days: this
  // is the exact shape that made `now.slice(0, 10)` compute the wrong day before it was fixed to
  // go through `utcDay(now)`.
  const lateLocal = '2026-09-09T23:30:00-02:00';
  const { db, operations } = createRefreshDb({ budget: { calls: 0 }, state: { nextRefreshAt: lateLocal, leaseToken: null, leaseExpiresAt: null } });
  const repository = createDrizzleRefreshRepository(db);

  await repository.acquire(liveTennis, resource, lateLocal);

  const budgetInsert = operations.find((operation): operation is Extract<Operation, { readonly type: 'insert' }> => operation.type === 'insert' && operation.table === 'provider_daily_budgets');
  assert.equal((budgetInsert?.values as { readonly day: string }).day, '2026-09-10');
});

test('acquire reserves the requested calls and refuses once the daily ceiling would be exceeded', async () => {
  const freshState = { nextRefreshAt: now, leaseToken: null, leaseExpiresAt: null };
  {
    const { db, operations } = createRefreshDb({ budget: { calls: 10 }, state: freshState });
    const repository = createDrizzleRefreshRepository(db);

    const result = await repository.acquire(liveTennis, resource, now, 3);

    assert.equal(result.type, 'acquired');
    const budgetUpdate = operations.find((operation): operation is Extract<Operation, { readonly type: 'tx-update' }> => operation.type === 'tx-update' && operation.table === 'provider_daily_budgets');
    assert.deepEqual(budgetUpdate?.values, { calls: 13, updatedAt: now });
  }
  {
    const { db, operations } = createRefreshDb({ budget: { calls: LIVE_TENNIS_DAILY_CALL_LIMIT - 2 }, state: freshState });
    const repository = createDrizzleRefreshRepository(db);

    const result = await repository.acquire(liveTennis, resource, now, 3);

    assert.deepEqual(result, { type: 'wait', reason: 'quota_exhausted', nextRefreshAt: now });
    assert.ok(!operations.some(operation => operation.type === 'tx-update'), 'quota exhaustion must not mutate either row');
  }
});

test('acquire refuses while another lease is active and grants a fresh lease once it expires', async () => {
  {
    const { db, operations } = createRefreshDb({
      budget: { calls: 0 },
      state: { nextRefreshAt: '1970-01-01T00:00:00Z', leaseToken: 'existing-token', leaseExpiresAt: '2026-09-09T12:01:00Z' },
    });
    const repository = createDrizzleRefreshRepository(db);

    const result = await repository.acquire(liveTennis, resource, now);

    assert.deepEqual(result, { type: 'wait', reason: 'leased', nextRefreshAt: '2026-09-09T12:01:00Z' });
    assert.ok(!operations.some(operation => operation.type === 'tx-update'), 'an active lease must not be granted to a second caller');
  }
  {
    const { db } = createRefreshDb({
      budget: { calls: 0 },
      state: { nextRefreshAt: '1970-01-01T00:00:00Z', leaseToken: 'stale-token', leaseExpiresAt: '2026-09-09T11:59:00Z' },
    });
    const repository = createDrizzleRefreshRepository(db);

    const result = await repository.acquire(liveTennis, resource, now);

    assert.equal(result.type, 'acquired');
    if (result.type === 'acquired') {
      assert.notEqual(result.token, 'stale-token');
      assert.equal(result.expiresAt, '2026-09-09T12:01:30.000Z');
    }
  }
});

test('acquire waits for the resource cadence when the row is not yet due', async () => {
  const { db, operations } = createRefreshDb({ budget: { calls: 0 }, state: { nextRefreshAt: '2026-09-09T12:30:00Z', leaseToken: null, leaseExpiresAt: null } });
  const repository = createDrizzleRefreshRepository(db);

  const result = await repository.acquire(liveTennis, resource, now);

  assert.deepEqual(result, { type: 'wait', reason: 'fresh', nextRefreshAt: '2026-09-09T12:30:00Z' });
  assert.ok(!operations.some(operation => operation.type === 'tx-update'));
});

test('complete releases the lease only for the token currently holding it, and advances the cadence', async () => {
  const acceptedAt = '2026-09-09T12:05:00Z';
  {
    const { db, operations } = createRefreshDb({ returning: [{ token: null }] });
    const repository = createDrizzleRefreshRepository(db);

    const result = await repository.complete({ providerId: liveTennis, resource, token: 'held-token', acceptedAt, providerObservedAt: '2026-09-09T12:04:50Z' });

    assert.equal(result, true);
    const update = operations.find((operation): operation is Extract<Operation, { readonly type: 'update' }> => operation.type === 'update');
    assert.deepEqual(update?.values, {
      leaseToken: null, leaseExpiresAt: null, lastAcceptedAt: acceptedAt, lastProviderObservedAt: '2026-09-09T12:04:50Z',
      lastFailureCode: null, nextRefreshAt: nextRefreshAt(resource, acceptedAt), updatedAt: acceptedAt,
    });
  }
  {
    const { db } = createRefreshDb({ returning: [] });
    const repository = createDrizzleRefreshRepository(db);

    const result = await repository.complete({ providerId: liveTennis, resource, token: 'stale-token', acceptedAt });

    assert.equal(result, false, 'a token that no longer matches the stored lease must not report success');
  }
});

test('fail releases the lease only for the token currently holding it, and schedules the retry', async () => {
  const failedAt = '2026-09-09T12:05:00Z';
  const retryAt = '2026-09-09T12:06:00Z';
  {
    const { db, operations } = createRefreshDb({ returning: [{ token: null }] });
    const repository = createDrizzleRefreshRepository(db);

    const result = await repository.fail({ providerId: liveTennis, resource, token: 'held-token', failedAt, code: 'rate_limited', retryAt });

    assert.equal(result, true);
    const update = operations.find((operation): operation is Extract<Operation, { readonly type: 'update' }> => operation.type === 'update');
    assert.deepEqual(update?.values, { leaseToken: null, leaseExpiresAt: null, lastFailureCode: 'rate_limited', nextRefreshAt: retryAt, updatedAt: failedAt });
  }
  {
    const { db } = createRefreshDb({ returning: [] });
    const repository = createDrizzleRefreshRepository(db);

    const result = await repository.fail({ providerId: liveTennis, resource, token: 'stale-token', failedAt, code: 'rate_limited', retryAt });

    assert.equal(result, false, 'a token that no longer matches the stored lease must not report success');
  }
});
