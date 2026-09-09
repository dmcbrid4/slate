import 'server-only';
import { buildScoreboardData, projectScoreboardData } from '../application/build-scoreboard-data.ts';
import { mergeRealTennisIntoGraph } from '../application/merge-tennis-graph.ts';
import { canonicalScoreboardPresentation, CANONICAL_DEMO_NOW, LOCAL_PRIMARY_OWNER_ID } from '../data/canonical-seed.ts';
import { mockScoreboardRepository } from '../data/mock-scoreboard-repository.ts';
import { getDb } from '../db/client.ts';
import { getRealTennisGraph, isLiveTennisModeEnabled } from './live-tennis.ts';

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
  if (!isLiveTennisModeEnabled()) return getMockScoreboardData();

  // `Promise.race` doesn't cancel the loser: if the timeout wins, the real-data promise is still
  // running and will eventually settle on its own. Attach a no-op catch so that later rejection
  // (DB unreachable, provider error) doesn't surface as an unhandled rejection after this request
  // has already moved on.
  const realData = getRealScoreboardData();
  realData.catch(() => {});

  try {
    return await Promise.race([
      realData,
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('real_tennis_timeout')), REAL_TENNIS_TIMEOUT_MS)),
    ]);
  } catch {
    // Anything unexpected in the real path (database unreachable, too slow, etc.) must not break
    // the page - fall back to the mock experience rather than a 500 or an indefinite wait.
    return getMockScoreboardData();
  }
}
