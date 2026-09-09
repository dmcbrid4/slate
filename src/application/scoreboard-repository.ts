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

export type NormalizationRepository = NormalizationWriteRepository & ProviderMappingRepository;

export type NormalizationWriteResult =
  | { readonly status: 'accepted'; readonly observedAt: string }
  | { readonly status: 'stale'; readonly observedAt: string; readonly eventIds: readonly string[] };
