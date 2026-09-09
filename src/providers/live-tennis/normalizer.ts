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
import type { CanonicalEvent, EventStatus, ProviderCanonicalRef, ProviderEntityMapping } from '../../domain/model.ts';
import type { LiveTennisFixture, LiveTennisMatch, LiveTennisScore } from './types.ts';
import { findLiveTennisTournament, type LiveTennisTournamentRegistryEntry } from './tournament-registry.ts';

export interface LiveTennisNormalizationPayload {
  readonly matches: readonly LiveTennisMatch[];
  readonly fixtures: readonly LiveTennisFixture[];
}

type TennisWarningCode = 'unsupported_tournament' | 'out_of_scope_match' | 'missing_schedule' | 'missing_live_detail';

export interface LiveTennisNormalizationWarning extends NormalizationWarning {
  readonly code: TennisWarningCode;
  readonly externalEventId: string;
}

function slug(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function stableKey(value: string): string {
  return value.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase();
}

function addWrite(writes: Map<string, CanonicalWrite>, write: CanonicalWrite, identity: string): void {
  const key = `${write.type}:${identity}`;
  const existing = writes.get(key);
  if (existing && JSON.stringify(existing.record) !== JSON.stringify(write.record)) {
    throw new NormalizationError('canonical_identity_conflict', `Live Tennis records disagree for ${key}.`);
  }
  writes.set(key, write);
}

function statusFor(match: LiveTennisMatch): EventStatus {
  if (match.event_status === 'Postponed') return 'postponed';
  if (match.event_status === 'Interrupted') return 'suspended';
  if (match.event_status === 'Cancelled') return 'cancelled';
  if (match.status === 'upcoming') return 'scheduled';
  if (match.status === 'live') return 'live';
  if (match.status === 'cancelled') return 'cancelled';
  return 'final';
}

function isInScope(match: LiveTennisMatch): boolean {
  return (match.tour === 'atp' || match.tour === 'wta')
    && match.draw === 'singles'
    && !match.is_doubles
    && !match.is_qualifying;
}

function scheduleFor(match: LiveTennisMatch, fixtures: ReadonlyMap<number, LiveTennisFixture>): string | undefined {
  return match.scheduled_time ?? fixtures.get(match.id)?.start_time ?? undefined;
}

function scoreState(score: LiveTennisScore | null, status: EventStatus, p1: ReturnType<typeof participantId>, p2: ReturnType<typeof participantId>, match: LiveTennisMatch): CanonicalEvent['state'] {
  const games = score?.games ?? [[], []] as const;
  const activeTiebreak = score?.is_tiebreak
    && score.points[0] !== null && score.points[1] !== null
    && /^\d+$/.test(score.points[0]) && /^\d+$/.test(score.points[1])
    ? [Number(score.points[0]), Number(score.points[1])] as const
    : undefined;
  const sets = games[0].map((gamesForFirstPlayer, index) => ({
    games: [gamesForFirstPlayer, games[1][index]] as const,
    status: status === 'live' && index === games[0].length - 1 ? 'in_progress' as const : 'complete' as const,
    ...(activeTiebreak && index === games[0].length - 1
      ? { tiebreak: activeTiebreak }
      : {}),
  }));
  const points = status === 'live' && score !== null && score.points[0] !== null && score.points[1] !== null
    ? [score.points[0], score.points[1]] as const
    : undefined;
  const servingParticipantId = status === 'live' && score?.server === 1 ? p1 : status === 'live' && score?.server === 2 ? p2 : undefined;
  return {
    round: match.round ?? match.round_code ?? 'Scheduled',
    sets,
    ...(points ? { points } : {}),
    ...(servingParticipantId ? { servingParticipantId } : {}),
    ...(match.format === 'BO3' ? { bestOf: 3 as const } : match.format === 'BO5' ? { bestOf: 5 as const } : {}),
  };
}

function resolve(
  context: NormalizationContext,
  mappings: ProviderEntityMapping[],
  type: ProviderCanonicalRef['type'],
  externalId: string,
  proposed: ProviderCanonicalRef,
): ProviderCanonicalRef {
  const existing = context.mappings.find({ providerId: context.providerId, entityType: type, externalId });
  if (existing) {
    if (existing.type !== type) throw new NormalizationError('mapping_type_mismatch', `Live Tennis ${type} ${externalId} has an incompatible mapping.`);
    return existing;
  }
  mappings.push(defineProviderMapping({ providerId: context.providerId, providerEntityType: type, providerEntityId: externalId, canonical: proposed }));
  return proposed;
}

function mappedCompetition(context: NormalizationContext, match: LiveTennisMatch, registry: LiveTennisTournamentRegistryEntry): ProviderCanonicalRef {
  const existing = context.mappings.find({ providerId: context.providerId, entityType: 'competition', externalId: registry.providerTournamentId });
  if (existing && existing.type !== 'competition') throw new NormalizationError('mapping_type_mismatch', `Live Tennis tournament ${match.tournament_id} has an incompatible mapping.`);
  return existing ?? { type: 'competition', id: registry.competitionId };
}

function normalizeLiveTennis(payload: LiveTennisNormalizationPayload, context: NormalizationContext): NormalizationBatch {
  assertObservationInstant(context.observedAt);
  const fixtureByMatchId = new Map<number, LiveTennisFixture>();
  for (const fixture of payload.fixtures) {
    const existing = fixtureByMatchId.get(fixture.match_id);
    if (!existing || Date.parse(fixture.updated_at) > Date.parse(existing.updated_at)) fixtureByMatchId.set(fixture.match_id, fixture);
  }

  const mappings: ProviderEntityMapping[] = [];
  const writes = new Map<string, CanonicalWrite>();
  const warnings: LiveTennisNormalizationWarning[] = [];
  const seenMatchIds = new Set<number>();

  for (const match of payload.matches) {
    if (seenMatchIds.has(match.id)) throw new NormalizationError('duplicate_external_identity', `Live Tennis match ${match.id} is duplicated.`);
    seenMatchIds.add(match.id);
    const externalEventId = String(match.id);
    if (!isInScope(match)) {
      warnings.push({ code: 'out_of_scope_match', externalEventId, path: 'match', message: 'Only ATP/WTA main-draw singles are eligible for the first tennis slice.' });
      continue;
    }
    if (match.tournament_id === null) {
      warnings.push({ code: 'unsupported_tournament', externalEventId, path: 'tournament_id', message: 'The provider match has no stable tournament identity.' });
      continue;
    }
    const tournament = findLiveTennisTournament(match.tournament_id);
    if (!tournament) {
      warnings.push({ code: 'unsupported_tournament', externalEventId, path: 'tournament_id', message: 'The provider tournament is not in Slate’s reviewed registry.' });
      continue;
    }
    const startsAt = scheduleFor(match, fixtureByMatchId);
    if (!startsAt) {
      warnings.push({ code: 'missing_schedule', externalEventId, path: 'scheduled_time', message: 'The match has no truthful UTC schedule in match or fixture data.' });
      continue;
    }

    addWrite(writes, { type: 'competition_group', record: defineCompetitionGroup({
      id: tournament.competitionGroupId, sportId: 'tennis', name: tournament.groupName, shortName: tournament.groupShortName, slug: tournament.groupSlug,
    }) }, tournament.competitionGroupId);

    const competition = mappedCompetition(context, match, tournament);
    if (competition.type !== 'competition') throw new NormalizationError('mapping_type_mismatch', 'Expected a tennis competition mapping.');
    if (!context.mappings.find({ providerId: context.providerId, entityType: 'competition', externalId: tournament.providerTournamentId })) {
      mappings.push(defineProviderMapping({ providerId: context.providerId, providerEntityType: 'competition', providerEntityId: tournament.providerTournamentId, canonical: competition }));
    }
    addWrite(writes, { type: 'competition', record: defineCompetition({
      id: competition.id, sportId: 'tennis', name: tournament.competitionName, shortName: tournament.competitionShortName,
      slug: tournament.competitionSlug, category: tournament.category, competitionGroupId: tournament.competitionGroupId,
    }) }, competition.id);

    const year = startsAt.slice(0, 4);
    const season = resolve(context, mappings, 'season', `${tournament.providerTournamentId}:${year}`, { type: 'season', id: seasonId(`${stableKey(competition.id)}-${year}`) });
    if (season.type !== 'season') throw new NormalizationError('mapping_type_mismatch', 'Expected a tennis season mapping.');
    addWrite(writes, { type: 'season', record: defineSeason({ id: season.id, competitionId: competition.id, name: year, startsOn: `${year}-01-01`, endsOn: `${year}-12-31` }) }, season.id);

    const normalizePlayer = (player: LiveTennisMatch['players']['p1']) => {
      const resolved = resolve(context, mappings, 'participant', String(player.id), { type: 'participant', id: participantId(`live-tennis-player-${player.id}`) });
      if (resolved.type !== 'participant') throw new NormalizationError('mapping_type_mismatch', 'Expected a tennis participant mapping.');
      addWrite(writes, { type: 'participant', record: defineParticipant({
        id: resolved.id, sportId: 'tennis', type: 'player', name: player.name, shortName: player.name, slug: slug(`live-tennis-player-${player.id}`),
        ...(player.country && /^[A-Za-z]{2}$/.test(player.country) ? { countryCode: player.country.toUpperCase() } : {}),
      }) }, resolved.id);
      return resolved.id;
    };
    const playerIds = [normalizePlayer(match.players.p1), normalizePlayer(match.players.p2)] as const;

    const status = statusFor(match);
    const event = resolve(context, mappings, 'event', externalEventId, { type: 'event', id: eventId(`live-tennis-match-${match.id}`) });
    if (event.type !== 'event') throw new NormalizationError('mapping_type_mismatch', 'Expected a tennis event mapping.');
    addWrite(writes, { type: 'event', record: defineEvent({
      id: event.id, sportId: 'tennis', competitionId: competition.id, seasonId: season.id, startsAt, status,
      state: scoreState(match.score, status, playerIds[0], playerIds[1], match) as Extract<CanonicalEvent, { sportId: 'tennis' }>['state'],
    }) }, event.id);
    playerIds.forEach((id, side) => addWrite(writes, { type: 'event_participant', record: defineEventParticipant({ eventId: event.id, participantId: id, side: side as 0 | 1, order: 0 }) }, `${event.id}:${side}:0`));

    if (status === 'live' && (!match.score || match.score.server === null || match.score.points[0] === null || match.score.points[1] === null)) {
      warnings.push({ code: 'missing_live_detail', externalEventId, path: 'score', message: 'Optional live detail is incomplete; absent values remain unset.' });
    }
  }

  return { providerId: context.providerId, observedAt: context.observedAt, records: [...writes.values()], mappings, warnings };
}

export const liveTennisNormalizer: ProviderNormalizer<LiveTennisNormalizationPayload> = { normalize: normalizeLiveTennis };
