import { collectionId, competitionGroupId, competitionId, participantId } from '../domain/ids.ts';
import type { FollowTarget } from '../domain/model.ts';
import { entities } from './entities.ts';

const entries = [
  ['atp-wta', { type: 'collection', id: collectionId('atp-wta') }],
  ['tottenham', { type: 'participant', id: participantId('tottenham') }],
  ['red-sox', { type: 'participant', id: participantId('red-sox') }],
  ['diamondbacks', { type: 'participant', id: participantId('diamondbacks') }],
  ['premier-league', { type: 'competition', id: competitionId('premier-league') }],
  ['champions-league', { type: 'competition', id: competitionId('champions-league') }],
  ['nfl', { type: 'competition', id: competitionId('nfl') }],
  ['us-open', { type: 'competition_group', id: competitionGroupId('us-open') }],
  ['alcaraz', { type: 'participant', id: participantId('carlos-alcaraz') }],
  ['gauff', { type: 'participant', id: participantId('coco-gauff') }],
  ['liverpool', { type: 'participant', id: participantId('liverpool') }],
  ['sinner', { type: 'participant', id: participantId('jannik-sinner') }],
  ['bills', { type: 'participant', id: participantId('buffalo-bills') }],
] as const satisfies readonly (readonly [string, FollowTarget])[];

export const destinationTargets: ReadonlyMap<string, FollowTarget> = new Map<string, FollowTarget>(entries);

const missingDestination = entities.find(entity => !destinationTargets.has(entity.id));
if (missingDestination) throw new Error(`Missing canonical target for destination ${missingDestination.id}.`);

export function targetForDestination(id: string): FollowTarget | undefined {
  return destinationTargets.get(id);
}

export function sameFollowTarget(left: FollowTarget, right: FollowTarget): boolean {
  return left.type === right.type && left.id === right.id;
}
