import type { EventRelevance, FollowMatch } from '../application/relevance.ts';
import { followId, ownerId } from '../domain/ids.ts';
import type { Follow, FollowTarget } from '../domain/model.ts';
import type { Day } from './types.ts';
import { dateKey, selectedDate } from '../lib/scores.ts';
import { scoreboardTargetMatches, type ScoreboardData, type ScoreboardEventRecord } from '../read-models/scoreboard-data.ts';
import type { ScoreboardEvent } from '../read-models/scoreboard.ts';
import { sameFollowTarget, targetForDestination } from './destination-targets.ts';

const DEVICE_OWNER_ID = ownerId('local-primary');

export type RelevantScoreboardEvent = ScoreboardEvent & {
  readonly relevance: EventRelevance;
};

function deviceFollows(destinationIds: readonly string[]): readonly Follow[] {
  return destinationIds.flatMap((destinationId, position) => {
    const target = targetForDestination(destinationId);
    return target ? [{ id: followId(`follow-${destinationId}`), ownerId: DEVICE_OWNER_ID, target, position }] : [];
  });
}

function withRelevance<T extends ScoreboardEvent>(event: T, relevance: RelevantScoreboardEvent['relevance']): T & { readonly relevance: RelevantScoreboardEvent['relevance'] } {
  return { ...event, relevance };
}

function relevanceForRecord(record: ScoreboardEventRecord, follows: readonly Follow[]): EventRelevance {
  const matches = follows.flatMap((follow): readonly FollowMatch[] => {
    const match = record.targetMatches.find(candidate => scoreboardTargetMatches(candidate, follow.target));
    return match ? [{ followId: follow.id, target: follow.target, ...(match.via ? { via: match.via } : {}) }] : [];
  });
  const primaryMatch = matches.find(match => match.target.type === 'participant') ?? matches[0];
  return { eventId: record.eventId, matches, ...(primaryMatch ? { primaryMatch } : {}) };
}

export function selectScoreboardEvents(
  data: ScoreboardData,
  destinationId: string,
  followingDestinationIds: readonly string[],
  day: Day,
  timeZone: string,
  now = data.asOf,
): readonly RelevantScoreboardEvent[] {
  const follows = deviceFollows(followingDestinationIds);
  const destination = destinationId === 'for-you' ? undefined : targetForDestination(destinationId);
  if (destinationId !== 'for-you' && !destination) return [];
  const targetDate = selectedDate(now, day, timeZone);

  return data.records.flatMap(record => {
    if (dateKey(record.event.start, timeZone) !== targetDate) return [];
    const relevance = relevanceForRecord(record, follows);
    const relevant = destination === undefined
      ? relevance.matches.length > 0
      : record.targetMatches.some(candidate => scoreboardTargetMatches(candidate, destination));
    if (!relevant) return [];
    return [withRelevance(record.event, relevance)];
  }).sort((left, right) => {
    if (destinationId === 'for-you') {
      const personal = Number(isPersonal(right)) - Number(isPersonal(left));
      if (personal) return personal;
    }
    const order = { live: 0, scheduled: 1, final: 2, suspended: 3, postponed: 4, cancelled: 5 };
    return order[left.status] - order[right.status] || left.start.localeCompare(right.start);
  });
}

export function isPersonal(event: RelevantScoreboardEvent): boolean {
  return event.relevance.matches.some(match => match.target.type === 'participant');
}

export function eventMatchesFollowDestination(event: RelevantScoreboardEvent, destinationId: string): boolean {
  const target = targetForDestination(destinationId);
  return target !== undefined && event.relevance.matches.some(match => sameFollowTarget(match.target, target));
}

export function followTargetForDestination(destinationId: string): FollowTarget | undefined {
  return targetForDestination(destinationId);
}
