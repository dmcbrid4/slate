import type { MlbGame, MlbGameStatus, MlbTeam } from './types.ts';

export class MlbDecodeError extends Error {
  readonly path: string;
  constructor(path: string, message: string) {
    super(`MLB response ${path}: ${message}`);
    this.name = 'MlbDecodeError';
    this.path = path;
  }
}

type RecordValue = Record<string, unknown>;

function record(value: unknown, path: string): RecordValue {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new MlbDecodeError(path, 'expected an object');
  return value as RecordValue;
}

function array(value: unknown, path: string): readonly unknown[] {
  if (!Array.isArray(value)) throw new MlbDecodeError(path, 'expected an array');
  return value;
}

function string(value: unknown, path: string): string {
  if (typeof value !== 'string' || !value.trim()) throw new MlbDecodeError(path, 'expected a non-empty string');
  return value;
}

function integer(value: unknown, path: string): number {
  if (!Number.isInteger(value) || (value as number) < 0) throw new MlbDecodeError(path, 'expected a non-negative integer');
  return value as number;
}

function optionalString(source: RecordValue, key: string, path: string): string | undefined {
  const value = source[key];
  return value === undefined || value === null ? undefined : string(value, `${path}.${key}`);
}

function optionalInteger(source: RecordValue, key: string, path: string): number | undefined {
  const value = source[key];
  return value === undefined || value === null ? undefined : integer(value, `${path}.${key}`);
}

function status(value: unknown, path: string): MlbGameStatus {
  const state = string(value, path).toLowerCase();
  if (state === 'preview' || state === 'scheduled' || state === 'warmup') return 'scheduled';
  if (state === 'live' || state === 'in progress') return 'live';
  if (state === 'final' || state === 'game over') return 'final';
  if (state === 'postponed') return 'postponed';
  if (state === 'cancelled' || state === 'canceled') return 'cancelled';
  if (state === 'suspended') return 'suspended';
  throw new MlbDecodeError(path, `unsupported game state ${state}`);
}

function team(value: unknown, path: string): MlbTeam {
  const item = record(value, path);
  const teamId = integer(item.id, `${path}.id`);
  const name = string(item.name, `${path}.name`);
  const abbreviation = optionalString(item, 'abbreviation', path) ?? name.slice(0, 3).toUpperCase();
  return { id: teamId, name, abbreviation };
}

function statScore(value: unknown, path: string): readonly [number, number] | undefined {
  if (value === undefined || value === null) return undefined;
  const item = record(value, path);
  const away = record(item.away, `${path}.away`);
  const home = record(item.home, `${path}.home`);
  return [integer(away.runs, `${path}.away.runs`), integer(home.runs, `${path}.home.runs`)];
}

function optionalNestedName(value: unknown, path: string): string | undefined {
  if (value === undefined || value === null) return undefined;
  const item = record(value, path);
  return optionalString(item, 'fullName', path) ?? optionalString(item, 'name', path);
}

function innings(value: unknown, path: string): readonly [readonly (number | null)[], readonly (number | null)[]] {
  if (value === undefined || value === null) return [[], []];
  return [0, 1].map(side => array(value, path).map((line, index) => {
    const item = record(line, `${path}[${index}]`);
    const key = side === 0 ? 'away' : 'home';
    const sideLine = item[key];
    if (sideLine === undefined || sideLine === null) return null;
    const valueAtSide = record(sideLine, `${path}[${index}].${key}`).runs;
    return valueAtSide === undefined || valueAtSide === null ? null : integer(valueAtSide, `${path}[${index}].${key}.runs`);
  })) as [number[], number[]];
}

function bases(linescore: RecordValue, path: string): readonly [boolean, boolean, boolean] | undefined {
  const offense = linescore.offense;
  if (offense === undefined || offense === null) return undefined;
  const item = record(offense, `${path}.offense`);
  return [Boolean(item.first), Boolean(item.second), Boolean(item.third)];
}

function parseGame(value: unknown, path: string): MlbGame {
  const game = record(value, path);
  const gamePk = integer(game.gamePk, `${path}.gamePk`);
  if (gamePk < 1) throw new MlbDecodeError(`${path}.gamePk`, 'expected a positive integer');
  const teams = record(game.teams, `${path}.teams`);
  const awayNode = record(teams.away, `${path}.teams.away`);
  const homeNode = record(teams.home, `${path}.teams.home`);
  const away = team(awayNode.team ?? awayNode, `${path}.teams.away.team`);
  const home = team(homeNode.team ?? homeNode, `${path}.teams.home.team`);
  const statusNode = record(game.status, `${path}.status`);
  const linescore = game.linescore === undefined || game.linescore === null ? undefined : record(game.linescore, `${path}.linescore`);
  const probable = [
    optionalNestedName(awayNode.probablePitcher, `${path}.teams.away.probablePitcher`),
    optionalNestedName(homeNode.probablePitcher, `${path}.teams.home.probablePitcher`),
  ];
  return {
    id: gamePk,
    start: string(game.gameDate, `${path}.gameDate`),
    status: status(statusNode.abstractGameState ?? statusNode.detailedState, `${path}.status.abstractGameState`),
    venue: game.venue === undefined || game.venue === null ? '' : string(record(game.venue, `${path}.venue`).name, `${path}.venue.name`),
    away,
    home,
    ...(linescore ? {
      ...(statScore(linescore.teams, `${path}.linescore.teams`) ? { score: statScore(linescore.teams, `${path}.linescore.teams`) } : {}),
      innings: innings(linescore.innings, `${path}.linescore.innings`),
      ...(optionalInteger(linescore, 'currentInning', `${path}.linescore`) === undefined ? {} : { inning: optionalInteger(linescore, 'currentInning', `${path}.linescore`) }),
      ...(linescore.inningHalf === undefined ? {} : { half: string(linescore.inningHalf, `${path}.linescore.inningHalf`) === 'Top' ? 'Top' as const : 'Bottom' as const }),
      ...(optionalInteger(linescore, 'outs', `${path}.linescore`) === undefined ? {} : { outs: optionalInteger(linescore, 'outs', `${path}.linescore`) }),
      ...(optionalInteger(linescore, 'balls', `${path}.linescore`) === undefined ? {} : { balls: optionalInteger(linescore, 'balls', `${path}.linescore`) }),
      ...(optionalInteger(linescore, 'strikes', `${path}.linescore`) === undefined ? {} : { strikes: optionalInteger(linescore, 'strikes', `${path}.linescore`) }),
      ...(bases(linescore, `${path}.linescore`) ? { bases: bases(linescore, `${path}.linescore`) } : {}),
      ...(optionalNestedName(record(linescore.offense ?? {}, `${path}.linescore.offense`).batter, `${path}.linescore.offense.batter`) ? { batter: optionalNestedName(record(linescore.offense ?? {}, `${path}.linescore.offense`).batter, `${path}.linescore.offense.batter`) } : {}),
      ...(optionalNestedName(record(linescore.defense ?? {}, `${path}.linescore.defense`).pitcher, `${path}.linescore.defense.pitcher`) ? { pitcher: optionalNestedName(record(linescore.defense ?? {}, `${path}.linescore.defense`).pitcher, `${path}.linescore.defense.pitcher`) } : {}),
    } : { innings: [[], []] }),
    ...(probable.every((name): name is string => name !== undefined) ? { probablePitchers: probable as [string, string] } : {}),
  };
}

export function decodeMlbSchedule(input: unknown): readonly MlbGame[] {
  const payload = record(input, '$');
  return array(payload.dates, '$.dates').flatMap((date, dateIndex) => {
    const item = record(date, `$.dates[${dateIndex}]`);
    return array(item.games, `$.dates[${dateIndex}].games`).map((game, gameIndex) => parseGame(game, `$.dates[${dateIndex}].games[${gameIndex}]`));
  });
}
