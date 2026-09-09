import type { ScoreboardRepository } from './scoreboard-repository.ts';
import { createRelevanceResolver } from './relevance.ts';
import type { OwnerId } from '../domain/ids.ts';
import type { DomainGraph, FollowTarget } from '../domain/model.ts';
import { projectScoreboardEvents, type ScoreboardPresentation } from '../read-models/project-scoreboard.ts';
import type { ScoreboardData, ScoreboardTargetMatch } from '../read-models/scoreboard-data.ts';

export interface BuildScoreboardDataOptions {
  readonly repository: ScoreboardRepository;
  readonly ownerId: OwnerId;
  readonly presentation: ScoreboardPresentation;
  readonly asOf: string;
}

function followTargets(graph: DomainGraph): readonly FollowTarget[] {
  return [
    ...graph.participants.map(({ id }) => ({ type: 'participant' as const, id })),
    ...graph.competitions.map(({ id }) => ({ type: 'competition' as const, id })),
    ...graph.competitionGroups.map(({ id }) => ({ type: 'competition_group' as const, id })),
    ...graph.collections.map(({ id }) => ({ type: 'collection' as const, id })),
  ];
}

export async function buildScoreboardData(options: BuildScoreboardDataOptions): Promise<ScoreboardData> {
  const graph = await options.repository.readGraph(options.ownerId);
  const resolver = createRelevanceResolver(graph);
  const projectedById = new Map(projectScoreboardEvents(graph, options.presentation).map(event => [event.id, event]));
  const membersByCollection = new Map(graph.collections.map(collection => [
    collection.id,
    graph.collectionMembers
      .filter(member => member.collectionId === collection.id)
      .sort((left, right) => left.position - right.position),
  ]));
  const targets = followTargets(graph);

  return {
    asOf: options.asOf,
    records: graph.events.map(event => {
      const projected = projectedById.get(event.id);
      if (!projected) throw new Error(`Missing scoreboard projection for ${event.id}.`);
      const targetMatches = targets.flatMap((target): readonly ScoreboardTargetMatch[] => {
        if (!resolver.targetMatchesEvent(event, target)) return [];
        if (target.type !== 'collection') return [{ target }];
        const via = membersByCollection.get(target.id)?.find(member => resolver.targetMatchesEvent(event, member.target))?.target;
        return [{ target, ...(via ? { via } : {}) }];
      });
      return { eventId: event.id, event: projected, targetMatches };
    }),
  };
}

export function scoreboardTargetMatches(
  candidate: ScoreboardTargetMatch,
  target: FollowTarget,
): boolean {
  return candidate.target.type === target.type && candidate.target.id === target.id;
}
