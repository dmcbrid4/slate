import type { EventId } from '../domain/ids.ts';
import type {
  CanonicalEvent,
  CollectionMemberTarget,
  DomainGraph,
  Follow,
  FollowTarget,
} from '../domain/model.ts';

export interface FollowMatch {
  readonly followId: Follow['id'];
  readonly target: FollowTarget;
  readonly via?: CollectionMemberTarget;
}

export interface EventRelevance {
  readonly eventId: EventId;
  readonly matches: readonly FollowMatch[];
  readonly primaryMatch?: FollowMatch;
}

export interface RelevantCanonicalEvent {
  readonly event: CanonicalEvent;
  readonly relevance: EventRelevance;
}

function sameTarget(left: CollectionMemberTarget, right: CollectionMemberTarget): boolean {
  return left.type === right.type && left.id === right.id;
}

export function createRelevanceResolver(graph: DomainGraph) {
  const competitions = new Map(graph.competitions.map(competition => [competition.id, competition]));
  const participantsByEvent = new Map<EventId, Set<string>>();
  const membersByCollection = new Map<string, CollectionMemberTarget[]>();

  for (const relation of graph.eventParticipants) {
    const participants = participantsByEvent.get(relation.eventId) ?? new Set<string>();
    participants.add(relation.participantId);
    participantsByEvent.set(relation.eventId, participants);
  }
  for (const member of [...graph.collectionMembers].sort((a, b) => a.position - b.position)) {
    const members = membersByCollection.get(member.collectionId) ?? [];
    if (!members.some(existing => sameTarget(existing, member.target))) members.push(member.target);
    membersByCollection.set(member.collectionId, members);
  }

  const targetMatchesEvent = (event: CanonicalEvent, target: FollowTarget): boolean => {
    if (target.type === 'collection') {
      return membersByCollection.get(target.id)?.some(member => targetMatchesEvent(event, member)) ?? false;
    }
    if (target.type === 'participant') return participantsByEvent.get(event.id)?.has(target.id) ?? false;
    if (target.type === 'competition') return event.competitionId === target.id;
    return competitions.get(event.competitionId)?.competitionGroupId === target.id;
  };

  const matchFollow = (event: CanonicalEvent, follow: Follow): FollowMatch | undefined => {
    if (follow.target.type !== 'collection') {
      return targetMatchesEvent(event, follow.target) ? { followId: follow.id, target: follow.target } : undefined;
    }
    const via = membersByCollection.get(follow.target.id)?.find(member => targetMatchesEvent(event, member));
    return via ? { followId: follow.id, target: follow.target, via } : undefined;
  };

  const relevanceForEvent = (event: CanonicalEvent, follows: readonly Follow[]): EventRelevance => {
    const matches = [...follows]
      .sort((a, b) => a.position - b.position)
      .map(follow => matchFollow(event, follow))
      .filter((match): match is FollowMatch => match !== undefined);
    const primaryMatch = matches.find(match => match.target.type === 'participant') ?? matches[0];
    return { eventId: event.id, matches, ...(primaryMatch ? { primaryMatch } : {}) };
  };

  return { targetMatchesEvent, relevanceForEvent };
}

export function selectRelevantEvents(
  graph: DomainGraph,
  follows: readonly Follow[],
  destination?: FollowTarget,
): readonly RelevantCanonicalEvent[] {
  const resolver = createRelevanceResolver(graph);
  return graph.events.flatMap(event => {
    const relevance = resolver.relevanceForEvent(event, follows);
    const destinationMatches = destination === undefined ? relevance.matches.length > 0 : resolver.targetMatchesEvent(event, destination);
    return destinationMatches ? [{ event, relevance }] : [];
  });
}
