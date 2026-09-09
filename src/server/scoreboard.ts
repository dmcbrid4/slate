import 'server-only';
import { buildScoreboardData, projectScoreboardData } from '../application/build-scoreboard-data.ts';
import { mergeRealTennisIntoGraph } from '../application/merge-tennis-graph.ts';
import { canonicalScoreboardPresentation, CANONICAL_DEMO_NOW, LOCAL_PRIMARY_OWNER_ID } from '../data/canonical-seed.ts';
import { mockScoreboardRepository } from '../data/mock-scoreboard-repository.ts';
import { getDb } from '../db/client.ts';
import { getRealTennisGraph, isLiveTennisModeEnabled } from './live-tennis.ts';
import { getMlbScoreboardData, isMlbModeEnabled } from './mlb.ts';
import { getFootballDataScoreboardData, isFootballDataModeEnabled } from './football-data.ts';
import type { ScoreboardData } from '../read-models/scoreboard-data.ts';

async function getMockScoreboardData() {
  return buildScoreboardData({
    repository: mockScoreboardRepository,
    ownerId: LOCAL_PRIMARY_OWNER_ID,
    presentation: canonicalScoreboardPresentation,
    asOf: CANONICAL_DEMO_NOW,
  });
}

// The provider HTTP client already bounds its own calls (~15s), but a slow or contended database
// round trip (the pooled connection, or the whole-graph read's 10 parallel queries - both
// documented as provisional in docs/phase-2.md, to be replaced by narrower queries before real
// volume) is not otherwise bounded. A page load must never hang on it: past this deadline, fall
// back to mock rather than leave the request open.
const REAL_TENNIS_TIMEOUT_MS = 8_000;

async function getRealScoreboardData() {
  const now = new Date().toISOString();
  const mockGraph = await mockScoreboardRepository.readGraph(LOCAL_PRIMARY_OWNER_ID);
  const realTennisGraph = await getRealTennisGraph(getDb(), now);
  const merged = mergeRealTennisIntoGraph(mockGraph, realTennisGraph);
  return { ...projectScoreboardData(merged, { presentation: canonicalScoreboardPresentation, asOf: now }), source: 'live-tennis' as const };
}

export async function getInitialScoreboardData() {
  const mockData = await getMockScoreboardData();
  const applyOptionalProviders = async (data: ScoreboardData, now: string) => {
    let current = data;
    if (isMlbModeEnabled()) { try { current = await getMlbScoreboardData(current, now); } catch {} }
    if (isFootballDataModeEnabled()) { try { current = await getFootballDataScoreboardData(current, now); } catch {} }
    return current;
  };
  if (!isLiveTennisModeEnabled()) {
    console.warn('live_tennis_disabled', {
      databaseConfigured: Boolean(process.env.DATABASE_URL?.trim()),
      apiKeyConfigured: Boolean(process.env.LIVE_TENNIS_API_KEY?.trim()),
    });
    return applyOptionalProviders(mockData, new Date().toISOString());
  }

  // `Promise.race` doesn't cancel the loser: if the timeout wins, the real-data promise is still
  // running and will eventually settle on its own. Attach a no-op catch so that later rejection
  // (DB unreachable, provider error) doesn't surface as an unhandled rejection after this request
  // has already moved on.
  const realData = getRealScoreboardData();
  realData.catch(() => {});

  try {
    const data = await Promise.race([
      realData,
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('real_tennis_timeout')), REAL_TENNIS_TIMEOUT_MS)),
    ]);
    return applyOptionalProviders(data, data.asOf);
  } catch (error) {
    console.error('live_tennis_scoreboard_fallback', {
      name: error instanceof Error ? error.name : 'UnknownError',
      code: typeof error === 'object' && error !== null && 'code' in error && typeof error.code === 'string' ? error.code : undefined,
    });
    // Anything unexpected in the real path (database unreachable, too slow, etc.) must not break
    // the page - fall back to the mock experience rather than a 500 or an indefinite wait.
    return applyOptionalProviders(mockData, new Date().toISOString());
  }
}
