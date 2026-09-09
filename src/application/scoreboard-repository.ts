import type { OwnerId } from '../domain/ids.ts';
import type { DomainGraph } from '../domain/model.ts';

export interface ScoreboardRepository {
  readGraph(ownerId: OwnerId): Promise<DomainGraph>;
}
