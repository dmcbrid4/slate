import type { CompetitionCategory, SportCode } from '../../domain/model.ts';

export const mockStatuses = ['not_started', 'in_progress', 'complete', 'delayed', 'called_off', 'paused'] as const;
export type MockStatus = typeof mockStatuses[number];

export interface MockParticipantPayload {
  readonly externalId: string;
  readonly slateKey: string;
  readonly sport: SportCode;
  readonly type: 'team' | 'player';
  readonly name: string;
  readonly shortName: string;
  readonly countryCode?: string;
}

export interface MockCompetitionGroupPayload {
  readonly externalId: string;
  readonly slateKey: string;
  readonly sport: SportCode;
  readonly name: string;
  readonly shortName: string;
}

export interface MockCompetitionPayload {
  readonly externalId: string;
  readonly slateKey: string;
  readonly sport: SportCode;
  readonly name: string;
  readonly shortName: string;
  readonly category?: CompetitionCategory;
  readonly groupExternalId?: string;
}

export interface MockSeasonPayload {
  readonly externalId: string;
  readonly slateKey: string;
  readonly competitionExternalId: string;
  readonly name: string;
  readonly startsOn?: string;
  readonly endsOn?: string;
}

interface MockEventBase<TSport extends SportCode, TState> {
  readonly externalId: string;
  readonly slateKey: string;
  readonly sport: TSport;
  readonly competitionExternalId: string;
  readonly seasonExternalId?: string;
  readonly startsAt: string;
  readonly status: MockStatus;
  readonly venue?: string;
  readonly participants: readonly [
    { readonly externalId: string; readonly seed?: number },
    { readonly externalId: string; readonly seed?: number },
  ];
  readonly state: TState;
}

export interface MockSoccerState {
  readonly score?: readonly [number, number];
  readonly phase?: 'first' | 'break' | 'second' | 'extra' | 'shootout';
  readonly minute?: number;
  readonly addedTime?: number;
  readonly goals: readonly {
    readonly side: 0 | 1;
    readonly minute: number;
    readonly addedTime?: number;
    readonly scorerExternalId?: string;
  }[];
}

export interface MockTennisState {
  readonly round: string;
  readonly court?: string;
  readonly bestOf?: 3 | 5;
  readonly sets: readonly {
    readonly games: readonly [number, number];
    readonly status: 'done' | 'playing';
    readonly tiebreak?: readonly [number, number];
  }[];
  readonly points?: readonly [string, string];
  readonly serverExternalId?: string;
  readonly durationSeconds?: number;
}

export interface MockBaseballState {
  readonly score?: readonly [number, number];
  readonly innings: readonly [readonly (number | null)[], readonly (number | null)[]];
  readonly inning?: number;
  readonly half?: 'upper' | 'lower';
  readonly outs?: number;
  readonly balls?: number;
  readonly strikes?: number;
  readonly bases?: readonly [boolean, boolean, boolean];
  readonly batterExternalId?: string;
  readonly pitcherExternalId?: string;
  readonly probablePitcherExternalIds?: readonly [string | undefined, string | undefined];
  readonly hits?: readonly [number, number];
  readonly errors?: readonly [number, number];
}

export interface MockFootballState {
  readonly score?: readonly [number, number];
  readonly quarters: readonly [readonly (number | null)[], readonly (number | null)[]];
  readonly quarter?: 1 | 2 | 3 | 4 | 'overtime';
  readonly clock?: string;
  readonly possessionExternalId?: string;
  readonly down?: 1 | 2 | 3 | 4;
  readonly distance?: number;
  readonly fieldPosition?: {
    readonly territoryExternalId: string;
    readonly yardLine: number;
  };
}

export type MockEventPayload =
  | MockEventBase<'soccer', MockSoccerState>
  | MockEventBase<'tennis', MockTennisState>
  | MockEventBase<'baseball', MockBaseballState>
  | MockEventBase<'football', MockFootballState>;

export interface MockProviderPayload {
  readonly schemaVersion: 1;
  readonly participants: readonly MockParticipantPayload[];
  readonly competitionGroups: readonly MockCompetitionGroupPayload[];
  readonly competitions: readonly MockCompetitionPayload[];
  readonly seasons: readonly MockSeasonPayload[];
  readonly events: readonly MockEventPayload[];
}
