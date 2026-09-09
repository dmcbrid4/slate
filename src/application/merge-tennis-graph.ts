import { defineDomainGraph } from '../domain/index.ts';
import type { DomainGraph, FollowTarget } from '../domain/model.ts';

function targetResolves(target: FollowTarget, graph: DomainGraph): boolean {
  if (target.type === 'participant') return graph.participants.some(item => item.id === target.id);
  if (target.type === 'competition') return graph.competitions.some(item => item.id === target.id);
  if (target.type === 'competition_group') return graph.competitionGroups.some(item => item.id === target.id);
  return graph.collections.some(item => item.id === target.id);
}

/**
 * Replaces tennis in `mockGraph` with whatever tennis data `realTennisGraph` actually contains,
 * leaving every other sport untouched. `realTennisGraph` is expected to hold tennis-only data (the
 * real-provider repository never writes any other sport in this vertical slice), but this doesn't
 * assume that — it filters by sportId either way, so a differently-scoped real graph stays correct.
 *
 * Collection members and follows are kept as-is except for entries whose target no longer resolves
 * in the merged graph. That's not just tennis cleanup: it also covers cold start, where real mode
 * is enabled but no provider fetch has ever succeeded yet, so `realTennisGraph` is entirely empty
 * and the "us-open" competition group doesn't exist anywhere yet. Dropping the dangling collection
 * member (not the collection, and not the follow that targets the durable collection itself) lets
 * that degrade to the existing empty-state UI instead of failing graph validation.
 */
export function mergeRealTennisIntoGraph(mockGraph: DomainGraph, realTennisGraph: DomainGraph): DomainGraph {
  const removedCompetitionIds = new Set(mockGraph.competitions.filter(competition => competition.sportId === 'tennis').map(competition => competition.id));
  const keptCompetitions = mockGraph.competitions.filter(competition => competition.sportId !== 'tennis');
  const keptEvents = mockGraph.events.filter(event => event.sportId !== 'tennis');
  const removedEventIds = new Set(mockGraph.events.filter(event => event.sportId === 'tennis').map(event => event.id));

  const merged: DomainGraph = {
    sports: mockGraph.sports,
    participants: [...mockGraph.participants.filter(participant => participant.sportId !== 'tennis'), ...realTennisGraph.participants],
    competitionGroups: [...mockGraph.competitionGroups.filter(group => group.sportId !== 'tennis'), ...realTennisGraph.competitionGroups],
    competitions: [...keptCompetitions, ...realTennisGraph.competitions],
    seasons: [...mockGraph.seasons.filter(season => !removedCompetitionIds.has(season.competitionId)), ...realTennisGraph.seasons],
    events: [...keptEvents, ...realTennisGraph.events],
    eventParticipants: [...mockGraph.eventParticipants.filter(link => !removedEventIds.has(link.eventId)), ...realTennisGraph.eventParticipants],
    collections: mockGraph.collections,
    collectionMembers: mockGraph.collectionMembers,
    follows: mockGraph.follows,
    providers: realTennisGraph.providers,
    providerMappings: realTennisGraph.providerMappings,
  };

  return defineDomainGraph({
    ...merged,
    collectionMembers: merged.collectionMembers.filter(member => targetResolves(member.target, merged)),
    follows: merged.follows.filter(follow => targetResolves(follow.target, merged)),
  });
}
