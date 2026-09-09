import assert from 'node:assert/strict';
import test from 'node:test';
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core';
import type { NormalizationBatch } from '../src/application/normalization.ts';
import { competitionGroupId, competitionId, eventId, participantId, providerId, seasonId } from '../src/domain/ids.ts';
import { createDrizzleNormalizationWriteRepository, NormalizationWriteError } from '../src/db/normalization-repository.ts';
import * as schema from '../src/db/schema.ts';

type Operation =
  | { readonly type: 'transaction' }
  | { readonly type: 'select'; readonly table: string }
  | { readonly type: 'lock'; readonly mode: string }
  | { readonly type: 'insert'; readonly table: string; readonly values: unknown; readonly conflict: 'update' | 'nothing' }
  | { readonly type: 'delete'; readonly table: string };

interface RepositoryDbOptions {
  readonly providerExists?: boolean;
  readonly storedEvents?: readonly { readonly id: string; readonly observedAt: string | null }[];
  readonly mappings?: readonly unknown[];
}

function operationLabel(operation: Operation): string {
  switch (operation.type) {
    case 'transaction': return 'transaction';
    case 'select': return `select:${operation.table}`;
    case 'lock': return `lock:${operation.mode}`;
    case 'delete': return `delete:${operation.table}`;
    case 'insert': return `insert:${operation.table}:${operation.conflict}`;
  }
}

function tableName(table: unknown): string {
  if (table === schema.providers) return 'providers';
  if (table === schema.events) return 'events';
  if (table === schema.competitionGroups) return 'competition_groups';
  if (table === schema.participants) return 'participants';
  if (table === schema.competitions) return 'competitions';
  if (table === schema.seasons) return 'seasons';
  if (table === schema.eventParticipants) return 'event_participants';
  if (table === schema.providerEntityMappings) return 'provider_entity_mappings';
  throw new Error('Unexpected table in normalization repository test.');
}

interface SelectResult {
  readonly for: (mode: string) => Promise<readonly unknown[]>;
  readonly then: <TResult1 = readonly unknown[], TResult2 = never>(
    onfulfilled?: ((value: readonly unknown[]) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ) => Promise<TResult1 | TResult2>;
}

function createRepositoryDb(options: RepositoryDbOptions = {}) {
  const operations: Operation[] = [];
  const rowsFor = (table: unknown): readonly unknown[] => {
    if (table === schema.providers) return options.providerExists === false ? [] : [{ id: 'live-tennis' }];
    if (table === schema.events) return options.storedEvents ?? [];
    if (table === schema.providerEntityMappings) return options.mappings ?? [];
    return [];
  };
  const select = () => ({
    from(table: unknown) {
      return {
        where(): SelectResult {
          operations.push({ type: 'select', table: tableName(table) });
          const rows = rowsFor(table);
          return {
            for: async mode => {
              operations.push({ type: 'lock', mode });
              return rows;
            },
            then: (onfulfilled, onrejected) => Promise.resolve(rows).then(onfulfilled, onrejected),
          };
        },
      };
    },
  });
  const writeTx = {
    select,
    insert(table: unknown) {
      return {
        values(values: unknown) {
          return {
            onConflictDoUpdate: async () => {
              operations.push({ type: 'insert', table: tableName(table), values, conflict: 'update' });
            },
            onConflictDoNothing: async () => {
              operations.push({ type: 'insert', table: tableName(table), values, conflict: 'nothing' });
            },
            then: <TResult1 = void, TResult2 = never>(
              onfulfilled?: ((value: void) => TResult1 | PromiseLike<TResult1>) | null,
              onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
            ) => {
              operations.push({ type: 'insert', table: tableName(table), values, conflict: 'update' });
              return Promise.resolve().then(onfulfilled, onrejected);
            },
          };
        },
      };
    },
    delete(table: unknown) {
      return {
        where: async () => {
          operations.push({ type: 'delete', table: tableName(table) });
        },
      };
    },
  };
  const db = {
    select,
    transaction: async <T>(callback: (tx: typeof writeTx) => Promise<T>) => {
      operations.push({ type: 'transaction' });
      return callback(writeTx);
    },
  } as unknown as PgDatabase<PgQueryResultHKT, typeof schema>;
  return { db, operations };
}

const liveTennis = providerId('live-tennis');
const groupId = competitionGroupId('us-open');
const competitionIdValue = competitionId('us-open-atp');
const seasonIdValue = seasonId('us-open-2026-atp');
const playerOneId = participantId('synthetic-player-one');
const playerTwoId = participantId('synthetic-player-two');
const eventIdValue = eventId('synthetic-us-open-match');
const observedAt = '2026-09-09T15:00:00Z';

function batch(overrides: Partial<NormalizationBatch> = {}): NormalizationBatch {
  return {
    providerId: liveTennis,
    observedAt,
    records: [
      { type: 'competition_group', record: { id: groupId, sportId: 'tennis', name: 'US Open', shortName: 'US Open', slug: 'us-open' } },
      { type: 'participant', record: { id: playerOneId, sportId: 'tennis', type: 'player', name: 'Synthetic Player One', shortName: 'One', slug: 'synthetic-player-one' } },
      { type: 'participant', record: { id: playerTwoId, sportId: 'tennis', type: 'player', name: 'Synthetic Player Two', shortName: 'Two', slug: 'synthetic-player-two' } },
      { type: 'competition', record: { id: competitionIdValue, sportId: 'tennis', name: 'US Open Men', shortName: 'US Open', slug: 'us-open-atp', category: 'men', competitionGroupId: groupId } },
      { type: 'season', record: { id: seasonIdValue, competitionId: competitionIdValue, name: '2026 US Open' } },
      { type: 'event', record: { id: eventIdValue, sportId: 'tennis', competitionId: competitionIdValue, seasonId: seasonIdValue, startsAt: '2026-09-09T16:00:00Z', status: 'live', state: { sets: [], round: 'Quarterfinal' } } },
      { type: 'event_participant', record: { eventId: eventIdValue, participantId: playerOneId, side: 0, order: 0, seed: 1 } },
      { type: 'event_participant', record: { eventId: eventIdValue, participantId: playerTwoId, side: 1, order: 0, seed: 2 } },
    ],
    mappings: [
      { providerId: liveTennis, providerEntityType: 'match', providerEntityId: '500', canonical: { type: 'event', id: eventIdValue } },
      { providerId: liveTennis, providerEntityType: 'player', providerEntityId: '101', canonical: { type: 'participant', id: playerOneId } },
    ],
    warnings: [],
    ...overrides,
  };
}

test('normalization writes lock first, replace event participants, and append immutable mappings in one transaction', async () => {
  const { db, operations } = createRepositoryDb();
  const repository = createDrizzleNormalizationWriteRepository(db);

  const result = await repository.writeNormalizationBatch(batch());

  assert.deepEqual(result, { status: 'accepted', observedAt });
  assert.deepEqual(operations.map(operationLabel), [
    'transaction',
    'select:providers',
    'select:events',
    'lock:update',
    'insert:competition_groups:update',
    'insert:participants:update',
    'insert:participants:update',
    'insert:competitions:update',
    'insert:seasons:update',
    'insert:events:update',
    'delete:event_participants',
    'insert:event_participants:update',
    'insert:event_participants:update',
    'insert:provider_entity_mappings:nothing',
    'insert:provider_entity_mappings:nothing',
  ]);
  const mappingWrites = operations.filter((operation): operation is Extract<Operation, { readonly type: 'insert' }> => operation.type === 'insert' && operation.table === 'provider_entity_mappings');
  assert.deepEqual(mappingWrites.map(write => write.conflict), ['nothing', 'nothing']);
  assert.deepEqual(mappingWrites[0]?.values, {
    providerId: 'live-tennis', providerEntityType: 'match', providerEntityId: '500', canonicalType: 'event',
    participantId: null, competitionId: null, competitionGroupId: null, seasonId: null, eventId: 'synthetic-us-open-match',
  });
});

test('equal or older observations return stale before any canonical mutation', async () => {
  for (const storedObservedAt of [observedAt, '2026-09-09T15:00:01Z']) {
    const { db, operations } = createRepositoryDb({ storedEvents: [{ id: eventIdValue, observedAt: storedObservedAt }] });
    const repository = createDrizzleNormalizationWriteRepository(db);

    const result = await repository.writeNormalizationBatch(batch());

    assert.deepEqual(result, { status: 'stale', observedAt, eventIds: [eventIdValue] });
    assert.deepEqual(operations.map(operationLabel), [
      'transaction', 'select:providers', 'select:events', 'lock:update',
    ]);
  }
});

test('provider mappings are decoded on read and never rewritten by batch persistence', async () => {
  const { db, operations } = createRepositoryDb({ mappings: [{
    providerId: 'live-tennis', providerEntityType: 'tournament', providerEntityId: '1217', canonicalType: 'competition',
    participantId: null, competitionId: 'us-open-atp', competitionGroupId: null, seasonId: null, eventId: null,
  }] });
  const repository = createDrizzleNormalizationWriteRepository(db);

  assert.deepEqual(await repository.readProviderMappings(liveTennis), [{
    providerId: liveTennis, providerEntityType: 'tournament', providerEntityId: '1217', canonical: { type: 'competition', id: competitionIdValue },
  }]);
  assert.deepEqual(operations, [{ type: 'select', table: 'provider_entity_mappings' }]);
});

test('invalid batches are rejected before transaction work begins', async () => {
  const cases: readonly NormalizationBatch[] = [
    batch({ observedAt: '2026-09-09 15:00:00' }),
    batch({ mappings: [{ providerId: providerId('other-provider'), providerEntityType: 'match', providerEntityId: '500', canonical: { type: 'event', id: eventIdValue } }] }),
    batch({ records: [{ type: 'event_participant', record: { eventId: eventIdValue, participantId: playerOneId, side: 0, order: 0 } }] }),
  ];
  for (const invalidBatch of cases) {
    const { db, operations } = createRepositoryDb();
    const repository = createDrizzleNormalizationWriteRepository(db);
    await assert.rejects(repository.writeNormalizationBatch(invalidBatch), (error: unknown) => error instanceof Error && (error.name === 'NormalizationError' || error instanceof NormalizationWriteError));
    assert.deepEqual(operations, []);
  }
});

test('an unknown provider fails after the transaction begins but before canonical writes', async () => {
  const { db, operations } = createRepositoryDb({ providerExists: false });
  const repository = createDrizzleNormalizationWriteRepository(db);

  await assert.rejects(repository.writeNormalizationBatch(batch()), (error: unknown) => error instanceof NormalizationWriteError && error.code === 'unknown_provider');
  assert.deepEqual(operations, [{ type: 'transaction' }, { type: 'select', table: 'providers' }]);
});
