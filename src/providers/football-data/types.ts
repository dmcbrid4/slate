export type FootballDataStatus =
  | 'scheduled'
  | 'live'
  | 'final'
  | 'postponed'
  | 'cancelled'
  | 'suspended';

export interface FootballDataTeam {
  readonly id: number;
  readonly name: string;
  readonly shortName: string;
  readonly tla?: string;
}

export interface FootballDataGoal {
  readonly minute: number;
  readonly addedTime?: number;
  readonly scorer?: string;
  readonly teamId: number;
}

export interface FootballDataMatch {
  readonly id: number;
  readonly competition: 'PL' | 'CL';
  readonly utcDate: string;
  readonly status: FootballDataStatus;
  readonly home: FootballDataTeam;
  readonly away: FootballDataTeam;
  readonly score?: readonly [number, number];
  readonly venue: string;
  readonly minute?: string;
  readonly goals: readonly FootballDataGoal[];
}
