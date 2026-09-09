import type { EventStatus, SideIndex } from '../domain/model.ts';
import type { ParticipantId } from '../domain/ids.ts';

export interface ScoreboardParticipant {
  readonly id: ParticipantId;
  readonly name: string;
  readonly short: string;
  readonly mark: string;
  readonly color: string;
  readonly seed?: number;
}

interface ScoreboardEventBase {
  readonly id: string;
  readonly competition: string;
  readonly competitionId: string;
  readonly start: string;
  readonly status: EventStatus;
  readonly participants: readonly [ScoreboardParticipant, ScoreboardParticipant];
  readonly venue: string;
  readonly context?: string;
}

export interface SoccerScoreboardEvent extends ScoreboardEventBase {
  readonly sport: 'soccer';
  readonly score?: readonly [number, number];
  readonly minute?: string;
  readonly goals: readonly { readonly minute: string; readonly player?: string; readonly side: SideIndex }[];
}

export interface TennisScoreboardEvent extends ScoreboardEventBase {
  readonly sport: 'tennis';
  readonly category: 'Men' | 'Women';
  readonly round: string;
  readonly sets: readonly [readonly number[], readonly number[]];
  readonly points?: readonly [string, string];
  readonly server?: SideIndex;
  readonly duration?: string;
  readonly bestOf?: 3 | 5;
}

export interface BaseballScoreboardEvent extends ScoreboardEventBase {
  readonly sport: 'baseball';
  readonly score?: readonly [number, number];
  readonly inning?: number;
  readonly half?: 'Top' | 'Bottom';
  readonly outs?: number;
  readonly bases?: readonly [boolean, boolean, boolean];
  readonly batter?: string;
  readonly count?: string;
  readonly pitchers?: readonly [string, string];
  readonly decision?: string;
  readonly innings?: readonly [readonly (number | null)[], readonly (number | null)[]];
  readonly hits?: readonly [number, number];
  readonly errors?: readonly [number, number];
}

export interface FootballScoreboardEvent extends ScoreboardEventBase {
  readonly sport: 'football';
  readonly score?: readonly [number, number];
  readonly clock?: string;
  readonly possession?: SideIndex;
  readonly situation?: string;
  readonly quarters?: readonly [readonly (number | null)[], readonly (number | null)[]];
}

export type ScoreboardEvent =
  | SoccerScoreboardEvent
  | TennisScoreboardEvent
  | BaseballScoreboardEvent
  | FootballScoreboardEvent;
