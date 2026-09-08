import type { Day } from '../data/types.ts';

export const days: Day[] = ['yesterday', 'today', 'tomorrow'];

export function dateKey(instant: string, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(instant));
  const get = (type: string) => parts.find(part => part.type === type)?.value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}

export function selectedDate(now: string, day: Day, timeZone: string): string {
  const date = new Date(`${dateKey(now, timeZone)}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days.indexOf(day) - 1);
  return date.toISOString().slice(0, 10);
}

export function formatDay(key: string, long = false): string {
  return new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', weekday: long ? 'long' : 'short', month: 'short', day: 'numeric' }).format(new Date(`${key}T12:00:00Z`));
}

export function formatFullDay(key: string): string {
  return new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).format(new Date(`${key}T12:00:00Z`));
}

export function formatTime(instant: string, timeZone: string): string {
  return new Intl.DateTimeFormat('en-US', { timeZone, hour: 'numeric', minute: '2-digit' }).format(new Date(instant));
}

export function timezoneLabel(timeZone: string, now: string): string {
  return new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName: 'short' }).formatToParts(new Date(now)).find(part => part.type === 'timeZoneName')?.value ?? timeZone;
}

export function reorderFollowing(following: string[], id: string, direction: -1 | 1): string[] {
  const from = following.indexOf(id);
  const to = from + direction;
  if (from < 0 || to < 0 || to >= following.length) return following;
  const next = [...following];
  [next[from], next[to]] = [next[to], next[from]];
  return next;
}

export function eventHref(id: string, from: string): string {
  return `#/event/${id}?from=${encodeURIComponent(from)}`;
}

export function swipeDestination(current: string, following: string[], dx: number, dy: number): string | undefined {
  if (Math.abs(dx) < 70 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
  const rail = ['for-you', ...following];
  const index = rail.indexOf(current);
  if (index < 0) return;
  return rail[index + (dx < 0 ? 1 : -1)];
}
