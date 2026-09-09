import { eq, inArray } from 'drizzle-orm';
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core';
import type { NormalizationRepository, NormalizationWriteResult } from '../application/scoreboard-repository.ts';
import type { CanonicalWrite, NormalizationBatch } from '../application/normalization.ts';
import { assertObservationInstant } from '../application/normalization.ts';
import type { ProviderEntityMapping } from '../domain/model.ts';
import { competitionGroupId, competitionId, eventId, participantId, seasonId } from '../domain/ids.ts';
import * as schema from './schema.ts';

export class NormalizationWriteError extends Error {
  readonly code: 'unknown_provider' | 'invalid_batch';

  constructor(code: NormalizationWriteError['code'], message: string) {
    super(message);
    this.name = 'NormalizationWriteError';
    this.code = code;
  }
}

function recordsOfType<TType extends CanonicalWrite['type']>(batch: NormalizationBatch, type: TType): Extract<CanonicalWrite, { readonly type: TType }>[] {
  return batch.records.filter((write): write is Extract<CanonicalWrite, { readonly type: TType }> => write.type === type);
}

function mappingRow(mapping: ProviderEntityMapping) {
  const canonical = mapping.canonical;
  return {
    providerId: mapping.providerId,
    providerEntityType: mapping.providerEntityType,
    providerEntityId: mapping.providerEntityId,
    canonicalType: canonical.type,
    participantId: canonical.type === 'participant' ? canonical.id : null,
    competitionId: canonical.type === 'competition' ? canonical.id : null,
    competitionGroupId: canonical.type === 'competition_group' ? canonical.id : null,
    seasonId: canonical.type === 'season' ? canonical.id : null,
    eventId: canonical.type === 'event' ? canonical.id : null,
  };
}

function mappingFromRow(row: typeof schema.providerEntityMappings.$inferSelect): ProviderEntityMapping {
  const canonical = row.canonicalType === 'participant'
    ? { type: 'participant' as const, id: participantId(required(row.participantId, 'Provider participant')) }
    : row.canonicalType === 'competition'
      ? { type: 'competition' as const, id: competitionId(required(row.competitionId, 'Provider competition')) }
      : row.canonicalType === 'competition_group'
        ? { type: 'competition_group' as const, id: competitionGroupId(required(row.competitionGroupId, 'Provider competition group')) }
        : row.canonicalType === 'season'
          ? { type: 'season' as const, id: seasonId(required(row.seasonId, 'Provider season')) }
          : { type: 'event' as const, id: eventId(required(row.eventId, 'Provider event')) };
  return { providerId: row.providerId as ProviderEntityMapping['providerId'], providerEntityType: row.providerEntityType, providerEntityId: row.providerEntityId, canonical };
}

function required(value: string | null, label: string): string {
  if (value === null) throw new NormalizationWriteError('invalid_batch', `${label} is required by its mapping discriminator.`);
  return value;
}

function eventSportById(batch: NormalizationBatch): ReadonlyMap<string, (typeof schema.sportCodeEnum.enumValues)[number]> {
  return new Map(recordsOfType(batch, 'event').map(write => [write.record.id, write.record.sportId]));
}

function assertBatchShape(batch: NormalizationBatch): void {
  assertObservationInstant(batch.observedAt);
  for (const mapping of batch.mappings) {
    if (mapping.providerId !== batch.providerId) {
      throw new NormalizationWriteError('invalid_batch', 'Every provider mapping in a normalization batch must use the batch provider.');
    }
  }
  const sports = eventSportById(batch);
  for (const write of recordsOfType(batch, 'event_participant')) {
    if (!sports.has(write.record.eventId)) {
      throw new NormalizationWriteError('invalid_batch', `Event participant ${write.record.eventId} has no event write in this batch.`);
    }
  }
}

/**
 * Persists only canonical data. Provider decoders and normalizers do not
 * import this module, and callers must first build a validated batch.
 */
export function createDrizzleNormalizationWriteRepository<TQueryResult extends PgQueryResultHKT>(
  db: PgDatabase<TQueryResult, typeof schema>,
): NormalizationRepository {
  return {
    async readProviderMappings(providerId) {
      const mappings = await db.select().from(schema.providerEntityMappings).where(eq(schema.providerEntityMappings.providerId, providerId));
      return mappings.map(mappingFromRow);
    },
    async writeNormalizationBatch(batch: NormalizationBatch): Promise<NormalizationWriteResult> {
      assertBatchShape(batch);
      const eventWrites = recordsOfType(batch, 'event');
      const eventIds = eventWrites.map(write => write.record.id);

      return db.transaction(async tx => {
        const provider = await tx.select({ id: schema.providers.id }).from(schema.providers).where(eq(schema.providers.id, batch.providerId));
        if (provider.length === 0) throw new NormalizationWriteError('unknown_provider', `Provider ${batch.providerId} is not registered.`);

        const storedEvents = eventIds.length === 0
          ? []
          : await tx.select({ id: schema.events.id, observedAt: schema.events.observedAt })
            .from(schema.events)
            .where(inArray(schema.events.id, eventIds))
            .for('update');
        const staleEventIds = storedEvents
          .filter(event => event.observedAt !== null && Date.parse(event.observedAt) >= Date.parse(batch.observedAt))
          .map(event => event.id);
        if (staleEventIds.length > 0) return { status: 'stale', observedAt: batch.observedAt, eventIds: staleEventIds } as const;

        for (const write of recordsOfType(batch, 'competition_group')) {
          await tx.insert(schema.competitionGroups).values(write.record).onConflictDoUpdate({
            target: schema.competitionGroups.id,
            set: { sportId: write.record.sportId, name: write.record.name, shortName: write.record.shortName, slug: write.record.slug },
          });
        }
        for (const write of recordsOfType(batch, 'participant')) {
          await tx.insert(schema.participants).values({ ...write.record, countryCode: write.record.countryCode ?? null, mark: write.record.mark ?? null }).onConflictDoUpdate({
            target: schema.participants.id,
            set: { sportId: write.record.sportId, type: write.record.type, name: write.record.name, shortName: write.record.shortName, slug: write.record.slug, countryCode: write.record.countryCode ?? null, mark: write.record.mark ?? null },
          });
        }
        for (const write of recordsOfType(batch, 'competition')) {
          await tx.insert(schema.competitions).values({ ...write.record, category: write.record.category ?? null, competitionGroupId: write.record.competitionGroupId ?? null }).onConflictDoUpdate({
            target: schema.competitions.id,
            set: { sportId: write.record.sportId, name: write.record.name, shortName: write.record.shortName, slug: write.record.slug, category: write.record.category ?? null, competitionGroupId: write.record.competitionGroupId ?? null },
          });
        }
        for (const write of recordsOfType(batch, 'season')) {
          await tx.insert(schema.seasons).values({ ...write.record, startsOn: write.record.startsOn ?? null, endsOn: write.record.endsOn ?? null }).onConflictDoUpdate({
            target: schema.seasons.id,
            set: { competitionId: write.record.competitionId, name: write.record.name, startsOn: write.record.startsOn ?? null, endsOn: write.record.endsOn ?? null },
          });
        }
        for (const write of eventWrites) {
          await tx.insert(schema.events).values({ ...write.record, seasonId: write.record.seasonId ?? null, venueName: write.record.venueName ?? null, observedAt: batch.observedAt }).onConflictDoUpdate({
            target: schema.events.id,
            set: { competitionId: write.record.competitionId, seasonId: write.record.seasonId ?? null, startsAt: write.record.startsAt, status: write.record.status, venueName: write.record.venueName ?? null, state: write.record.state, observedAt: batch.observedAt },
          });
        }
        if (eventIds.length > 0) await tx.delete(schema.eventParticipants).where(inArray(schema.eventParticipants.eventId, eventIds));
        const sports = eventSportById(batch);
        for (const write of recordsOfType(batch, 'event_participant')) {
          const sportId = sports.get(write.record.eventId);
          if (!sportId) throw new NormalizationWriteError('invalid_batch', `Event participant ${write.record.eventId} has no event sport.`);
          await tx.insert(schema.eventParticipants).values({ ...write.record, sportId, designation: write.record.designation ?? null, result: write.record.result ?? null, seed: write.record.seed ?? null });
        }
        for (const mapping of batch.mappings) {
          await tx.insert(schema.providerEntityMappings).values(mappingRow(mapping)).onConflictDoNothing();
        }
        return { status: 'accepted', observedAt: batch.observedAt } as const;
      });
    },
  };
}
