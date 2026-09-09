export const liveTennisTours = ['atp', 'wta', 'challenger', 'itf', 'juniors'] as const;
export type LiveTennisTour = typeof liveTennisTours[number];

export const liveTennisDraws = ['singles', 'doubles'] as const;
export type LiveTennisDraw = typeof liveTennisDraws[number];

export const liveTennisMatchStatuses = ['upcoming', 'live', 'completed', 'cancelled'] as const;
export type LiveTennisMatchStatus = typeof liveTennisMatchStatuses[number];

export const liveTennisEventStatuses = ['Retired', 'Cancelled', 'Walk Over', 'Postponed', 'Interrupted'] as const;
export type LiveTennisEventStatus = typeof liveTennisEventStatuses[number];

export const liveTennisFixtureStatuses = ['scheduled', 'live', 'finished'] as const;
export type LiveTennisFixtureStatus = typeof liveTennisFixtureStatuses[number];

export const liveTennisRoundCodes = ['F', 'SF', 'QF', 'R16', 'R32', 'R64', 'R128', 'RR', 'BR', 'Q', 'Q1', 'Q2', 'Q3', 'Q4', 'ER'] as const;
export type LiveTennisRoundCode = typeof liveTennisRoundCodes[number];

export interface LiveTennisListMeta {
  readonly limit: number;
  readonly offset: number;
  readonly count: number;
  readonly total?: number | null;
  readonly has_more?: boolean;
}

export interface LiveTennisScore {
  readonly sets: readonly [number, number];
  readonly games: readonly [readonly number[], readonly number[]];
  readonly points: readonly [string | null, string | null];
  readonly server: 1 | 2 | null;
  readonly is_tiebreak: boolean;
  readonly timestamp: string | null;
  readonly age_seconds?: number | null;
  readonly observed_age_seconds?: number | null;
  readonly sequence?: number | null;
  readonly stale?: boolean;
  readonly sources_count?: number | null;
}

export interface LiveTennisPlayerCompleteness {
  readonly known: number | null;
  readonly of: number | null;
  readonly missing: readonly string[];
  readonly note?: string;
}

export interface LiveTennisPlayer {
  readonly id: number;
  readonly name: string;
  readonly tour: string | null;
  readonly country: string | null;
  readonly ranking: number | null;
  readonly ranking_points: number | null;
  readonly ranking_movement: 'up' | 'down' | 'same' | null;
  readonly hand: 'R' | 'L' | null;
  readonly backhand: 1 | 2 | null;
  readonly birthday: string | null;
  readonly is_doubles_team: boolean;
  readonly data_completeness: LiveTennisPlayerCompleteness;
}

export interface LiveTennisMatch {
  readonly id: number;
  readonly tournament: string;
  readonly tournament_id: string | null;
  readonly tour: LiveTennisTour | null;
  readonly surface: 'hard' | 'clay' | 'grass' | null;
  readonly indoor: boolean;
  readonly format: 'BO3' | 'BO5' | null;
  readonly round: string | null;
  readonly round_code: LiveTennisRoundCode | null;
  readonly status: LiveTennisMatchStatus;
  readonly event_status: LiveTennisEventStatus | null;
  readonly event_status_updated_at: string | null;
  readonly gender: 'men' | 'women' | null;
  readonly is_doubles: boolean;
  readonly is_qualifying: boolean;
  readonly draw: LiveTennisDraw | null;
  readonly outcome: string | null;
  readonly scheduled_time: string | null;
  readonly live_at?: string | null;
  readonly updated_at: string;
  readonly has_analysis: boolean;
  readonly has_market: boolean;
  readonly players: {
    readonly p1: LiveTennisPlayer;
    readonly p2: LiveTennisPlayer;
  };
  readonly score: LiveTennisScore | null;
  readonly winner?: 1 | 2 | null;
  readonly withdrew?: 1 | 2 | null;
}

export interface LiveTennisMatchList {
  readonly data: readonly LiveTennisMatch[];
  readonly meta: LiveTennisListMeta;
}

export interface LiveTennisFixture {
  readonly id: number;
  readonly match_id: number;
  readonly event_date: string | null;
  readonly start_time: string | null;
  readonly player1_id: number | null;
  readonly player2_id: number | null;
  readonly gender: 'men' | 'women' | null;
  readonly is_qualifying: boolean;
  readonly tour: string | null;
  readonly tournament: string | null;
  readonly round: string | null;
  readonly round_code: LiveTennisRoundCode | null;
  readonly surface: string | null;
  readonly player1_name: string | null;
  readonly player2_name: string | null;
  readonly reason: string | null;
  readonly status: string | null;
  readonly updated_at: string;
}

export interface LiveTennisFixtureList {
  readonly data: readonly LiveTennisFixture[];
  readonly meta: LiveTennisListMeta;
}

export const liveTennisTournamentCategories = [
  'grand_slam', 'masters_1000', 'tour_finals', 'atp_500', 'atp_250',
  'wta_1000', 'wta_500', 'wta_250', 'wta_125', 'challenger', 'itf', 'juniors',
] as const;
export type LiveTennisTournamentCategory = typeof liveTennisTournamentCategories[number];

export interface LiveTennisTournament {
  readonly id: string;
  readonly name: string | null;
  readonly tour: LiveTennisTour | null;
  readonly surface: 'hard' | 'clay' | 'grass' | null;
  readonly indoor: boolean;
  readonly gender: 'men' | 'women' | null;
  readonly city: string | null;
  readonly country: string | null;
  readonly category: LiveTennisTournamentCategory | null;
  readonly updated_at: string;
}

export interface LiveTennisTournamentList {
  readonly data: readonly LiveTennisTournament[];
  readonly meta: LiveTennisListMeta;
}

export interface LiveTennisPlayerDetail extends LiveTennisPlayer {
  readonly stats: Readonly<Record<string, unknown>>;
}

export interface LiveTennisUsage {
  readonly principal: string;
  readonly tier: 'free' | 'basic' | 'pro' | 'ultra';
  readonly base_tier: string;
  readonly tier_expires_at: string | null;
  readonly channel: string;
  readonly limits: { readonly per_minute: number | null; readonly per_day: number | null };
  readonly today: { readonly calls: number; readonly errors: number; readonly remaining_day: number | null };
  readonly history: readonly { readonly day: string; readonly calls: number; readonly errors: number }[];
  readonly as_of: string;
}
