import { eq, and } from 'drizzle-orm';
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core';
import { decideRefresh, nextRefreshAt, utcDay } from '../application/refresh-policy.ts';
import type { RefreshRepository } from '../application/refresh-repository.ts';
import * as schema from './schema.ts';

export type { RefreshLeaseResult, RefreshRepository } from '../application/refresh-repository.ts';

export function createDrizzleRefreshRepository<TQueryResult extends PgQueryResultHKT>(db: PgDatabase<TQueryResult, typeof schema>): RefreshRepository {
  return {
    async acquire(providerId, resource, now, reserveCalls = 1) {
      const day = utcDay(now);
      return db.transaction(async tx => {
        await tx.insert(schema.providerDailyBudgets).values({ providerId, day, calls: 0, updatedAt: now }).onConflictDoNothing();
        await tx.insert(schema.providerSyncStates).values({ providerId, resource, nextRefreshAt: now, leaseToken: null, leaseExpiresAt: null, lastAcceptedAt: null, lastProviderObservedAt: null, lastFailureCode: null, updatedAt: now }).onConflictDoNothing();
        const [budget] = await tx.select().from(schema.providerDailyBudgets).where(and(eq(schema.providerDailyBudgets.providerId, providerId), eq(schema.providerDailyBudgets.day, day))).for('update');
        const [state] = await tx.select().from(schema.providerSyncStates).where(and(eq(schema.providerSyncStates.providerId, providerId), eq(schema.providerSyncStates.resource, resource))).for('update');
        if (!budget || !state) throw new Error('Refresh state could not be initialized.');
        const decision = decideRefresh({ providerId, resource, nextRefreshAt: state.nextRefreshAt, leaseToken: state.leaseToken, leaseExpiresAt: state.leaseExpiresAt, dailyCalls: budget.calls }, now, reserveCalls);
        if (decision.type === 'wait') return decision;
        const token = crypto.randomUUID();
        await tx.update(schema.providerDailyBudgets).set({ calls: budget.calls + reserveCalls, updatedAt: now }).where(and(eq(schema.providerDailyBudgets.providerId, providerId), eq(schema.providerDailyBudgets.day, day)));
        await tx.update(schema.providerSyncStates).set({ leaseToken: token, leaseExpiresAt: decision.leaseExpiresAt, updatedAt: now }).where(and(eq(schema.providerSyncStates.providerId, providerId), eq(schema.providerSyncStates.resource, resource)));
        return { type: 'acquired' as const, token, expiresAt: decision.leaseExpiresAt };
      });
    },
    async complete(input) {
      const result = await db.update(schema.providerSyncStates).set({ leaseToken: null, leaseExpiresAt: null, lastAcceptedAt: input.acceptedAt, lastProviderObservedAt: input.providerObservedAt ?? null, lastFailureCode: null, nextRefreshAt: nextRefreshAt(input.resource, input.acceptedAt), updatedAt: input.acceptedAt }).where(and(eq(schema.providerSyncStates.providerId, input.providerId), eq(schema.providerSyncStates.resource, input.resource), eq(schema.providerSyncStates.leaseToken, input.token))).returning({ token: schema.providerSyncStates.leaseToken });
      return result.length === 1;
    },
    async fail(input) {
      const result = await db.update(schema.providerSyncStates).set({ leaseToken: null, leaseExpiresAt: null, lastFailureCode: input.code, nextRefreshAt: input.retryAt, updatedAt: input.failedAt }).where(and(eq(schema.providerSyncStates.providerId, input.providerId), eq(schema.providerSyncStates.resource, input.resource), eq(schema.providerSyncStates.leaseToken, input.token))).returning({ token: schema.providerSyncStates.leaseToken });
      return result.length === 1;
    },
  };
}
