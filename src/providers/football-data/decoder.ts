import type { FootballDataGoal, FootballDataMatch, FootballDataStatus, FootballDataTeam } from './types.ts';

export class FootballDataDecodeError extends Error {
  readonly path: string;
  constructor(path: string, message: string) {
    super(`Football-Data.org response ${path}: ${message}`);
    this.name = 'FootballDataDecodeError';
    this.path = path;
  }
}

type RecordValue = Record<string, unknown>;

function record(value: unknown, path: string): RecordValue {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new FootballDataDecodeError(path, 'expected an object');
  return value as RecordValue;
}

function array(value: unknown, path: string): readonly unknown[] {
  if (!Array.isArray(value)) throw new FootballDataDecodeError(path, 'expected an array');
  return value;
}

function string(value: unknown, path: string): string {
  if (typeof value !== 'string' || !value.trim()) throw new FootballDataDecodeError(path, 'expected a non-empty string');
  return value;
}

function integer(value: unknown, path: string): number {
  if (!Number.isInteger(value) || (value as number) < 0) throw new FootballDataDecodeError(path, 'expected a non-negative integer');
  return value as number;
}

function optionalInteger(value: unknown, path: string): number | undefined {
  return value === undefined || value === null ? undefined : integer(value, path);
}

function team(value: unknown, path: string): FootballDataTeam {
  const item = record(value, path);
  return {
    id: integer(item.id, `${path}.id`),
    name: string(item.name, `${path}.name`),
    shortName: typeof item.shortName === 'string' && item.shortName.trim() ? item.shortName : string(item.name, `${path}.name`),
    ...(typeof item.tla === 'string' && item.tla.trim() ? { tla: item.tla } : {}),
  };
}

function status(value: unknown, path: string): FootballDataStatus {
  const raw = string(value, path);
  if (raw === 'IN_PLAY' || raw === 'PAUSED') return 'live';
  if (raw === 'FINISHED') return 'final';
  if (raw === 'POSTPONED') return 'postponed';
  if (raw === 'CANCELLED') return 'cancelled';
  if (raw === 'SUSPENDED') return 'suspended';
  if (raw === 'SCHEDULED' || raw === 'TIMED') return 'scheduled';
  throw new FootballDataDecodeError(path, `unsupported match status ${raw}`);
}

function score(value: unknown, path: string): readonly [number, number] | undefined {
  if (value === undefined || value === null) return undefined;
  const item = record(value, path);
  const home = optionalInteger(item.home, `${path}.home`);
  const away = optionalInteger(item.away, `${path}.away`);
  return home === undefined || away === undefined ? undefined : [away, home];
}

function goals(value: unknown, path: string): readonly FootballDataGoal[] {
  return array(value ?? [], path).map((entry, index) => {
    const item = record(entry, `${path}[${index}]`);
    const teamNode = record(item.team, `${path}[${index}].team`);
    const scorerNode = item.scorer === undefined || item.scorer === null ? undefined : record(item.scorer, `${path}[${index}].scorer`);
    return {
      minute: integer(item.minute, `${path}[${index}].minute`),
      ...(optionalInteger(item.injuryTime, `${path}[${index}].injuryTime`) === undefined ? {} : { addedTime: optionalInteger(item.injuryTime, `${path}[${index}].injuryTime`) }),
      ...(scorerNode && typeof scorerNode.name === 'string' ? { scorer: scorerNode.name } : {}),
      teamId: integer(teamNode.id, `${path}[${index}].team.id`),
    };
  });
}

function parseMatch(value: unknown, path: string): FootballDataMatch {
  const item = record(value, path);
  const scoreNode = item.score === undefined || item.score === null ? undefined : record(item.score, `${path}.score`);
  const fullTime = scoreNode?.fullTime;
  const duration = scoreNode?.duration;
  const scoreValue = fullTime ?? duration;
  const minute = item.status === 'IN_PLAY' || item.status === 'PAUSED'
    ? (typeof item.minute === 'string' ? item.minute : undefined)
    : undefined;
  return {
    id: integer(item.id, `${path}.id`),
    utcDate: string(item.utcDate, `${path}.utcDate`),
    status: status(item.status, `${path}.status`),
    home: team(item.homeTeam, `${path}.homeTeam`),
    away: team(item.awayTeam, `${path}.awayTeam`),
    ...(score(scoreValue, `${path}.score.fullTime`) ? { score: score(scoreValue, `${path}.score.fullTime`) } : {}),
    ...(typeof item.venue === 'string' ? { venue: item.venue } : { venue: '' }),
    ...(minute ? { minute } : {}),
    goals: goals(item.goals, `${path}.goals`),
  };
}

export function decodeFootballDataMatches(input: unknown): readonly FootballDataMatch[] {
  const payload = record(input, '$');
  return array(payload.matches, '$.matches').map((match, index) => parseMatch(match, `$.matches[${index}]`));
}

