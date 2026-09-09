import type { ProviderId } from '../domain/ids.ts';
import type { NormalizationBatch } from './normalization.ts';
import type { NormalizationWriteRepository } from './scoreboard-repository.ts';
import type { RefreshRepository } from './refresh-repository.ts';
import type { RefreshResource } from './refresh-policy.ts';

export interface RefreshResourceHandler {
  readonly resource: RefreshResource;
  readonly reserveCalls: number;
  fetchAndNormalize(): Promise<NormalizationBatch | undefined>;
}

export type RefreshOutcome =
  | { readonly resource: RefreshResource; readonly type: 'waited'; readonly reason: 'fresh' | 'leased' | 'quota_exhausted' }
  | { readonly resource: RefreshResource; readonly type: 'skipped' }
  | { readonly resource: RefreshResource; readonly type: 'written'; readonly status: 'accepted' | 'stale' }
  | { readonly resource: RefreshResource; readonly type: 'failed'; readonly code: string };

export interface RunLiveTennisRefreshCycleOptions {
  readonly refreshRepository: RefreshRepository;
  readonly writeRepository: NormalizationWriteRepository;
  readonly providerId: ProviderId;
  readonly now: string;
  readonly handlers: readonly RefreshResourceHandler[];
  readonly retryDelayMs?: number;
}

const DEFAULT_RETRY_DELAY_MS = 60_000;

// Duck-typed rather than importing a provider-specific error type: this module must stay usable
// with any provider's handlers, and a `LiveTennisHttpError`-shaped code/resetsAt is a reasonable,
// provider-agnostic contract for "a structured failure that knows when it's safe to retry."
function failureCode(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'code' in error && typeof error.code === 'string') return error.code;
  if (error instanceof Error) return error.name || 'unknown_error';
  return 'unknown_error';
}

function providerRetryAt(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null || !('rateLimit' in error)) return undefined;
  const rateLimit = error.rateLimit;
  if (typeof rateLimit !== 'object' || rateLimit === null || !('resetsAt' in rateLimit)) return undefined;
  const resetsAt = rateLimit.resetsAt;
  return typeof resetsAt === 'string' && Number.isFinite(Date.parse(resetsAt)) ? resetsAt : undefined;
}

/**
 * Drives one request-driven refresh cycle across independently-leased resources. Each handler is
 * tried in turn: `acquire()` decides whether this resource is actually due (most requests will find
 * every resource still fresh and touch the network for none of them); only an acquired handler is
 * allowed to fetch. A handler that returns `undefined` (nothing worth normalizing this cycle, e.g.
 * an empty response) still completes its lease with no write. A throwing handler releases its lease
 * via `fail()` with a bounded retry delay rather than propagating — one resource failing must not
 * block the others or the caller's fallback-to-last-accepted-data path.
 */
export async function runLiveTennisRefreshCycle(options: RunLiveTennisRefreshCycleOptions): Promise<readonly RefreshOutcome[]> {
  const { refreshRepository, writeRepository, providerId, now, handlers, retryDelayMs = DEFAULT_RETRY_DELAY_MS } = options;
  const outcomes: RefreshOutcome[] = [];

  for (const handler of handlers) {
    const lease = await refreshRepository.acquire(providerId, handler.resource, now, handler.reserveCalls);
    if (lease.type === 'wait') {
      outcomes.push({ resource: handler.resource, type: 'waited', reason: lease.reason });
      continue;
    }

    try {
      const batch = await handler.fetchAndNormalize();
      if (!batch) {
        await refreshRepository.complete({ providerId, resource: handler.resource, token: lease.token, acceptedAt: now });
        outcomes.push({ resource: handler.resource, type: 'skipped' });
        continue;
      }
      const result = await writeRepository.writeNormalizationBatch(batch);
      await refreshRepository.complete({ providerId, resource: handler.resource, token: lease.token, acceptedAt: now, providerObservedAt: batch.observedAt });
      outcomes.push({ resource: handler.resource, type: 'written', status: result.status });
    } catch (error) {
      const code = failureCode(error);
      const retryAt = providerRetryAt(error) ?? new Date(Date.parse(now) + retryDelayMs).toISOString();
      await refreshRepository.fail({ providerId, resource: handler.resource, token: lease.token, failedAt: now, code, retryAt });
      outcomes.push({ resource: handler.resource, type: 'failed', code });
    }
  }

  return outcomes;
}
