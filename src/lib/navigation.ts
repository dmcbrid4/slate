import { entityById } from '../data/entities.ts';
import type { Day } from '../data/types.ts';
import { days } from './scores.ts';

export const DEFAULT_SCORE_ROUTE = '/scores/for-you/today';

export type ScoreRoute = {
  day: Day;
  destination: string;
  path: string;
};

export function parseScoreRoute(value: string | null | undefined): ScoreRoute | undefined {
  if (!value) return;
  const path = value.split('?')[0];
  const parts = path.split('/');
  if (parts.length !== 4 || parts[0] !== '' || parts[1] !== 'scores') return;

  const destination = parts[2];
  const requestedDay = parts[3];
  if (destination !== 'for-you' && !Object.hasOwn(entityById, destination)) return;
  if (!days.includes(requestedDay as Day)) return;

  const day = requestedDay as Day;
  return { destination, day, path: `/scores/${destination}/${day}` };
}
