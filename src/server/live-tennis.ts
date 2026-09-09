import 'server-only';
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core';
import { createMappingReader, type NormalizationBatch } from '../application/normalization.ts';
import { runLiveTennisRefreshCycle, type RefreshResourceHandler } from '../application/live-tennis-refresh.ts';
import type { NormalizationRepository } from '../application/scoreboard-repository.ts';
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
  liveTennisMatchDecoder,
  liveTennisMatchListDecoder,
  liveTennisNormalizer,
} from '../providers/live-tennis/index.ts';
import type { LiveTennisFixture, LiveTennisMatch } from '../providers/live-tennis/types.ts';

// A match past this age without a fresh `live_matches` observation has almost certainly stopped
// being returned by the provider's live/upcoming endpoints (both are all `listMatches` can query -
// see `LiveTennisMatchListOptions`), which is the only way a real match reaches `'final'` today.
// Twice the `live_matches` cadence tolerates one skipped cycle before treating a match as stale.
const MATCH_RESOLUTION_LOOKBACK_MS = 60 * 60_000;
// `acquire()` reserves this many calls against the daily budget up front, before the DB check
// below even runs, so an empty cycle (no stale match found) still spends this every time the
// resource is due. Kept at 1 to keep that worst-case cost negligible; resolving one stale match
// per 30-minute cycle self-corrects within a cycle or two even if several end at once.
const MATCH_RESOLUTION_LIMIT = 1;

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
  writeRepository: NormalizationRepository,
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
    {
      resource: 'match_resolution', reserveCalls: MATCH_RESOLUTION_LIMIT,
      async fetchAndNormalize() {
        const olderThan = new Date(Date.parse(now) - MATCH_RESOLUTION_LOOKBACK_MS).toISOString();
        const stale = await writeRepository.findStaleLiveEvents(LIVE_TENNIS_PROVIDER_ID, olderThan, MATCH_RESOLUTION_LIMIT);
        if (stale.length === 0) return undefined;
        const matches = await Promise.all(stale.map(async event => {
          const result = await client.getMatch(Number(event.providerEntityId));
          return liveTennisMatchDecoder.parse(result.body);
        }));
        return normalize(matches, []);
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
  const scoreboardRepository = createDrizzleScoreboardRepository(db);
  const storedGraph = await scoreboardRepository.readGraph(LOCAL_PRIMARY_OWNER_ID);

  const refresh = runLiveTennisRefreshCycle({
      refreshRepository,
      writeRepository,
      providerId: LIVE_TENNIS_PROVIDER_ID,
      now,
      handlers: buildHandlers(client, writeRepository, mappings, now),
    }).then(() => true).catch(() => false);

  // Serving an accepted snapshot must not wait on a slow provider. Give a due refresh a short
  // opportunity to complete, then return the stored graph while the refresh settles safely.
  const refreshed = await Promise.race([
    refresh,
    new Promise<false>(resolve => setTimeout(() => resolve(false), 2_500)),
  ]);

  // The owner here only scopes which `follows` rows come back, and the merge step (the caller)
  // discards this graph's follows entirely in favor of the mock graph's - no real Follow rows
  // exist in Postgres yet regardless of which owner is requested.
  const graph = refreshed ? await scoreboardRepository.readGraph(LOCAL_PRIMARY_OWNER_ID) : storedGraph;
  return { ...graph, participants: graph.participants.filter(p => p.sportId === 'tennis'), events: graph.events.filter(e => e.sportId === 'tennis') };
}
