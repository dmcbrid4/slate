import 'server-only';
import { buildScoreboardData } from '../application/build-scoreboard-data.ts';
import { canonicalScoreboardPresentation, CANONICAL_DEMO_NOW, LOCAL_PRIMARY_OWNER_ID } from '../data/canonical-seed.ts';
import { mockScoreboardRepository } from '../data/mock-scoreboard-repository.ts';

export async function getInitialScoreboardData() {
  return buildScoreboardData({
    repository: mockScoreboardRepository,
    ownerId: LOCAL_PRIMARY_OWNER_ID,
    presentation: canonicalScoreboardPresentation,
    asOf: CANONICAL_DEMO_NOW,
  });
}
