export const MLB_BASE_URL = 'https://statsapi.mlb.com/api/v1';

export type MlbGameStatus = 'scheduled' | 'live' | 'final' | 'postponed' | 'cancelled' | 'suspended';

export interface MlbTeam {
  readonly id: number;
  readonly name: string;
  readonly abbreviation: string;
}

export interface MlbInningLine {
  readonly away: number | null;
  readonly home: number | null;
}

export interface MlbGame {
  readonly id: number;
  readonly start: string;
  readonly status: MlbGameStatus;
  readonly venue: string;
  readonly away: MlbTeam;
  readonly home: MlbTeam;
  readonly score?: readonly [number, number];
  readonly innings: readonly [readonly (number | null)[], readonly (number | null)[]];
  readonly inning?: number;
  readonly half?: 'Top' | 'Bottom';
  readonly outs?: number;
  readonly balls?: number;
  readonly strikes?: number;
  readonly bases?: readonly [boolean, boolean, boolean];
  readonly batter?: string;
  readonly pitcher?: string;
  readonly probablePitchers?: readonly [string, string];
  readonly hits?: readonly [number, number];
  readonly errors?: readonly [number, number];
}

