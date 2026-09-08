import { defaultFollowing, entityById } from '../data/entities.ts';

export type Preferences = { following: string[]; theme: 'system' | 'light' | 'dark' };
export const defaultPreferences: Preferences = { following: defaultFollowing, theme: 'system' };
export const STORAGE_KEY = 'slate-phase0-v1';

export function parsePreferences(raw: string | null): Preferences {
  if (!raw) return defaultPreferences;
  try {
    const value: unknown = JSON.parse(raw);
    if (typeof value !== 'object' || value === null) return defaultPreferences;
    const data = value as Record<string, unknown>;
    return {
      following: Array.isArray(data.following)
        ? [...new Set(data.following.filter((id): id is string => typeof id === 'string' && Object.hasOwn(entityById, id)))]
        : defaultFollowing,
      theme: data.theme === 'light' || data.theme === 'dark' ? data.theme : 'system',
    };
  } catch {
    return defaultPreferences;
  }
}
