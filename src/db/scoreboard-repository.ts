import { asc, eq } from 'drizzle-orm';
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core';
import type { ScoreboardRepository } from '../application/scoreboard-repository.ts';
import {
  collectionId,
  competitionGroupId,
  competitionId,
  defineDomainGraph,
  eventId,
  followId,
  ownerId,
  participantId,
  seasonId,
} from '../domain/index.ts';
import type {
  AssetRef,
  BaseballEventState,
  CanonicalEvent,
  CollectionMemberTarget,
  DomainGraph,
  FollowTarget,
  FootballEventState,
  OwnerId,
  SideIndex,
  SoccerEventState,
  TennisEventState,
} from '../domain/index.ts';
import * as schema from './schema.ts';

export interface ScoreboardRows {
  readonly sports: readonly (typeof schema.sports.$inferSelect)[];
  readonly participants: readonly (typeof schema.participants.$inferSelect)[];
  readonly competitionGroups: readonly (typeof schema.competitionGroups.$inferSelect)[];
  readonly competitions: readonly (typeof schema.competitions.$inferSelect)[];
  readonly seasons: readonly (typeof schema.seasons.$inferSelect)[];
  readonly events: readonly (typeof schema.events.$inferSelect)[];
  readonly eventParticipants: readonly (typeof schema.eventParticipants.$inferSelect)[];
  readonly collections: readonly (typeof schema.collections.$inferSelect)[];
  readonly collectionMembers: readonly (typeof schema.collectionMembers.$inferSelect)[];
  readonly follows: readonly (typeof schema.follows.$inferSelect)[];
}

export class ScoreboardRepositoryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ScoreboardRepositoryError';
  }
}

function required<T>(value: T | null, label: string): T {
  if (value === null) throw new ScoreboardRepositoryError(`${label} is required by its target discriminator.`);
  return value;
}

function normalizedInstant(value: string): string {
  const parsed = new Date(value);
  return Number.isFinite(parsed.valueOf()) ? parsed.toISOString() : value;
}

function sideIndex(value: number): SideIndex {
  if (value !== 0 && value !== 1) throw new ScoreboardRepositoryError(`Unsupported event side ${value}.`);
  return value;
}

function eventFromRow(row: typeof schema.events.$inferSelect): CanonicalEvent {
  const core = {
    id: eventId(row.id),
    competitionId: competitionId(row.competitionId),
    startsAt: normalizedInstant(row.startsAt),
    status: row.status,
    ...(row.seasonId === null ? {} : { seasonId: seasonId(row.seasonId) }),
    ...(row.venueName === null ? {} : { venueName: row.venueName }),
  };

  if (row.sportId === 'soccer') return { ...core, sportId: row.sportId, state: row.state as SoccerEventState };
  if (row.sportId === 'tennis') return { ...core, sportId: row.sportId, state: row.state as TennisEventState };
  if (row.sportId === 'baseball') return { ...core, sportId: row.sportId, state: row.state as BaseballEventState };
  return { ...core, sportId: row.sportId, state: row.state as FootballEventState };
}

function collectionTarget(row: typeof schema.collectionMembers.$inferSelect): CollectionMemberTarget {
  if (row.targetType === 'participant') return { type: row.targetType, id: participantId(required(row.participantId, 'Collection participant')) };
  if (row.targetType === 'competition') return { type: row.targetType, id: competitionId(required(row.competitionId, 'Collection competition')) };
  return { type: row.targetType, id: competitionGroupId(required(row.competitionGroupId, 'Collection competition group')) };
}

function followTarget(row: typeof schema.follows.$inferSelect): FollowTarget {
  if (row.targetType === 'participant') return { type: row.targetType, id: participantId(required(row.participantId, 'Follow participant')) };
  if (row.targetType === 'competition') return { type: row.targetType, id: competitionId(required(row.competitionId, 'Follow competition')) };
  if (row.targetType === 'competition_group') return { type: row.targetType, id: competitionGroupId(required(row.competitionGroupId, 'Follow competition group')) };
  return { type: row.targetType, id: collectionId(required(row.collectionId, 'Follow collection')) };
}

export function hydrateScoreboardGraph(rows: ScoreboardRows): DomainGraph {
  return defineDomainGraph({
    sports: rows.sports.map(row => ({ id: row.id, name: row.name })),
    participants: rows.participants.map(row => ({
      id: participantId(row.id),
      sportId: row.sportId,
      type: row.type,
      name: row.name,
      shortName: row.shortName,
      slug: row.slug,
      ...(row.countryCode === null ? {} : { countryCode: row.countryCode }),
      ...(row.mark === null ? {} : { mark: row.mark as AssetRef }),
    })),
    competitionGroups: rows.competitionGroups.map(row => ({
      id: competitionGroupId(row.id),
      sportId: row.sportId,
      name: row.name,
      shortName: row.shortName,
      slug: row.slug,
    })),
    competitions: rows.competitions.map(row => ({
      id: competitionId(row.id),
      sportId: row.sportId,
      name: row.name,
      shortName: row.shortName,
      slug: row.slug,
      ...(row.category === null ? {} : { category: row.category }),
      ...(row.competitionGroupId === null ? {} : { competitionGroupId: competitionGroupId(row.competitionGroupId) }),
    })),
    seasons: rows.seasons.map(row => ({
      id: seasonId(row.id),
      competitionId: competitionId(row.competitionId),
      name: row.name,
      ...(row.startsOn === null ? {} : { startsOn: row.startsOn }),
      ...(row.endsOn === null ? {} : { endsOn: row.endsOn }),
    })),
    events: rows.events.map(eventFromRow),
    eventParticipants: rows.eventParticipants.map(row => ({
      eventId: eventId(row.eventId),
      participantId: participantId(row.participantId),
      side: sideIndex(row.side),
      order: row.order,
      ...(row.designation === null ? {} : { designation: row.designation }),
      ...(row.result === null ? {} : { result: row.result }),
      ...(row.seed === null ? {} : { seed: row.seed }),
    })),
    collections: rows.collections.map(row => ({
      id: collectionId(row.id),
      name: row.name,
      shortName: row.shortName,
      slug: row.slug,
    })),
    collectionMembers: rows.collectionMembers.map(row => ({
      collectionId: collectionId(row.collectionId),
      target: collectionTarget(row),
      position: row.position,
    })),
    follows: rows.follows.map(row => ({
      id: followId(row.id),
      ownerId: ownerId(row.ownerId),
      target: followTarget(row),
      position: row.position,
    })),
    providers: [],
    providerMappings: [],
  });
}

export function createDrizzleScoreboardRepository<TQueryResult extends PgQueryResultHKT>(
  db: Pick<PgDatabase<TQueryResult, typeof schema>, 'select'>,
): ScoreboardRepository {
  return {
    async readGraph(requestedOwnerId: OwnerId): Promise<DomainGraph> {
      const [
        sportRows,
        participantRows,
        groupRows,
        competitionRows,
        seasonRows,
        eventRows,
        eventParticipantRows,
        collectionRows,
        collectionMemberRows,
        followRows,
      ] = await Promise.all([
        db.select().from(schema.sports).orderBy(asc(schema.sports.id)),
        db.select().from(schema.participants).orderBy(asc(schema.participants.id)),
        db.select().from(schema.competitionGroups).orderBy(asc(schema.competitionGroups.id)),
        db.select().from(schema.competitions).orderBy(asc(schema.competitions.id)),
        db.select().from(schema.seasons).orderBy(asc(schema.seasons.id)),
        db.select().from(schema.events).orderBy(asc(schema.events.startsAt), asc(schema.events.id)),
        db.select().from(schema.eventParticipants).orderBy(asc(schema.eventParticipants.eventId), asc(schema.eventParticipants.side), asc(schema.eventParticipants.order)),
        db.select().from(schema.collections).orderBy(asc(schema.collections.id)),
        db.select().from(schema.collectionMembers).orderBy(asc(schema.collectionMembers.collectionId), asc(schema.collectionMembers.position)),
        db.select().from(schema.follows).where(eq(schema.follows.ownerId, requestedOwnerId)).orderBy(asc(schema.follows.position)),
      ]);

      return hydrateScoreboardGraph({
        sports: sportRows,
        participants: participantRows,
        competitionGroups: groupRows,
        competitions: competitionRows,
        seasons: seasonRows,
        events: eventRows,
        eventParticipants: eventParticipantRows,
        collections: collectionRows,
        collectionMembers: collectionMemberRows,
        follows: followRows,
      });
    },
  };
}
