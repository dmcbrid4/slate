import 'server-only';
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core';
import { createMappingReader, type NormalizationBatch } from '../application/normalization.ts';
import { runLiveTennisRefreshCycle, type RefreshResourceHandler } from '../application/live-tennis-refresh.ts';
import { providerId } from '../domain/ids.ts';
import type { DomainGraph, ProviderEntityMapping } from '../domain/model.ts';
import { LOCAL_PRIMARY_OWNER_ID } from '../data/canonical-seed.ts';
import { createDrizzleNormalizationWriteRepository } from '../db/normalization-repository.ts';
import { createDrizzleRefreshRepository } from '../db/refresh-repository.ts';
import { createDrizzleScoreboardRepository } from '../db/scoreboard-repository.ts';
import * as schema from '../db/schema.ts';
import {
  createLiveTennisHttpClient,
  liveTennisFixtureListDecoder,
  liveTennisMatchListDecoder,
  liveTennisNormalizer,
} from '../providers/live-tennis/index.ts';
import type { LiveTennisFixture, LiveTennisMatch } from '../providers/live-tennis/types.ts';

export const LIVE_TENNIS_PROVIDER_ID = providerId('live-tennis');

export function isLiveTennisModeEnabled(): boolean {
  return Boolean(process.env.DATABASE_URL?.trim() && process.env.LIVE_TENNIS_API_KEY?.trim());
}

/**
 * Idempotent. Two rows must exist before any tennis write can succeed: `writeNormalizationBatch`
 * requires the provider row itself, and every canonical table with a `sport_id` column (including
 * `competition_groups`, which a match write touches even for an already-known tournament) has a
 * foreign key into `sports` - a fresh database has neither, since the migration only creates the
 * schema, not reference data.
 */
async function ensureLiveTennisSeeded<TQueryResult extends PgQueryResultHKT>(db: PgDatabase<TQueryResult, typeof schema>): Promise<void> {
  await db.insert(schema.sports).values({ id: 'tennis', name: 'Tennis' }).onConflictDoNothing();
  await db.insert(schema.providers).values({ id: LIVE_TENNIS_PROVIDER_ID, name: 'Live Tennis API' }).onConflictDoNothing();
}

async function fetchBothTours(
  client: ReturnType<typeof createLiveTennisHttpClient>,
  status: 'live' | 'upcoming',
): Promise<readonly LiveTennisMatch[]> {
  const [atp, wta] = await Promise.all([
    client.listMatches({ status, tour: 'atp', draw: 'singles' }),
    client.listMatches({ status, tour: 'wta', draw: 'singles' }),
  ]);
  return [...liveTennisMatchListDecoder.parse(atp.body).data, ...liveTennisMatchListDecoder.parse(wta.body).data];
}

function buildHandlers(
  client: ReturnType<typeof createLiveTennisHttpClient>,
  mappings: readonly ProviderEntityMapping[],
  now: string,
): readonly RefreshResourceHandler[] {
  const context = { providerId: LIVE_TENNIS_PROVIDER_ID, observedAt: now, mappings: createMappingReader(mappings) };
  const normalize = (matches: readonly LiveTennisMatch[], fixtures: readonly LiveTennisFixture[]): NormalizationBatch | undefined =>
    matches.length === 0 && fixtures.length === 0 ? undefined : liveTennisNormalizer.normalize({ matches, fixtures }, context);

  return [
    { resource: 'live_matches', reserveCalls: 2, async fetchAndNormalize() { return normalize(await fetchBothTours(client, 'live'), []); } },
    { resource: 'upcoming_matches', reserveCalls: 2, async fetchAndNormalize() { return normalize(await fetchBothTours(client, 'upcoming'), []); } },
    {
      resource: 'fixtures', reserveCalls: 1,
      async fetchAndNormalize() {
        const result = await client.listFixtures();
        const fixtures = liveTennisFixtureListDecoder.parse(result.body).data;
        return normalize([], fixtures);
      },
    },
  ];
}

/**
 * Runs one request-driven refresh cycle (most resources will already be fresh and touch no
 * network - see `runLiveTennisRefreshCycle`) and returns whatever tennis data the real database
 * currently has, regardless of whether this call's fetch attempts succeeded. Never throws for a
 * provider/network failure - callers get the last accepted snapshot either way.
 */
export async function getRealTennisGraph<TQueryResult extends PgQueryResultHKT>(
  db: PgDatabase<TQueryResult, typeof schema>,
  now: string,
): Promise<DomainGraph> {
  await ensureLiveTennisSeeded(db);
  const refreshRepository = createDrizzleRefreshRepository(db);
  const writeRepository = createDrizzleNormalizationWriteRepository(db);
  const client = createLiveTennisHttpClient({ apiKey: process.env.LIVE_TENNIS_API_KEY! });
  const mappings = await writeRepository.readProviderMappings(LIVE_TENNIS_PROVIDER_ID);

  try {
    await runLiveTennisRefreshCycle({
      refreshRepository,
      writeRepository,
      providerId: LIVE_TENNIS_PROVIDER_ID,
      now,
      handlers: buildHandlers(client, mappings, now),
    });
  } catch {
    // A refresh cycle failure must never block serving the last accepted snapshot below.
  }

  // The owner here only scopes which `follows` rows come back, and the merge step (the caller)
  // discards this graph's follows entirely in favor of the mock graph's - no real Follow rows
  // exist in Postgres yet regardless of which owner is requested.
  const scoreboardRepository = createDrizzleScoreboardRepository(db);
  const graph = await scoreboardRepository.readGraph(LOCAL_PRIMARY_OWNER_ID);
  return { ...graph, participants: graph.participants.filter(p => p.sportId === 'tennis'), events: graph.events.filter(e => e.sportId === 'tennis') };
}
