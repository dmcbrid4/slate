import type { DomainId } from './ids.ts';
import type {
  AssetRef,
  BaseballEventState,
  CanonicalEvent,
  Collection,
  Competition,
  CompetitionGroup,
  DomainGraph,
  EventParticipant,
  Follow,
  FollowTarget,
  FootballEventState,
  Participant,
  Provider,
  ProviderCanonicalRef,
  ProviderEntityMapping,
  Season,
  SideScore,
  SoccerEventState,
  Sport,
  TennisEventState,
} from './model.ts';

export class DomainInvariantError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'DomainInvariantError';
    this.code = code;
  }
}

function fail(code: string, message: string): never {
  throw new DomainInvariantError(code, message);
}

function assertNonEmpty(value: unknown, label: string): asserts value is string {
  if (typeof value !== 'string' || !value.trim()) fail('empty_value', `${label} must not be empty.`);
}

function assertSlug(value: string, label: string): void {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)) fail('invalid_slug', `${label} must be a lowercase slug.`);
}

function assertDateOnly(value: string, label: string): void {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) fail('invalid_date', `${label} must use YYYY-MM-DD.`);
  const parsed = new Date(`${value}T00:00:00Z`);
  if (!Number.isFinite(parsed.valueOf()) || parsed.toISOString().slice(0, 10) !== value) {
    fail('invalid_date', `${label} must be a real calendar date.`);
  }
}

function assertInstant(value: string, label: string): void {
  if (!/(?:Z|[+-]\d{2}:\d{2})$/.test(value) || !Number.isFinite(Date.parse(value))) {
    fail('invalid_instant', `${label} must include an explicit UTC offset.`);
  }
}

function assertPosition(value: number, label: string): void {
  if (!Number.isInteger(value) || value < 0) fail('invalid_position', `${label} must be a non-negative integer.`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function assertOptionalInteger(value: number | undefined, minimum: number, maximum: number, label: string): void {
  if (value === undefined) return;
  if (!Number.isInteger(value) || value < minimum || value > maximum) {
    fail('invalid_score_state', `${label} must be an integer from ${minimum} to ${maximum}.`);
  }
}

function assertSideScore(score: SideScore | undefined, label: string): void {
  if (score === undefined) return;
  if (!Array.isArray(score) || score.length !== 2 || score.some(value => !Number.isInteger(value) || value < 0)) {
    fail('invalid_score_state', `${label} must contain two non-negative integer totals.`);
  }
}

function assertLineScore(lines: readonly [readonly (number | null)[], readonly (number | null)[]], label: string): void {
  if (!Array.isArray(lines) || lines.length !== 2 || lines.some(line => !Array.isArray(line) || line.some(value => value !== null && (!Number.isInteger(value) || value < 0)))) {
    fail('invalid_score_state', `${label} must contain non-negative inning or period totals.`);
  }
}

function assertAsset(asset: AssetRef | undefined, label: string): void {
  if (!asset) return;
  if (!isRecord(asset)) fail('invalid_asset', `${label} must be an asset reference.`);
  if (asset.type === 'local' && typeof asset.path === 'string') return assertNonEmpty(asset.path, label);
  if (asset.type === 'remote' && typeof asset.url === 'string') return assertNonEmpty(asset.url, label);
  fail('invalid_asset', `${label} must contain a local path or remote URL.`);
}

function assertSoccerState(state: SoccerEventState): void {
  if (!isRecord(state) || !Array.isArray(state.goals)) fail('invalid_score_state', 'Soccer state must contain a goals array.');
  assertSideScore(state.score, 'Soccer score');
  assertSideScore(state.aggregateScore, 'Soccer aggregate score');
  assertSideScore(state.penaltyScore, 'Soccer penalty score');
  assertOptionalInteger(state.minute, 0, 240, 'Soccer minute');
  assertOptionalInteger(state.addedTime, 0, 60, 'Soccer added time');
  for (const goal of state.goals) {
    if (!isRecord(goal) || (goal.side !== 0 && goal.side !== 1) || typeof goal.minute !== 'number') fail('invalid_score_state', 'Soccer goals must contain a valid side and minute.');
    if (goal.addedTime !== undefined && typeof goal.addedTime !== 'number') fail('invalid_score_state', 'Goal added time must be numeric.');
    assertOptionalInteger(goal.minute as number, 0, 240, 'Goal minute');
    assertOptionalInteger(goal.addedTime as number | undefined, 0, 60, 'Goal added time');
  }
}

function assertTennisState(state: TennisEventState): void {
  if (!isRecord(state) || !Array.isArray(state.sets)) fail('invalid_score_state', 'Tennis state must contain a sets array.');
  assertNonEmpty(state.round, 'Tennis round');
  if (state.court !== undefined) assertNonEmpty(state.court, 'Tennis court');
  for (const [index, set] of state.sets.entries()) {
    if (!isRecord(set) || (set.status !== 'complete' && set.status !== 'in_progress')) fail('invalid_score_state', `Tennis set ${index + 1} has an invalid status.`);
    assertSideScore(set.games as SideScore | undefined, `Tennis set ${index + 1}`);
    assertSideScore(set.tiebreak as SideScore | undefined, `Tennis set ${index + 1} tiebreak`);
  }
  if (state.points && (!Array.isArray(state.points) || state.points.length !== 2 || state.points.some(point => typeof point !== 'string' || !point.trim()))) {
    fail('invalid_score_state', 'Tennis points must not be empty.');
  }
  if (state.durationSeconds !== undefined && (!Number.isInteger(state.durationSeconds) || state.durationSeconds < 0)) {
    fail('invalid_score_state', 'Tennis duration must be a non-negative integer number of seconds.');
  }
  const inProgress = state.sets.filter(set => set.status === 'in_progress').length;
  if (inProgress > 1 || (inProgress === 1 && state.sets.at(-1)?.status !== 'in_progress')) {
    fail('invalid_score_state', 'Only the last tennis set may be in progress.');
  }
}

function assertBaseballState(state: BaseballEventState): void {
  if (!isRecord(state) || !Array.isArray(state.innings)) fail('invalid_score_state', 'Baseball state must contain two inning lines.');
  assertSideScore(state.score, 'Baseball score');
  assertLineScore(state.innings, 'Baseball innings');
  assertSideScore(state.hits, 'Baseball hits');
  assertSideScore(state.errors, 'Baseball errors');
  if (state.inning !== undefined && (!Number.isInteger(state.inning) || state.inning < 1)) {
    fail('invalid_score_state', 'Baseball inning must be a positive integer.');
  }
  assertOptionalInteger(state.outs, 0, 2, 'Baseball outs');
  assertOptionalInteger(state.balls, 0, 3, 'Baseball balls');
  assertOptionalInteger(state.strikes, 0, 2, 'Baseball strikes');
}

function assertFootballState(state: FootballEventState): void {
  if (!isRecord(state) || !Array.isArray(state.quarters)) fail('invalid_score_state', 'Football state must contain two quarter lines.');
  assertSideScore(state.score, 'Football score');
  assertLineScore(state.quarters, 'Football quarters');
  if (state.clock !== undefined) assertNonEmpty(state.clock, 'Football clock');
  if (state.distance !== undefined && (!Number.isInteger(state.distance) || state.distance < 0)) {
    fail('invalid_score_state', 'Football distance must be a non-negative integer.');
  }
  if (state.fieldPosition && (!Number.isInteger(state.fieldPosition.yardLine) || state.fieldPosition.yardLine < 0 || state.fieldPosition.yardLine > 50)) {
    fail('invalid_score_state', 'Football yard line must be an integer from 0 to 50.');
  }
}

function assertUniqueIds<T extends { readonly id: string }>(values: readonly T[], label: string): void {
  const seen = new Set<string>();
  for (const value of values) {
    if (seen.has(value.id)) fail('duplicate_id', `${label} ID ${value.id} is duplicated.`);
    seen.add(value.id);
  }
}

function indexById<T extends { readonly id: string }>(values: readonly T[]): Map<string, T> {
  return new Map(values.map(value => [value.id, value]));
}

function targetKey(target: FollowTarget): string {
  return `${target.type}:${target.id}`;
}

function assertTargetExists(target: FollowTarget, graph: DomainGraph, label: string): void {
  const exists = target.type === 'participant'
    ? graph.participants.some(item => item.id === target.id)
    : target.type === 'competition'
      ? graph.competitions.some(item => item.id === target.id)
      : target.type === 'competition_group'
        ? graph.competitionGroups.some(item => item.id === target.id)
        : graph.collections.some(item => item.id === target.id);
  if (!exists) fail('missing_reference', `${label} references missing ${targetKey(target)}.`);
}

function canonicalRefExists(ref: ProviderCanonicalRef, graph: DomainGraph): boolean {
  if (ref.type === 'participant') return graph.participants.some(item => item.id === ref.id);
  if (ref.type === 'competition') return graph.competitions.some(item => item.id === ref.id);
  if (ref.type === 'competition_group') return graph.competitionGroups.some(item => item.id === ref.id);
  if (ref.type === 'season') return graph.seasons.some(item => item.id === ref.id);
  return graph.events.some(item => item.id === ref.id);
}

export function defineSport<T extends Sport>(value: T): T {
  assertNonEmpty(value.name, 'Sport name');
  return value;
}

export function defineParticipant<T extends Participant>(value: T): T {
  assertNonEmpty(value.name, 'Participant name');
  assertNonEmpty(value.shortName, 'Participant short name');
  assertSlug(value.slug, 'Participant slug');
  if (value.countryCode && !/^[A-Z]{2}$/.test(value.countryCode)) {
    fail('invalid_country_code', 'Participant country code must be two uppercase letters.');
  }
  assertAsset(value.mark, 'Participant mark');
  return value;
}

export function defineCompetition<T extends Competition>(value: T): T {
  assertNonEmpty(value.name, 'Competition name');
  assertNonEmpty(value.shortName, 'Competition short name');
  assertSlug(value.slug, 'Competition slug');
  return value;
}

export function defineCompetitionGroup<T extends CompetitionGroup>(value: T): T {
  assertNonEmpty(value.name, 'Competition group name');
  assertNonEmpty(value.shortName, 'Competition group short name');
  assertSlug(value.slug, 'Competition group slug');
  return value;
}

export function defineSeason<T extends Season>(value: T): T {
  assertNonEmpty(value.name, 'Season name');
  if (value.startsOn) assertDateOnly(value.startsOn, 'Season start');
  if (value.endsOn) assertDateOnly(value.endsOn, 'Season end');
  if (value.startsOn && value.endsOn && value.startsOn > value.endsOn) {
    fail('invalid_date_range', 'Season start must not be after its end.');
  }
  return value;
}

export function defineCollection<T extends Collection>(value: T): T {
  assertNonEmpty(value.name, 'Collection name');
  assertNonEmpty(value.shortName, 'Collection short name');
  assertSlug(value.slug, 'Collection slug');
  return value;
}

export function defineFollow<T extends Follow>(value: T): T {
  assertPosition(value.position, 'Follow position');
  return value;
}

export function defineProvider<T extends Provider>(value: T): T {
  assertNonEmpty(value.name, 'Provider name');
  return value;
}

export function defineProviderMapping<T extends ProviderEntityMapping>(value: T): T {
  assertNonEmpty(value.providerEntityType, 'Provider entity type');
  assertNonEmpty(value.providerEntityId, 'Provider entity ID');
  return value;
}

export function defineEvent<T extends CanonicalEvent>(value: T): T {
  assertInstant(value.startsAt, 'Event start');
  if (value.venueName !== undefined) assertNonEmpty(value.venueName, 'Venue name');
  if (value.sportId === 'soccer') assertSoccerState(value.state);
  else if (value.sportId === 'tennis') assertTennisState(value.state);
  else if (value.sportId === 'baseball') assertBaseballState(value.state);
  else assertFootballState(value.state);
  return value;
}

export function defineEventParticipant<T extends EventParticipant>(value: T): T {
  assertPosition(value.order, 'Event participant order');
  if (value.seed !== undefined && (!Number.isInteger(value.seed) || value.seed < 1)) {
    fail('invalid_seed', 'Event participant seed must be a positive integer.');
  }
  return value;
}

export function assertDomainGraph(graph: DomainGraph): void {
  assertUniqueIds(graph.sports, 'Sport');
  assertUniqueIds(graph.participants, 'Participant');
  assertUniqueIds(graph.competitionGroups, 'Competition group');
  assertUniqueIds(graph.competitions, 'Competition');
  assertUniqueIds(graph.seasons, 'Season');
  assertUniqueIds(graph.events, 'Event');
  assertUniqueIds(graph.collections, 'Collection');
  assertUniqueIds(graph.follows, 'Follow');
  assertUniqueIds(graph.providers, 'Provider');

  graph.sports.forEach(defineSport);
  graph.participants.forEach(defineParticipant);
  graph.competitionGroups.forEach(defineCompetitionGroup);
  graph.competitions.forEach(defineCompetition);
  graph.seasons.forEach(defineSeason);
  graph.events.forEach(defineEvent);
  graph.collections.forEach(defineCollection);
  graph.follows.forEach(defineFollow);
  graph.providers.forEach(defineProvider);
  graph.providerMappings.forEach(defineProviderMapping);
  graph.eventParticipants.forEach(defineEventParticipant);

  const sports = new Set(graph.sports.map(item => item.id));
  const participants = indexById(graph.participants);
  const groups = indexById(graph.competitionGroups);
  const competitions = indexById(graph.competitions);
  const seasons = indexById(graph.seasons);
  const events = indexById(graph.events);
  const collections = indexById(graph.collections);
  const providers = indexById(graph.providers);

  for (const participant of graph.participants) {
    if (!sports.has(participant.sportId)) fail('missing_reference', `Participant ${participant.id} references a missing sport.`);
  }
  for (const group of graph.competitionGroups) {
    if (!sports.has(group.sportId)) fail('missing_reference', `Competition group ${group.id} references a missing sport.`);
  }
  for (const competition of graph.competitions) {
    if (!sports.has(competition.sportId)) fail('missing_reference', `Competition ${competition.id} references a missing sport.`);
    if (competition.competitionGroupId) {
      const group = groups.get(competition.competitionGroupId);
      if (!group) fail('missing_reference', `Competition ${competition.id} references a missing group.`);
      if (group.sportId !== competition.sportId) fail('sport_mismatch', `Competition ${competition.id} and its group must share a sport.`);
    }
  }
  for (const season of graph.seasons) {
    if (!competitions.has(season.competitionId)) fail('missing_reference', `Season ${season.id} references a missing competition.`);
  }
  for (const event of graph.events) {
    const competition = competitions.get(event.competitionId);
    if (!competition) fail('missing_reference', `Event ${event.id} references a missing competition.`);
    if (competition.sportId !== event.sportId) fail('sport_mismatch', `Event ${event.id} and its competition must share a sport.`);
    if (event.seasonId) {
      const season = seasons.get(event.seasonId);
      if (!season) fail('missing_reference', `Event ${event.id} references a missing season.`);
      if (season.competitionId !== event.competitionId) fail('season_mismatch', `Event ${event.id} references a season from another competition.`);
    }
  }

  const eventParticipantKeys = new Set<string>();
  const eventParticipantIdentities = new Set<string>();
  const sidesByEvent = new Map<string, Set<number>>();
  for (const relation of graph.eventParticipants) {
    const event = events.get(relation.eventId);
    const participant = participants.get(relation.participantId);
    if (!event) fail('missing_reference', `Event participant references missing event ${relation.eventId}.`);
    if (!participant) fail('missing_reference', `Event participant references missing participant ${relation.participantId}.`);
    if (participant.sportId !== event.sportId) fail('sport_mismatch', `Participant ${participant.id} cannot enter event ${event.id}.`);
    const key = `${relation.eventId}:${relation.side}:${relation.order}`;
    if (eventParticipantKeys.has(key)) fail('duplicate_position', `Event participant position ${key} is duplicated.`);
    eventParticipantKeys.add(key);
    const identity = `${relation.eventId}:${relation.participantId}`;
    if (eventParticipantIdentities.has(identity)) fail('duplicate_event_participant', `Participant ${relation.participantId} is duplicated in event ${relation.eventId}.`);
    eventParticipantIdentities.add(identity);
    const sides = sidesByEvent.get(relation.eventId) ?? new Set<number>();
    sides.add(relation.side);
    sidesByEvent.set(relation.eventId, sides);
  }
  for (const event of graph.events) {
    const sides = sidesByEvent.get(event.id);
    if (!sides?.has(0) || !sides.has(1)) fail('missing_event_side', `Event ${event.id} must have participants on both sides.`);
    if (event.sportId === 'tennis' && event.state.servingParticipantId && !graph.eventParticipants.some(item => item.eventId === event.id && item.participantId === event.state.servingParticipantId)) {
      fail('invalid_event_reference', `Tennis server must participate in event ${event.id}.`);
    }
    const assertSportReference = (participantId: string | undefined, label: string) => {
      if (!participantId) return;
      const participant = participants.get(participantId);
      if (!participant) fail('missing_reference', `${label} references missing participant ${participantId}.`);
      if (participant.sportId !== event.sportId) fail('sport_mismatch', `${label} must reference a ${event.sportId} participant.`);
    };
    if (event.sportId === 'soccer') {
      event.state.goals.forEach(goal => assertSportReference(goal.scorerId, `Goal in event ${event.id}`));
    }
    if (event.sportId === 'baseball') {
      event.state.probablePitcherIds?.forEach(id => assertSportReference(id, `Probable pitcher in event ${event.id}`));
      assertSportReference(event.state.batterId, `Batter in event ${event.id}`);
      assertSportReference(event.state.pitcherId, `Pitcher in event ${event.id}`);
      assertSportReference(event.state.decision?.winningPitcherId, `Winning pitcher in event ${event.id}`);
      assertSportReference(event.state.decision?.losingPitcherId, `Losing pitcher in event ${event.id}`);
      assertSportReference(event.state.decision?.savePitcherId, `Save pitcher in event ${event.id}`);
    }
    if (event.sportId === 'football') {
      const references = [event.state.possessionParticipantId, event.state.fieldPosition?.territoryParticipantId].filter(Boolean);
      for (const participantId of references) {
        if (!graph.eventParticipants.some(item => item.eventId === event.id && item.participantId === participantId)) {
          fail('invalid_event_reference', `Football state must reference a participant in event ${event.id}.`);
        }
      }
    }
  }

  const collectionPositions = new Set<string>();
  for (const member of graph.collectionMembers) {
    if (!collections.has(member.collectionId)) fail('missing_reference', `Collection member references missing collection ${member.collectionId}.`);
    assertPosition(member.position, 'Collection member position');
    assertTargetExists(member.target, graph, 'Collection member');
    const key = `${member.collectionId}:${member.position}`;
    if (collectionPositions.has(key)) fail('duplicate_position', `Collection position ${key} is duplicated.`);
    collectionPositions.add(key);
  }

  const followPositions = new Set<string>();
  const followTargets = new Set<string>();
  for (const follow of graph.follows) {
    assertTargetExists(follow.target, graph, `Follow ${follow.id}`);
    const positionKey = `${follow.ownerId}:${follow.position}`;
    const target = `${follow.ownerId}:${targetKey(follow.target)}`;
    if (followPositions.has(positionKey)) fail('duplicate_position', `Follow position ${positionKey} is duplicated.`);
    if (followTargets.has(target)) fail('duplicate_follow', `Follow target ${target} is duplicated.`);
    followPositions.add(positionKey);
    followTargets.add(target);
  }

  const externalMappings = new Set<string>();
  for (const mapping of graph.providerMappings) {
    if (!providers.has(mapping.providerId)) fail('missing_reference', `Provider mapping references missing provider ${mapping.providerId}.`);
    if (!canonicalRefExists(mapping.canonical, graph)) fail('missing_reference', 'Provider mapping references a missing canonical record.');
    const key = `${mapping.providerId}:${mapping.providerEntityType}:${mapping.providerEntityId}`;
    if (externalMappings.has(key)) fail('duplicate_provider_identity', `Provider identity ${key} is duplicated.`);
    externalMappings.add(key);
  }
}

export function defineDomainGraph<T extends DomainGraph>(graph: T): T {
  assertDomainGraph(graph);
  return graph;
}

export function asString<TName extends string>(id: DomainId<TName>): string {
  return id;
}
