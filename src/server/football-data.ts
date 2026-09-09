import 'server-only';
import { participantId, competitionId } from '../domain/ids.ts';
import type { ScoreboardEventRecord, ScoreboardData, ScoreboardTargetMatch } from '../read-models/scoreboard-data.ts';
import type { SoccerScoreboardEvent, ScoreboardParticipant } from '../read-models/scoreboard.ts';
import { fetchFootballMatches } from '../providers/football-data/client.ts';
import { decodeFootballDataMatches } from '../providers/football-data/decoder.ts';
import type { FootballDataMatch, FootballDataTeam } from '../providers/football-data/types.ts';

const knownTeams: Readonly<Record<number, { readonly id: string; readonly short: string; readonly mark: string; readonly color: string }>> = {
  57: { id: 'arsenal', short: 'Arsenal', mark: 'ARS', color: 'red' },
  58: { id: 'aston-villa', short: 'Aston Villa', mark: 'AVL', color: 'claret' },
  61: { id: 'chelsea', short: 'Chelsea', mark: 'CHE', color: 'blue' },
  64: { id: 'liverpool', short: 'Liverpool', mark: 'LIV', color: 'red' },
  73: { id: 'tottenham', short: 'Tottenham', mark: 'TOT', color: 'navy' },
  351: { id: 'nottingham-forest', short: 'Nott’m Forest', mark: 'NFO', color: 'red' },
  397: { id: 'brighton', short: 'Brighton', mark: 'BHA', color: 'blue' },
  563: { id: 'west-ham', short: 'West Ham', mark: 'WHU', color: 'claret' },
};

export function isFootballDataModeEnabled(): boolean {
  return process.env.FOOTBALL_DATA_ENABLED === 'true' && Boolean(process.env.FOOTBALL_DATA_API_TOKEN);
}

function datePart(instant: string): string { return instant.slice(0, 10); }

function participant(team: FootballDataTeam): ScoreboardParticipant {
  const known = knownTeams[team.id];
  return { id: participantId(known?.id ?? `football-data-team-${team.id}`), name: team.name, short: known?.short ?? team.shortName, mark: known?.mark ?? team.tla ?? team.shortName.slice(0, 3).toUpperCase(), color: known?.color ?? 'neutral' };
}

function recordForMatch(match: FootballDataMatch): ScoreboardEventRecord {
  const home = participant(match.home);
  const away = participant(match.away);
  const event: SoccerScoreboardEvent = {
    id: `football-data-match-${match.id}`,
    sport: 'soccer', competition: match.competition === 'CL' ? 'Champions League' : 'Premier League', competitionId: match.competition === 'CL' ? 'champions-league' : 'premier-league', start: match.utcDate,
    status: match.status, participants: [home, away], venue: match.venue,
    ...(match.score ? { score: match.score } : {}), ...(match.minute ? { minute: match.minute } : {}),
    goals: match.goals.map(goal => ({ minute: `${goal.minute}${goal.addedTime ? `+${goal.addedTime}` : ''}`, ...(goal.scorer ? { player: goal.scorer } : {}), side: goal.teamId === match.home.id ? 0 : 1 })),
  };
  const targetMatches: ScoreboardTargetMatch[] = [match.home, match.away].flatMap(team => {
    const known = knownTeams[team.id];
    return known ? [{ target: { type: 'participant' as const, id: participantId(known.id) } }] : [];
  });
  targetMatches.push({ target: { type: 'competition', id: competitionId(match.competition === 'CL' ? 'champions-league' : 'premier-league') } });
  return { eventId: event.id as ScoreboardEventRecord['eventId'], event, targetMatches };
}

export function mergeFootballDataScoreboardData(data: ScoreboardData, matches: readonly FootballDataMatch[]): ScoreboardData {
  const records = [...data.records.filter(record => record.event.sport !== 'soccer'), ...matches.filter(match => knownTeams[match.home.id] || knownTeams[match.away.id]).map(recordForMatch)];
  const source = data.source === 'live-tennis' ? 'live-tennis+football-data' : data.source === 'live-mlb' ? 'live-mlb+football-data' : data.source === 'live-tennis+mlb' ? 'live-tennis+mlb+football-data' : 'live-football-data';
  return { ...data, records, source };
}

export async function getFootballDataScoreboardData(data: ScoreboardData, now: string): Promise<ScoreboardData> {
  const center = new Date(now);
  const start = new Date(center.getTime() - 5 * 24 * 60 * 60_000).toISOString();
  const end = new Date(center.getTime() + 6 * 24 * 60 * 60_000).toISOString();
  const payload = await fetchFootballMatches(datePart(start), datePart(end));
  const matches = decodeFootballDataMatches(payload);
  return matches.length === 0 ? data : { ...mergeFootballDataScoreboardData(data, matches), asOf: now };
}
