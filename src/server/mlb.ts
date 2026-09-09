import 'server-only';
import { participantId } from '../domain/ids.ts';
import type { ScoreboardEventRecord, ScoreboardData, ScoreboardTargetMatch } from '../read-models/scoreboard-data.ts';
import type { BaseballScoreboardEvent, ScoreboardParticipant } from '../read-models/scoreboard.ts';
import { fetchMlbSchedule } from '../providers/mlb/client.ts';
import { decodeMlbSchedule } from '../providers/mlb/decoder.ts';
import type { MlbGame, MlbTeam } from '../providers/mlb/types.ts';

const knownTeams: Readonly<Record<number, { readonly id: string; readonly short: string; readonly mark: string; readonly color: string }>> = {
  109: { id: 'diamondbacks', short: 'Diamondbacks', mark: 'A', color: 'brick' },
  110: { id: 'orioles', short: 'Orioles', mark: 'O', color: 'orange' },
  111: { id: 'red-sox', short: 'Red Sox', mark: 'B', color: 'red' },
  119: { id: 'dodgers', short: 'Dodgers', mark: 'LAD', color: 'blue' },
  135: { id: 'padres', short: 'Padres', mark: 'SD', color: 'gold' },
  147: { id: 'yankees', short: 'Yankees', mark: 'NY', color: 'navy' },
};

export function isMlbModeEnabled(): boolean {
  return process.env.MLB_API_ENABLED === 'true';
}

function datePart(instant: string): string {
  return instant.slice(0, 10);
}

function participant(team: MlbTeam): ScoreboardParticipant {
  const known = knownTeams[team.id];
  return {
    id: participantId(known?.id ?? `mlb-team-${team.id}`),
    name: team.name,
    short: known?.short ?? team.abbreviation,
    mark: known?.mark ?? team.abbreviation,
    color: known?.color ?? 'neutral',
  };
}

function eventStatus(status: MlbGame['status']): BaseballScoreboardEvent['status'] {
  return status;
}

function recordForGame(game: MlbGame): ScoreboardEventRecord {
  const away = participant(game.away);
  const home = participant(game.home);
  const score = game.score;
  const event: BaseballScoreboardEvent = {
    id: `mlb-game-${game.id}`,
    sport: 'baseball',
    competition: 'MLB',
    competitionId: 'mlb',
    start: game.start,
    status: eventStatus(game.status),
    participants: [away, home],
    venue: game.venue,
    ...(score ? { score } : {}),
    ...(game.inning === undefined ? {} : { inning: game.inning }),
    ...(game.half === undefined ? {} : { half: game.half }),
    ...(game.outs === undefined ? {} : { outs: game.outs }),
    ...(game.bases ? { bases: game.bases } : {}),
    ...(game.batter ? { batter: game.batter } : {}),
    ...(game.balls === undefined || game.strikes === undefined ? {} : { count: `${game.balls}–${game.strikes}` }),
    ...(game.probablePitchers ? { pitchers: game.probablePitchers } : {}),
    ...(game.innings.some(line => line.length > 0) ? { innings: game.innings } : {}),
  };
  const targetMatches: ScoreboardTargetMatch[] = [game.away, game.home].flatMap(team => {
    const known = knownTeams[team.id];
    return known ? [{ target: { type: 'participant' as const, id: participantId(known.id) } }] : [];
  });
  return { eventId: `mlb-game-${game.id}` as ScoreboardEventRecord['eventId'], event, targetMatches };
}

export function mergeMlbScoreboardData(data: ScoreboardData, games: readonly MlbGame[]): ScoreboardData {
  const relevant = games.filter(game => knownTeams[game.away.id] || knownTeams[game.home.id]);
  const records = [...data.records.filter(record => record.event.sport !== 'baseball'), ...relevant.map(recordForGame)];
  return { ...data, records, source: data.source === 'live-tennis' ? 'live-tennis+mlb' : 'live-mlb' };
}

export async function getMlbScoreboardData(data: ScoreboardData, now: string): Promise<ScoreboardData> {
  const center = new Date(now);
  const start = new Date(center.getTime() - 5 * 24 * 60 * 60_000).toISOString();
  const end = new Date(center.getTime() + 6 * 24 * 60 * 60_000).toISOString();
  const payload = await fetchMlbSchedule(datePart(start), datePart(end));
  return { ...mergeMlbScoreboardData(data, decodeMlbSchedule(payload)), asOf: now };
}
