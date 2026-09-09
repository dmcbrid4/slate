import type { OwnerId, ProviderId } from '../domain/ids.ts';
import type { DomainGraph, ProviderEntityMapping } from '../domain/model.ts';
import type { NormalizationBatch } from './normalization.ts';

export interface ScoreboardRepository {
  readGraph(ownerId: OwnerId): Promise<DomainGraph>;
}

/** The ingestion-facing companion to the read repository. */
export interface NormalizationWriteRepository {
  writeNormalizationBatch(batch: NormalizationBatch): Promise<NormalizationWriteResult>;
}

export interface ProviderMappingRepository {
  readProviderMappings(providerId: ProviderId): Promise<readonly ProviderEntityMapping[]>;
}

export interface StaleLiveEvent {
  readonly eventId: string;
  readonly providerEntityId: string;
}

/** Finds events a provider still reports as `'live'` in our own store but has stopped refreshing - the signal that they likely ended without ever being observed as `final`. */
export interface StaleLiveEventRepository {
  findStaleLiveEvents(providerId: ProviderId, olderThan: string, limit: number): Promise<readonly StaleLiveEvent[]>;
}

export type NormalizationRepository = NormalizationWriteRepository & ProviderMappingRepository & StaleLiveEventRepository;

export type NormalizationWriteResult =
  | { readonly status: 'accepted'; readonly observedAt: string }
  | { readonly status: 'stale'; readonly observedAt: string; readonly eventIds: readonly string[] };
