import type { ProviderId } from '../domain/ids.ts';
import type {
  CanonicalEvent,
  Competition,
  CompetitionGroup,
  EventParticipant,
  Participant,
  ProviderCanonicalRef,
  ProviderEntityMapping,
  Season,
} from '../domain/model.ts';

export interface ProviderDecoder<TPayload> {
  parse(input: unknown): TPayload;
}

export interface ProviderExternalIdentity {
  readonly providerId: ProviderId;
  readonly entityType: string;
  readonly externalId: string;
}

export interface ProviderMappingReader {
  find(identity: ProviderExternalIdentity): ProviderCanonicalRef | undefined;
}

export interface NormalizationContext {
  readonly providerId: ProviderId;
  readonly observedAt: string;
  readonly mappings: ProviderMappingReader;
}

export type CanonicalWrite =
  | { readonly type: 'participant'; readonly record: Participant }
  | { readonly type: 'competition_group'; readonly record: CompetitionGroup }
  | { readonly type: 'competition'; readonly record: Competition }
  | { readonly type: 'season'; readonly record: Season }
  | { readonly type: 'event'; readonly record: CanonicalEvent }
  | { readonly type: 'event_participant'; readonly record: EventParticipant };

export type NormalizationWarningCode =
  | 'missing_venue'
  | 'missing_live_detail';

export interface NormalizationWarning {
  readonly code: NormalizationWarningCode;
  readonly externalEventId?: string;
  readonly path: string;
  readonly message: string;
}

export interface NormalizationBatch {
  readonly providerId: ProviderId;
  readonly observedAt: string;
  readonly records: readonly CanonicalWrite[];
  readonly mappings: readonly ProviderEntityMapping[];
  readonly warnings: readonly NormalizationWarning[];
}

export interface ProviderNormalizer<TPayload> {
  normalize(payload: TPayload, context: NormalizationContext): NormalizationBatch;
}

export class NormalizationError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'NormalizationError';
    this.code = code;
  }
}

export function assertObservationInstant(observedAt: string): void {
  if (!/(?:Z|[+-]\d{2}:\d{2})$/.test(observedAt) || !Number.isFinite(Date.parse(observedAt))) {
    throw new NormalizationError('invalid_observation_time', 'Provider observation time must include an explicit UTC offset.');
  }
}

export function createMappingReader(mappings: readonly ProviderEntityMapping[]): ProviderMappingReader {
  const byExternalIdentity = new Map(
    mappings.map(mapping => [
      `${mapping.providerId}:${mapping.providerEntityType}:${mapping.providerEntityId}`,
      mapping.canonical,
    ]),
  );
  return {
    find(identity) {
      return byExternalIdentity.get(`${identity.providerId}:${identity.entityType}:${identity.externalId}`);
    },
  };
}
