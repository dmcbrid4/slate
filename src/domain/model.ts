import type {
  CollectionId,
  CompetitionGroupId,
  CompetitionId,
  EventId,
  FollowId,
  OwnerId,
  ParticipantId,
  ProviderId,
  SeasonId,
} from './ids.ts';

export const sportCodes = ['soccer', 'tennis', 'baseball', 'football'] as const;
export type SportCode = typeof sportCodes[number];

export type AssetRef =
  | { readonly type: 'local'; readonly path: string }
  | { readonly type: 'remote'; readonly url: string };

export interface Sport {
  readonly id: SportCode;
  readonly name: string;
}

export interface Participant {
  readonly id: ParticipantId;
  readonly sportId: SportCode;
  readonly type: 'team' | 'player';
  readonly name: string;
  readonly shortName: string;
  readonly slug: string;
  readonly countryCode?: string;
  readonly mark?: AssetRef;
}

export type CompetitionCategory = 'men' | 'women' | 'mixed' | 'open';

export interface Competition {
  readonly id: CompetitionId;
  readonly sportId: SportCode;
  readonly name: string;
  readonly shortName: string;
  readonly slug: string;
  readonly category?: CompetitionCategory;
  readonly competitionGroupId?: CompetitionGroupId;
}

export interface CompetitionGroup {
  readonly id: CompetitionGroupId;
  readonly sportId: SportCode;
  readonly name: string;
  readonly shortName: string;
  readonly slug: string;
}

export interface Season {
  readonly id: SeasonId;
  readonly competitionId: CompetitionId;
  readonly name: string;
  readonly startsOn?: string;
  readonly endsOn?: string;
}

export type FollowTarget =
  | { readonly type: 'participant'; readonly id: ParticipantId }
  | { readonly type: 'competition'; readonly id: CompetitionId }
  | { readonly type: 'competition_group'; readonly id: CompetitionGroupId }
  | { readonly type: 'collection'; readonly id: CollectionId };

export type CollectionMemberTarget = Exclude<FollowTarget, { readonly type: 'collection' }>;

export interface Collection {
  readonly id: CollectionId;
  readonly name: string;
  readonly shortName: string;
  readonly slug: string;
}

export interface CollectionMember {
  readonly collectionId: CollectionId;
  readonly target: CollectionMemberTarget;
  readonly position: number;
}

export interface Follow {
  readonly id: FollowId;
  readonly ownerId: OwnerId;
  readonly target: FollowTarget;
  readonly position: number;
}

export type EventStatus = 'scheduled' | 'live' | 'final' | 'postponed' | 'cancelled' | 'suspended';
export type SideIndex = 0 | 1;
export type SideScore = readonly [number, number];

export interface SoccerGoal {
  readonly side: SideIndex;
  readonly minute: number;
  readonly addedTime?: number;
  readonly scorerId?: ParticipantId;
}

export interface SoccerEventState {
  readonly score?: SideScore;
  readonly period?: 'first_half' | 'halftime' | 'second_half' | 'extra_time' | 'penalties';
  readonly minute?: number;
  readonly addedTime?: number;
  readonly aggregateScore?: SideScore;
  readonly penaltyScore?: SideScore;
  readonly goals: readonly SoccerGoal[];
}

export interface TennisSetScore {
  readonly games: SideScore;
  readonly status: 'complete' | 'in_progress';
  readonly tiebreak?: SideScore;
}

export interface TennisEventState {
  readonly sets: readonly TennisSetScore[];
  readonly points?: readonly [string, string];
  readonly servingParticipantId?: ParticipantId;
  readonly round: string;
  readonly court?: string;
  readonly bestOf?: 3 | 5;
  readonly durationSeconds?: number;
}

export interface BaseballDecision {
  readonly winningPitcherId?: ParticipantId;
  readonly losingPitcherId?: ParticipantId;
  readonly savePitcherId?: ParticipantId;
}

export interface BaseballEventState {
  readonly score?: SideScore;
  readonly innings: readonly [readonly (number | null)[], readonly (number | null)[]];
  readonly inning?: number;
  readonly half?: 'top' | 'bottom';
  readonly outs?: number;
  readonly balls?: number;
  readonly strikes?: number;
  readonly bases?: readonly [boolean, boolean, boolean];
  readonly probablePitcherIds?: readonly [ParticipantId | undefined, ParticipantId | undefined];
  readonly batterId?: ParticipantId;
  readonly pitcherId?: ParticipantId;
  readonly hits?: SideScore;
  readonly errors?: SideScore;
  readonly decision?: BaseballDecision;
}

export interface FootballFieldPosition {
  readonly territoryParticipantId: ParticipantId;
  readonly yardLine: number;
}

export interface FootballEventState {
  readonly score?: SideScore;
  readonly quarters: readonly [readonly (number | null)[], readonly (number | null)[]];
  readonly quarter?: 1 | 2 | 3 | 4 | 'OT';
  readonly clock?: string;
  readonly possessionParticipantId?: ParticipantId;
  readonly down?: 1 | 2 | 3 | 4;
  readonly distance?: number;
  readonly fieldPosition?: FootballFieldPosition;
}

interface EventCore<TSport extends SportCode, TState> {
  readonly id: EventId;
  readonly sportId: TSport;
  readonly competitionId: CompetitionId;
  readonly seasonId?: SeasonId;
  readonly startsAt: string;
  readonly status: EventStatus;
  readonly venueName?: string;
  readonly state: TState;
}

export type SoccerEvent = EventCore<'soccer', SoccerEventState>;
export type TennisEvent = EventCore<'tennis', TennisEventState>;
export type BaseballEvent = EventCore<'baseball', BaseballEventState>;
export type FootballEvent = EventCore<'football', FootballEventState>;
export type CanonicalEvent = SoccerEvent | TennisEvent | BaseballEvent | FootballEvent;

export interface EventParticipant {
  readonly eventId: EventId;
  readonly participantId: ParticipantId;
  readonly side: SideIndex;
  readonly order: number;
  readonly designation?: 'home' | 'away';
  readonly result?: 'win' | 'loss' | 'draw';
  readonly seed?: number;
}

export interface Provider {
  readonly id: ProviderId;
  readonly name: string;
}

export type ProviderCanonicalRef =
  | { readonly type: 'participant'; readonly id: ParticipantId }
  | { readonly type: 'competition'; readonly id: CompetitionId }
  | { readonly type: 'competition_group'; readonly id: CompetitionGroupId }
  | { readonly type: 'season'; readonly id: SeasonId }
  | { readonly type: 'event'; readonly id: EventId };

export interface ProviderEntityMapping {
  readonly providerId: ProviderId;
  readonly providerEntityType: string;
  readonly providerEntityId: string;
  readonly canonical: ProviderCanonicalRef;
}

export interface DomainGraph {
  readonly sports: readonly Sport[];
  readonly participants: readonly Participant[];
  readonly competitionGroups: readonly CompetitionGroup[];
  readonly competitions: readonly Competition[];
  readonly seasons: readonly Season[];
  readonly events: readonly CanonicalEvent[];
  readonly eventParticipants: readonly EventParticipant[];
  readonly collections: readonly Collection[];
  readonly collectionMembers: readonly CollectionMember[];
  readonly follows: readonly Follow[];
  readonly providers: readonly Provider[];
  readonly providerMappings: readonly ProviderEntityMapping[];
}
