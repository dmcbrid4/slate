import type { ScoreboardRepository } from '../application/scoreboard-repository.ts';
import type { OwnerId } from '../domain/ids.ts';
import type { DomainGraph } from '../domain/model.ts';
import { canonicalSeed } from './canonical-seed.ts';

export function createMemoryScoreboardRepository(graph: DomainGraph): ScoreboardRepository {
  return {
    async readGraph(ownerId: OwnerId): Promise<DomainGraph> {
      return {
        ...graph,
        follows: graph.follows.filter(follow => follow.ownerId === ownerId),
      };
    },
  };
}

export const mockScoreboardRepository = createMemoryScoreboardRepository(canonicalSeed);
