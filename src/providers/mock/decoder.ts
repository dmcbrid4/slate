import type { ProviderDecoder } from '../../application/normalization.ts';
import { sportCodes } from '../../domain/model.ts';
import { mockStatuses, type MockProviderPayload } from './types.ts';

export class MockProviderDecodeError extends Error {
  readonly path: string;

  constructor(path: string, message: string) {
    super(`${path}: ${message}`);
    this.name = 'MockProviderDecodeError';
    this.path = path;
  }
}

function record(value: unknown, path: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new MockProviderDecodeError(path, 'expected an object');
  return value as Record<string, unknown>;
}

function string(value: unknown, path: string): string {
  if (typeof value !== 'string' || !value.trim()) throw new MockProviderDecodeError(path, 'expected a non-empty string');
  return value;
}

function optionalString(value: unknown, path: string): string | undefined {
  return value === undefined ? undefined : string(value, path);
}

function integer(value: unknown, path: string, minimum = 0): number {
  if (!Number.isInteger(value) || (value as number) < minimum) throw new MockProviderDecodeError(path, `expected an integer of at least ${minimum}`);
  return value as number;
}

function array(value: unknown, path: string): readonly unknown[] {
  if (!Array.isArray(value)) throw new MockProviderDecodeError(path, 'expected an array');
  return value;
}

function oneOf<T extends string | number>(value: unknown, values: readonly T[], path: string): T {
  if (!values.includes(value as T)) throw new MockProviderDecodeError(path, `expected one of ${values.join(', ')}`);
  return value as T;
}

function optionalInteger(value: unknown, path: string, minimum = 0): number | undefined {
  return value === undefined ? undefined : integer(value, path, minimum);
}

function sideScore(value: unknown, path: string): void {
  const values = array(value, path);
  if (values.length !== 2) throw new MockProviderDecodeError(path, 'expected two side values');
  values.forEach((item, index) => integer(item, `${path}[${index}]`));
}

function optionalSideScore(value: unknown, path: string): void {
  if (value !== undefined) sideScore(value, path);
}

function lineScore(value: unknown, path: string): void {
  const sides = array(value, path);
  if (sides.length !== 2) throw new MockProviderDecodeError(path, 'expected two side lines');
  sides.forEach((side, sideIndex) => array(side, `${path}[${sideIndex}]`).forEach((item, index) => {
    if (item !== null) integer(item, `${path}[${sideIndex}][${index}]`);
  }));
}

function eventParticipants(value: unknown, path: string): void {
  const participants = array(value, path);
  if (participants.length !== 2) throw new MockProviderDecodeError(path, 'expected exactly two participants');
  participants.forEach((item, index) => {
    const participant = record(item, `${path}[${index}]`);
    string(participant.externalId, `${path}[${index}].externalId`);
    optionalInteger(participant.seed, `${path}[${index}].seed`, 1);
  });
}

function soccerState(value: unknown, path: string): void {
  const state = record(value, path);
  optionalSideScore(state.score, `${path}.score`);
  if (state.phase !== undefined) oneOf(state.phase, ['first', 'break', 'second', 'extra', 'shootout'] as const, `${path}.phase`);
  optionalInteger(state.minute, `${path}.minute`);
  optionalInteger(state.addedTime, `${path}.addedTime`);
  array(state.goals, `${path}.goals`).forEach((item, index) => {
    const goal = record(item, `${path}.goals[${index}]`);
    oneOf(goal.side, [0, 1] as const, `${path}.goals[${index}].side`);
    integer(goal.minute, `${path}.goals[${index}].minute`);
    optionalInteger(goal.addedTime, `${path}.goals[${index}].addedTime`);
    optionalString(goal.scorerExternalId, `${path}.goals[${index}].scorerExternalId`);
  });
}

function tennisState(value: unknown, path: string): void {
  const state = record(value, path);
  string(state.round, `${path}.round`);
  optionalString(state.court, `${path}.court`);
  if (state.bestOf !== undefined) oneOf(state.bestOf, [3, 5] as const, `${path}.bestOf`);
  array(state.sets, `${path}.sets`).forEach((item, index) => {
    const set = record(item, `${path}.sets[${index}]`);
    sideScore(set.games, `${path}.sets[${index}].games`);
    oneOf(set.status, ['done', 'playing'] as const, `${path}.sets[${index}].status`);
    optionalSideScore(set.tiebreak, `${path}.sets[${index}].tiebreak`);
  });
  if (state.points !== undefined) {
    const points = array(state.points, `${path}.points`);
    if (points.length !== 2) throw new MockProviderDecodeError(`${path}.points`, 'expected two point values');
    points.forEach((point, index) => string(point, `${path}.points[${index}]`));
  }
  optionalString(state.serverExternalId, `${path}.serverExternalId`);
  optionalInteger(state.durationSeconds, `${path}.durationSeconds`);
}

function baseballState(value: unknown, path: string): void {
  const state = record(value, path);
  optionalSideScore(state.score, `${path}.score`);
  lineScore(state.innings, `${path}.innings`);
  optionalInteger(state.inning, `${path}.inning`, 1);
  if (state.half !== undefined) oneOf(state.half, ['upper', 'lower'] as const, `${path}.half`);
  optionalInteger(state.outs, `${path}.outs`);
  optionalInteger(state.balls, `${path}.balls`);
  optionalInteger(state.strikes, `${path}.strikes`);
  if (state.bases !== undefined) {
    const bases = array(state.bases, `${path}.bases`);
    if (bases.length !== 3 || bases.some(base => typeof base !== 'boolean')) throw new MockProviderDecodeError(`${path}.bases`, 'expected three booleans');
  }
  optionalString(state.batterExternalId, `${path}.batterExternalId`);
  optionalString(state.pitcherExternalId, `${path}.pitcherExternalId`);
  if (state.probablePitcherExternalIds !== undefined) {
    const pitchers = array(state.probablePitcherExternalIds, `${path}.probablePitcherExternalIds`);
    if (pitchers.length !== 2) throw new MockProviderDecodeError(`${path}.probablePitcherExternalIds`, 'expected two pitcher values');
    pitchers.forEach((pitcher, index) => optionalString(pitcher, `${path}.probablePitcherExternalIds[${index}]`));
  }
  optionalSideScore(state.hits, `${path}.hits`);
  optionalSideScore(state.errors, `${path}.errors`);
}

function footballState(value: unknown, path: string): void {
  const state = record(value, path);
  optionalSideScore(state.score, `${path}.score`);
  lineScore(state.quarters, `${path}.quarters`);
  if (state.quarter !== undefined) oneOf(state.quarter, [1, 2, 3, 4, 'overtime'] as const, `${path}.quarter`);
  optionalString(state.clock, `${path}.clock`);
  optionalString(state.possessionExternalId, `${path}.possessionExternalId`);
  if (state.down !== undefined) oneOf(state.down, [1, 2, 3, 4] as const, `${path}.down`);
  optionalInteger(state.distance, `${path}.distance`);
  if (state.fieldPosition !== undefined) {
    const field = record(state.fieldPosition, `${path}.fieldPosition`);
    string(field.territoryExternalId, `${path}.fieldPosition.territoryExternalId`);
    integer(field.yardLine, `${path}.fieldPosition.yardLine`);
  }
}

function parseMockProviderPayload(input: unknown): MockProviderPayload {
  const payload = record(input, '$');
  if (payload.schemaVersion !== 1) throw new MockProviderDecodeError('$.schemaVersion', 'expected 1');

  array(payload.participants, '$.participants').forEach((item, index) => {
    const participant = record(item, `$.participants[${index}]`);
    string(participant.externalId, `$.participants[${index}].externalId`);
    string(participant.slateKey, `$.participants[${index}].slateKey`);
    oneOf(participant.sport, sportCodes, `$.participants[${index}].sport`);
    oneOf(participant.type, ['team', 'player'] as const, `$.participants[${index}].type`);
    string(participant.name, `$.participants[${index}].name`);
    string(participant.shortName, `$.participants[${index}].shortName`);
    optionalString(participant.countryCode, `$.participants[${index}].countryCode`);
  });
  array(payload.competitionGroups, '$.competitionGroups').forEach((item, index) => {
    const group = record(item, `$.competitionGroups[${index}]`);
    string(group.externalId, `$.competitionGroups[${index}].externalId`);
    string(group.slateKey, `$.competitionGroups[${index}].slateKey`);
    oneOf(group.sport, sportCodes, `$.competitionGroups[${index}].sport`);
    string(group.name, `$.competitionGroups[${index}].name`);
    string(group.shortName, `$.competitionGroups[${index}].shortName`);
  });
  array(payload.competitions, '$.competitions').forEach((item, index) => {
    const competition = record(item, `$.competitions[${index}]`);
    string(competition.externalId, `$.competitions[${index}].externalId`);
    string(competition.slateKey, `$.competitions[${index}].slateKey`);
    oneOf(competition.sport, sportCodes, `$.competitions[${index}].sport`);
    string(competition.name, `$.competitions[${index}].name`);
    string(competition.shortName, `$.competitions[${index}].shortName`);
    if (competition.category !== undefined) oneOf(competition.category, ['men', 'women', 'mixed', 'open'] as const, `$.competitions[${index}].category`);
    optionalString(competition.groupExternalId, `$.competitions[${index}].groupExternalId`);
  });
  array(payload.seasons, '$.seasons').forEach((item, index) => {
    const season = record(item, `$.seasons[${index}]`);
    string(season.externalId, `$.seasons[${index}].externalId`);
    string(season.slateKey, `$.seasons[${index}].slateKey`);
    string(season.competitionExternalId, `$.seasons[${index}].competitionExternalId`);
    string(season.name, `$.seasons[${index}].name`);
    optionalString(season.startsOn, `$.seasons[${index}].startsOn`);
    optionalString(season.endsOn, `$.seasons[${index}].endsOn`);
  });
  array(payload.events, '$.events').forEach((item, index) => {
    const eventPath = `$.events[${index}]`;
    const event = record(item, eventPath);
    string(event.externalId, `${eventPath}.externalId`);
    string(event.slateKey, `${eventPath}.slateKey`);
    const sport = oneOf(event.sport, sportCodes, `${eventPath}.sport`);
    string(event.competitionExternalId, `${eventPath}.competitionExternalId`);
    optionalString(event.seasonExternalId, `${eventPath}.seasonExternalId`);
    string(event.startsAt, `${eventPath}.startsAt`);
    oneOf(event.status, mockStatuses, `${eventPath}.status`);
    optionalString(event.venue, `${eventPath}.venue`);
    eventParticipants(event.participants, `${eventPath}.participants`);
    if (sport === 'soccer') soccerState(event.state, `${eventPath}.state`);
    else if (sport === 'tennis') tennisState(event.state, `${eventPath}.state`);
    else if (sport === 'baseball') baseballState(event.state, `${eventPath}.state`);
    else footballState(event.state, `${eventPath}.state`);
  });
  return payload as unknown as MockProviderPayload;
}

export const mockProviderDecoder: ProviderDecoder<MockProviderPayload> = { parse: parseMockProviderPayload };
