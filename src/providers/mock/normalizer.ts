import {
  assertObservationInstant,
  NormalizationError,
  type CanonicalWrite,
  type NormalizationBatch,
  type NormalizationContext,
  type NormalizationWarning,
  type ProviderNormalizer,
} from '../../application/normalization.ts';
import {
  competitionGroupId,
  competitionId,
  defineCompetition,
  defineCompetitionGroup,
  defineEvent,
  defineEventParticipant,
  defineParticipant,
  defineProviderMapping,
  defineSeason,
  eventId,
  participantId,
  seasonId,
} from '../../domain/index.ts';
import type {
  CanonicalEvent,
  EventStatus,
  ProviderCanonicalRef,
  ProviderEntityMapping,
} from '../../domain/model.ts';
import type { MockEventPayload, MockProviderPayload, MockStatus } from './types.ts';

const statusMap: Readonly<Record<MockStatus, EventStatus>> = {
  not_started: 'scheduled',
  in_progress: 'live',
  complete: 'final',
  delayed: 'postponed',
  called_off: 'cancelled',
  paused: 'suspended',
};

function slug(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function key<T extends { readonly externalId: string }>(items: readonly T[], type: string): Map<string, T> {
  const result = new Map<string, T>();
  for (const item of items) {
    if (result.has(item.externalId)) throw new NormalizationError('duplicate_external_identity', `Mock ${type} ${item.externalId} is duplicated.`);
    result.set(item.externalId, item);
  }
  return result;
}

function normalizeMockProvider(payload: MockProviderPayload, context: NormalizationContext): NormalizationBatch {
  assertObservationInstant(context.observedAt);
  const mappings: ProviderEntityMapping[] = [];
  const warnings: NormalizationWarning[] = [];
  const writes = new Map<string, CanonicalWrite>();

  const addWrite = (write: CanonicalWrite, identity: string) => {
    const writeKey = `${write.type}:${identity}`;
    const existing = writes.get(writeKey);
    if (existing && JSON.stringify(existing.record) !== JSON.stringify(write.record)) {
      throw new NormalizationError('canonical_identity_conflict', `Multiple mock records resolve to ${writeKey} with different values.`);
    }
    writes.set(writeKey, write);
  };

  const resolve = (entityType: ProviderCanonicalRef['type'], externalId: string, proposed: ProviderCanonicalRef): ProviderCanonicalRef => {
    const identity = { providerId: context.providerId, entityType, externalId };
    const existing = context.mappings.find(identity);
    if (existing) {
      if (existing.type !== entityType) {
        throw new NormalizationError('mapping_type_mismatch', `Mock ${entityType} ${externalId} maps to canonical type ${existing.type}.`);
      }
      return existing;
    }
    const mapping = defineProviderMapping({
      providerId: context.providerId,
      providerEntityType: entityType,
      providerEntityId: externalId,
      canonical: proposed,
    });
    mappings.push(mapping);
    return proposed;
  };

  const groupsByExternalId = key(payload.competitionGroups, 'competition group');
  const competitionsByExternalId = key(payload.competitions, 'competition');
  const seasonsByExternalId = key(payload.seasons, 'season');
  const participantsByExternalId = key(payload.participants, 'participant');

  const groupIds = new Map<string, ReturnType<typeof competitionGroupId>>();
  for (const group of groupsByExternalId.values()) {
    const resolved = resolve('competition_group', group.externalId, { type: 'competition_group', id: competitionGroupId(group.slateKey) });
    if (resolved.type !== 'competition_group') throw new NormalizationError('mapping_type_mismatch', 'Expected a competition-group mapping.');
    groupIds.set(group.externalId, resolved.id);
    addWrite({ type: 'competition_group', record: defineCompetitionGroup({
      id: resolved.id,
      sportId: group.sport,
      name: group.name,
      shortName: group.shortName,
      slug: slug(group.slateKey),
    }) }, resolved.id);
  }

  const competitionIds = new Map<string, ReturnType<typeof competitionId>>();
  for (const competition of competitionsByExternalId.values()) {
    const resolved = resolve('competition', competition.externalId, { type: 'competition', id: competitionId(competition.slateKey) });
    if (resolved.type !== 'competition') throw new NormalizationError('mapping_type_mismatch', 'Expected a competition mapping.');
    const competitionGroupId = competition.groupExternalId ? groupIds.get(competition.groupExternalId) : undefined;
    if (competition.groupExternalId && !competitionGroupId) {
      throw new NormalizationError('unknown_reference', `Competition ${competition.externalId} references unknown group ${competition.groupExternalId}.`);
    }
    competitionIds.set(competition.externalId, resolved.id);
    addWrite({ type: 'competition', record: defineCompetition({
      id: resolved.id,
      sportId: competition.sport,
      name: competition.name,
      shortName: competition.shortName,
      slug: slug(competition.slateKey),
      ...(competition.category ? { category: competition.category } : {}),
      ...(competitionGroupId ? { competitionGroupId } : {}),
    }) }, resolved.id);
  }

  const seasonIds = new Map<string, ReturnType<typeof seasonId>>();
  for (const season of seasonsByExternalId.values()) {
    const competitionId = competitionIds.get(season.competitionExternalId);
    if (!competitionId) throw new NormalizationError('unknown_reference', `Season ${season.externalId} references unknown competition ${season.competitionExternalId}.`);
    const resolved = resolve('season', season.externalId, { type: 'season', id: seasonId(season.slateKey) });
    if (resolved.type !== 'season') throw new NormalizationError('mapping_type_mismatch', 'Expected a season mapping.');
    seasonIds.set(season.externalId, resolved.id);
    addWrite({ type: 'season', record: defineSeason({
      id: resolved.id,
      competitionId,
      name: season.name,
      ...(season.startsOn ? { startsOn: season.startsOn } : {}),
      ...(season.endsOn ? { endsOn: season.endsOn } : {}),
    }) }, resolved.id);
  }

  const participantIds = new Map<string, ReturnType<typeof participantId>>();
  for (const participant of participantsByExternalId.values()) {
    const resolved = resolve('participant', participant.externalId, { type: 'participant', id: participantId(participant.slateKey) });
    if (resolved.type !== 'participant') throw new NormalizationError('mapping_type_mismatch', 'Expected a participant mapping.');
    participantIds.set(participant.externalId, resolved.id);
    addWrite({ type: 'participant', record: defineParticipant({
      id: resolved.id,
      sportId: participant.sport,
      type: participant.type,
      name: participant.name,
      shortName: participant.shortName,
      slug: slug(participant.slateKey),
      ...(participant.countryCode ? { countryCode: participant.countryCode } : {}),
    }) }, resolved.id);
  }

  const participant = (externalId: string, path: string) => {
    const id = participantIds.get(externalId);
    if (!id) throw new NormalizationError('unknown_reference', `${path} references unknown participant ${externalId}.`);
    return id;
  };

  const canonicalState = (event: MockEventPayload): CanonicalEvent['state'] => {
    if (event.sport === 'soccer') return {
      ...(event.state.score ? { score: event.state.score } : {}),
      ...(event.state.phase ? { period: ({ first: 'first_half', break: 'halftime', second: 'second_half', extra: 'extra_time', shootout: 'penalties' } as const)[event.state.phase] } : {}),
      ...(event.state.minute !== undefined ? { minute: event.state.minute } : {}),
      ...(event.state.addedTime !== undefined ? { addedTime: event.state.addedTime } : {}),
      goals: event.state.goals.map((goal, index) => ({
        side: goal.side,
        minute: goal.minute,
        ...(goal.addedTime !== undefined ? { addedTime: goal.addedTime } : {}),
        ...(goal.scorerExternalId ? { scorerId: participant(goal.scorerExternalId, `Event ${event.externalId} goal ${index}`) } : {}),
      })),
    };
    if (event.sport === 'tennis') return {
      round: event.state.round,
      sets: event.state.sets.map(set => ({
        games: set.games,
        status: set.status === 'done' ? 'complete' as const : 'in_progress' as const,
        ...(set.tiebreak ? { tiebreak: set.tiebreak } : {}),
      })),
      ...(event.state.points ? { points: event.state.points } : {}),
      ...(event.state.serverExternalId ? { servingParticipantId: participant(event.state.serverExternalId, `Event ${event.externalId} server`) } : {}),
      ...(event.state.court ? { court: event.state.court } : {}),
      ...(event.state.bestOf ? { bestOf: event.state.bestOf } : {}),
      ...(event.state.durationSeconds !== undefined ? { durationSeconds: event.state.durationSeconds } : {}),
    };
    if (event.sport === 'baseball') return {
      innings: event.state.innings,
      ...(event.state.score ? { score: event.state.score } : {}),
      ...(event.state.inning !== undefined ? { inning: event.state.inning } : {}),
      ...(event.state.half ? { half: event.state.half === 'upper' ? 'top' as const : 'bottom' as const } : {}),
      ...(event.state.outs !== undefined ? { outs: event.state.outs } : {}),
      ...(event.state.balls !== undefined ? { balls: event.state.balls } : {}),
      ...(event.state.strikes !== undefined ? { strikes: event.state.strikes } : {}),
      ...(event.state.bases ? { bases: event.state.bases } : {}),
      ...(event.state.batterExternalId ? { batterId: participant(event.state.batterExternalId, `Event ${event.externalId} batter`) } : {}),
      ...(event.state.pitcherExternalId ? { pitcherId: participant(event.state.pitcherExternalId, `Event ${event.externalId} pitcher`) } : {}),
      ...(event.state.probablePitcherExternalIds ? { probablePitcherIds: [
        event.state.probablePitcherExternalIds[0] ? participant(event.state.probablePitcherExternalIds[0], `Event ${event.externalId} probable pitcher 0`) : undefined,
        event.state.probablePitcherExternalIds[1] ? participant(event.state.probablePitcherExternalIds[1], `Event ${event.externalId} probable pitcher 1`) : undefined,
      ] as const } : {}),
      ...(event.state.hits ? { hits: event.state.hits } : {}),
      ...(event.state.errors ? { errors: event.state.errors } : {}),
    };
    return {
      quarters: event.state.quarters,
      ...(event.state.score ? { score: event.state.score } : {}),
      ...(event.state.quarter !== undefined ? { quarter: event.state.quarter === 'overtime' ? 'OT' as const : event.state.quarter } : {}),
      ...(event.state.clock ? { clock: event.state.clock } : {}),
      ...(event.state.possessionExternalId ? { possessionParticipantId: participant(event.state.possessionExternalId, `Event ${event.externalId} possession`) } : {}),
      ...(event.state.down !== undefined ? { down: event.state.down } : {}),
      ...(event.state.distance !== undefined ? { distance: event.state.distance } : {}),
      ...(event.state.fieldPosition ? { fieldPosition: {
        territoryParticipantId: participant(event.state.fieldPosition.territoryExternalId, `Event ${event.externalId} field position`),
        yardLine: event.state.fieldPosition.yardLine,
      } } : {}),
    };
  };

  for (const event of payload.events) {
    const competition = competitionsByExternalId.get(event.competitionExternalId);
    const competitionId = competitionIds.get(event.competitionExternalId);
    if (!competition || !competitionId) throw new NormalizationError('unknown_reference', `Event ${event.externalId} references unknown competition ${event.competitionExternalId}.`);
    if (competition.sport !== event.sport) throw new NormalizationError('sport_mismatch', `Event ${event.externalId} and its competition must share a sport.`);
    const seasonId = event.seasonExternalId ? seasonIds.get(event.seasonExternalId) : undefined;
    if (event.seasonExternalId && !seasonId) throw new NormalizationError('unknown_reference', `Event ${event.externalId} references unknown season ${event.seasonExternalId}.`);
    const resolved = resolve('event', event.externalId, { type: 'event', id: eventId(event.slateKey) });
    if (resolved.type !== 'event') throw new NormalizationError('mapping_type_mismatch', 'Expected an event mapping.');
    const status = statusMap[event.status];
    const base = {
      id: resolved.id,
      competitionId,
      ...(seasonId ? { seasonId } : {}),
      startsAt: event.startsAt,
      status,
      ...(event.venue ? { venueName: event.venue } : {}),
    };
    const state = canonicalState(event);
    const canonicalEvent = event.sport === 'soccer'
      ? defineEvent({ ...base, sportId: 'soccer', state: state as Extract<CanonicalEvent, { sportId: 'soccer' }>['state'] })
      : event.sport === 'tennis'
        ? defineEvent({ ...base, sportId: 'tennis', state: state as Extract<CanonicalEvent, { sportId: 'tennis' }>['state'] })
        : event.sport === 'baseball'
          ? defineEvent({ ...base, sportId: 'baseball', state: state as Extract<CanonicalEvent, { sportId: 'baseball' }>['state'] })
          : defineEvent({ ...base, sportId: 'football', state: state as Extract<CanonicalEvent, { sportId: 'football' }>['state'] });
    addWrite({ type: 'event', record: canonicalEvent }, resolved.id);

    event.participants.forEach((entry, side) => {
      const participantId = participant(entry.externalId, `Event ${event.externalId} side ${side}`);
      const participantRecord = participantsByExternalId.get(entry.externalId);
      if (participantRecord?.sport !== event.sport) throw new NormalizationError('sport_mismatch', `Participant ${entry.externalId} cannot enter ${event.sport} event ${event.externalId}.`);
      const relation = defineEventParticipant({
        eventId: resolved.id,
        participantId,
        side: side as 0 | 1,
        order: 0,
        ...(entry.seed ? { seed: entry.seed } : {}),
      });
      addWrite({ type: 'event_participant', record: relation }, `${resolved.id}:${side}:0`);
    });

    if (!event.venue) warnings.push({ code: 'missing_venue', externalEventId: event.externalId, path: 'venue', message: 'Venue is absent; canonical venue remains unset.' });
    if (status === 'live') {
      const missing = event.sport === 'soccer' ? event.state.minute === undefined
        : event.sport === 'tennis' ? !event.state.serverExternalId
        : event.sport === 'baseball' ? event.state.inning === undefined || event.state.outs === undefined
        : !event.state.clock || !event.state.possessionExternalId;
      if (missing) warnings.push({ code: 'missing_live_detail', externalEventId: event.externalId, path: 'state', message: 'Optional live detail is incomplete; missing values remain unset.' });
    }
  }

  return {
    providerId: context.providerId,
    observedAt: context.observedAt,
    records: [...writes.values()],
    mappings,
    warnings,
  };
}

export const mockProviderNormalizer: ProviderNormalizer<MockProviderPayload> = { normalize: normalizeMockProvider };
