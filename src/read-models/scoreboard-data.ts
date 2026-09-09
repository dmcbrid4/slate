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
  /** Identifies the live provider only when the request was served from it. */
  readonly source?: 'live-tennis' | 'live-mlb' | 'live-tennis+mlb';
  readonly records: readonly ScoreboardEventRecord[];
}

export function scoreboardTargetMatches(
  candidate: ScoreboardTargetMatch,
  target: FollowTarget,
): boolean {
  return candidate.target.type === target.type && candidate.target.id === target.id;
}
