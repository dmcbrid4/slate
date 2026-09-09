import { asString } from '../domain/invariants.ts';
import type { EventId, ParticipantId } from '../domain/ids.ts';
import type {
  CanonicalEvent,
  Competition,
  DomainGraph,
  EventParticipant,
  Participant,
  SideIndex,
} from '../domain/model.ts';
import type {
  BaseballScoreboardEvent,
  FootballScoreboardEvent,
  ScoreboardEvent,
  ScoreboardParticipant,
  SoccerScoreboardEvent,
  TennisScoreboardEvent,
} from './scoreboard.ts';

export interface ParticipantPresentation {
  readonly name?: string;
  readonly short?: string;
  readonly mark?: string;
  readonly color?: string;
}

export interface ScoreboardPresentation {
  readonly participants?: ReadonlyMap<ParticipantId, ParticipantPresentation>;
  readonly context?: ReadonlyMap<EventId, string>;
}

export class ScoreboardProjectionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ScoreboardProjectionError';
  }
}

function requireValue<T>(value: T | undefined, message: string): T {
  if (value === undefined) throw new ScoreboardProjectionError(message);
  return value;
}

function formatMinute(minute: number, addedTime?: number): string {
  return `${minute}${addedTime ? `+${addedTime}` : ''}′`;
}

function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return hours > 0 ? `${hours}h ${remainder}m` : `${remainder}m`;
}

function ordinal(value: number): string {
  const last = value % 10;
  const lastTwo = value % 100;
  if (last === 1 && lastTwo !== 11) return `${value}st`;
  if (last === 2 && lastTwo !== 12) return `${value}nd`;
  if (last === 3 && lastTwo !== 13) return `${value}rd`;
  return `${value}th`;
}

function fallbackMark(participant: Participant): string {
  if (participant.countryCode) return participant.countryCode;
  return participant.shortName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase())
    .join('') || '•';
}

export function createScoreboardProjector(graph: DomainGraph, presentation: ScoreboardPresentation) {
  const participants = new Map(graph.participants.map(participant => [participant.id, participant]));
  const competitions = new Map(graph.competitions.map(competition => [competition.id, competition]));
  const groups = new Map(graph.competitionGroups.map(group => [group.id, group]));
  const relationsByEvent = new Map<EventId, EventParticipant[]>();

  for (const relation of graph.eventParticipants) {
    const relations = relationsByEvent.get(relation.eventId) ?? [];
    relations.push(relation);
    relationsByEvent.set(relation.eventId, relations);
  }

  const participantDisplay = (participant: Participant): ScoreboardParticipant => {
    const display = presentation.participants?.get(participant.id);
    return {
      id: participant.id,
      name: display?.name ?? participant.name,
      short: display?.short ?? participant.shortName,
      mark: display?.mark ?? fallbackMark(participant),
      color: display?.color ?? 'neutral',
    };
  };

  const projectParticipant = (participant: Participant, relation: EventParticipant): ScoreboardParticipant => {
    return {
      ...participantDisplay(participant),
      ...(relation.seed === undefined ? {} : { seed: relation.seed }),
    };
  };

  const participantOnSide = (event: CanonicalEvent, side: SideIndex): { participant: Participant; relation: EventParticipant } => {
    const relations = (relationsByEvent.get(event.id) ?? []).filter(relation => relation.side === side).sort((a, b) => a.order - b.order);
    if (relations.length !== 1) throw new ScoreboardProjectionError(`Scoreboard cards require one participant on side ${side} of ${event.id}.`);
    const relation = relations[0];
    return { participant: requireValue(participants.get(relation.participantId), `Missing participant ${relation.participantId}.`), relation };
  };

  const resolveParticipantName = (id: ParticipantId | undefined): string | undefined => id ? participants.get(id)?.name : undefined;
  const resolveParticipantShortName = (id: ParticipantId | undefined): string | undefined => id ? participants.get(id)?.shortName : undefined;

  const eventBase = (event: CanonicalEvent, competition: Competition) => {
    const group = competition.competitionGroupId ? groups.get(competition.competitionGroupId) : undefined;
    const first = participantOnSide(event, 0);
    const second = participantOnSide(event, 1);
    const context = presentation.context?.get(event.id);
    return {
      id: asString(event.id),
      competition: group?.name ?? competition.name,
      competitionId: group ? asString(group.id) : asString(competition.id),
      start: event.startsAt,
      status: event.status,
      participants: [projectParticipant(first.participant, first.relation), projectParticipant(second.participant, second.relation)] as const,
      venue: event.venueName ?? '',
      ...(context ? { context } : {}),
    };
  };

  return (event: CanonicalEvent): ScoreboardEvent => {
    const competition = requireValue(competitions.get(event.competitionId), `Missing competition ${event.competitionId}.`);
    const base = eventBase(event, competition);

    if (event.sportId === 'soccer') {
      const projected: SoccerScoreboardEvent = {
        ...base,
        sport: 'soccer',
        goals: event.state.goals.map(goal => ({
          side: goal.side,
          minute: formatMinute(goal.minute, goal.addedTime),
          ...(goal.scorerId ? { player: requireValue(resolveParticipantShortName(goal.scorerId), `Missing scorer ${goal.scorerId}.`) } : {}),
        })),
        ...(event.state.score ? { score: event.state.score } : {}),
        ...(event.state.minute === undefined ? {} : { minute: formatMinute(event.state.minute, event.state.addedTime) }),
      };
      return projected;
    }

    if (event.sportId === 'tennis') {
      const category = competition.category === 'men' ? 'Men' : competition.category === 'women' ? 'Women' : undefined;
      if (!category) throw new ScoreboardProjectionError(`Tennis competition ${competition.id} needs a men or women category.`);
      const rows = [0, 1].map(side => event.state.sets.map(set => set.games[side])) as [number[], number[]];
      const relations = relationsByEvent.get(event.id) ?? [];
      const server = event.state.servingParticipantId === undefined
        ? undefined
        : relations.find(relation => relation.participantId === event.state.servingParticipantId)?.side;
      if (event.state.servingParticipantId !== undefined && server === undefined) {
        throw new ScoreboardProjectionError(`Tennis server must participate in event ${event.id}.`);
      }
      const projected: TennisScoreboardEvent = {
        ...base,
        sport: 'tennis',
        category,
        round: event.state.round,
        sets: rows,
        ...(event.state.points ? { points: event.state.points } : {}),
        ...(server === undefined ? {} : { server }),
        ...(event.state.durationSeconds === undefined ? {} : { duration: formatDuration(event.state.durationSeconds) }),
        ...(event.state.bestOf === undefined ? {} : { bestOf: event.state.bestOf }),
      };
      return projected;
    }

    if (event.sportId === 'baseball') {
      const pitcherNames = event.state.probablePitcherIds?.map(resolveParticipantName);
      const pitchers = pitcherNames?.length === 2 && pitcherNames.every(name => name !== undefined)
        ? pitcherNames as [string, string]
        : undefined;
      const pitcherShortName = (id: ParticipantId) => requireValue(resolveParticipantShortName(id), `Missing pitcher ${id}.`);
      const decisions = [
        event.state.decision?.winningPitcherId ? `W: ${pitcherShortName(event.state.decision.winningPitcherId)}` : undefined,
        event.state.decision?.losingPitcherId ? `L: ${pitcherShortName(event.state.decision.losingPitcherId)}` : undefined,
        event.state.decision?.savePitcherId ? `SV: ${pitcherShortName(event.state.decision.savePitcherId)}` : undefined,
      ].filter((value): value is string => value !== undefined);
      const hasInnings = event.state.innings.some(line => line.length > 0);
      const projected: BaseballScoreboardEvent = {
        ...base,
        sport: 'baseball',
        ...(event.state.score ? { score: event.state.score } : {}),
        ...(event.state.inning === undefined ? {} : { inning: event.state.inning }),
        ...(event.state.half === undefined ? {} : { half: event.state.half === 'top' ? 'Top' : 'Bottom' }),
        ...(event.state.outs === undefined ? {} : { outs: event.state.outs }),
        ...(event.state.bases ? { bases: event.state.bases } : {}),
        ...(event.state.batterId ? { batter: requireValue(resolveParticipantShortName(event.state.batterId), `Missing batter ${event.state.batterId}.`) } : {}),
        ...(event.state.balls === undefined || event.state.strikes === undefined ? {} : { count: `${event.state.balls}–${event.state.strikes}` }),
        ...(pitchers ? { pitchers } : {}),
        ...(decisions.length ? { decision: decisions.join(' · ') } : {}),
        ...(hasInnings ? { innings: event.state.innings } : {}),
        ...(event.state.hits ? { hits: event.state.hits } : {}),
        ...(event.state.errors ? { errors: event.state.errors } : {}),
      };
      return projected;
    }

    const relations = relationsByEvent.get(event.id) ?? [];
    const possession = event.state.possessionParticipantId === undefined
      ? undefined
      : relations.find(relation => relation.participantId === event.state.possessionParticipantId)?.side;
    const fieldPosition = event.state.fieldPosition;
    const territorySide = fieldPosition
      ? requireValue(relations.find(relation => relation.participantId === fieldPosition.territoryParticipantId)?.side, `Football field position must reference an event participant in ${event.id}.`)
      : undefined;
    const territory = territorySide === undefined ? undefined : participantOnSide(event, territorySide).participant;
    const situation = event.state.down === undefined || event.state.distance === undefined || !fieldPosition || !territory
      ? undefined
      : `${ordinal(event.state.down)} & ${event.state.distance} · ${participantDisplay(territory).short} ${fieldPosition.yardLine}`;
    const hasQuarters = event.state.quarters.some(line => line.length > 0);
    const projected: FootballScoreboardEvent = {
      ...base,
      sport: 'football',
      ...(event.state.score ? { score: event.state.score } : {}),
      ...(event.state.quarter === undefined || event.state.clock === undefined ? {} : { clock: `${event.state.quarter === 'OT' ? 'OT' : `Q${event.state.quarter}`} · ${event.state.clock}` }),
      ...(possession === undefined ? {} : { possession }),
      ...(situation ? { situation } : {}),
      ...(hasQuarters ? { quarters: event.state.quarters } : {}),
    };
    return projected;
  };
}

export function projectScoreboardEvents(graph: DomainGraph, presentation: ScoreboardPresentation): readonly ScoreboardEvent[] {
  const project = createScoreboardProjector(graph, presentation);
  return graph.events.map(project);
}
