import { createRelevanceResolver } from '../application/relevance.ts';
import type { EventRelevance } from '../application/relevance.ts';
import { followId } from '../domain/ids.ts';
import type { Follow, FollowTarget } from '../domain/model.ts';
import type { Day } from './types.ts';
import { dateKey, selectedDate } from '../lib/scores.ts';
import { projectScoreboardEvents } from '../read-models/project-scoreboard.ts';
import type { ScoreboardEvent } from '../read-models/scoreboard.ts';
import { CANONICAL_DEMO_NOW, canonicalScoreboardPresentation, canonicalSeed, LOCAL_PRIMARY_OWNER_ID } from './canonical-seed.ts';
import { sameFollowTarget, targetForDestination } from './destination-targets.ts';

export const DEMO_NOW = CANONICAL_DEMO_NOW;
export const scoreboardEvents = projectScoreboardEvents(canonicalSeed, canonicalScoreboardPresentation);

export type RelevantScoreboardEvent = ScoreboardEvent & {
  readonly relevance: EventRelevance;
};

function deviceFollows(destinationIds: readonly string[]): readonly Follow[] {
  return destinationIds.flatMap((destinationId, position) => {
    const target = targetForDestination(destinationId);
    return target ? [{ id: followId(`follow-${destinationId}`), ownerId: LOCAL_PRIMARY_OWNER_ID, target, position }] : [];
  });
}

function withRelevance<T extends ScoreboardEvent>(event: T, relevance: RelevantScoreboardEvent['relevance']): T & { readonly relevance: RelevantScoreboardEvent['relevance'] } {
  return { ...event, relevance };
}

export function selectScoreboardEvents(
  destinationId: string,
  followingDestinationIds: readonly string[],
  day: Day,
  timeZone: string,
  now = DEMO_NOW,
): readonly RelevantScoreboardEvent[] {
  const follows = deviceFollows(followingDestinationIds);
  const resolver = createRelevanceResolver(canonicalSeed);
  const destination = destinationId === 'for-you' ? undefined : targetForDestination(destinationId);
  if (destinationId !== 'for-you' && !destination) return [];
  const targetDate = selectedDate(now, day, timeZone);
  const projectedById = new Map(scoreboardEvents.map(event => [event.id, event]));

  return canonicalSeed.events.flatMap(event => {
    if (dateKey(event.startsAt, timeZone) !== targetDate) return [];
    const relevance = resolver.relevanceForEvent(event, follows);
    const relevant = destination === undefined
      ? relevance.matches.length > 0
      : resolver.targetMatchesEvent(event, destination);
    if (!relevant) return [];
    const projected = projectedById.get(event.id);
    return projected ? [withRelevance(projected, relevance)] : [];
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
