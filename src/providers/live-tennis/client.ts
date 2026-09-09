import 'server-only';

import { createLiveTennisHttpClient, type LiveTennisHttpClient } from './http.ts';

export function createLiveTennisClient(apiKey = process.env.LIVE_TENNIS_API_KEY): LiveTennisHttpClient {
  if (!apiKey?.trim()) throw new Error('LIVE_TENNIS_API_KEY is not configured.');
  return createLiveTennisHttpClient({ apiKey });
}
