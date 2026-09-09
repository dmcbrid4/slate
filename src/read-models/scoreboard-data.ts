import type { CollectionMemberTarget, FollowTarget } from '../domain/model.ts';
import type { EventId } from '../domain/ids.ts';
import type { ScoreboardEvent } from './scoreboard.ts';

export interface ScoreboardTargetMatch {
  readonly target: FollowTarget;
  readonly via?: CollectionMemberTarget;
}

export interface ScoreboardEventRecord {
  readonly eventId: EventId;
  readonly event: ScoreboardEvent;
  readonly targetMatches: readonly ScoreboardTargetMatch[];
}

export interface ScoreboardData {
  readonly asOf: string;
  readonly records: readonly ScoreboardEventRecord[];
}
