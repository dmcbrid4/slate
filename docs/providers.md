# Provider boundary

Status: Phase 1 architecture decision implemented through task #25. No real provider is selected or integrated in this phase.

## Required flow

```text
external response
  → provider decoder
  → provider-specific typed payload
  → normalizer
  → canonical batch
  → repository transaction
  → scoreboard read model
```

Fetching, decoding, normalization, persistence, and presentation are separate responsibilities. A provider client may change without changing the domain or UI, and a provider schema change should fail at its decoder rather than leak into components.

## Contracts

The first implementation should define contracts with this responsibility split:

```ts
interface ProviderDecoder<TPayload> {
  parse(input: unknown): TPayload;
}

interface ProviderNormalizer<TPayload> {
  normalize(payload: TPayload, context: NormalizationContext): NormalizationBatch;
}

interface NormalizationContext {
  providerId: string;
  observedAt: string;
  mappings: ProviderMappingReader;
}

interface NormalizationBatch {
  records: CanonicalWrite[];
  mappings: ProviderEntityMapping[];
  warnings: NormalizationWarning[];
}
```

These are architectural shapes, not frozen method names. The important rules are that the decoder accepts `unknown`, runtime validation happens before normalization, and the normalizer emits only canonical write commands and mappings.

Network clients are provider-specific and return raw `unknown` data plus transport metadata. They do not construct canonical records. Normalizers do not perform network requests or write directly to PostgreSQL.

## Mapping resolution

Normalization resolves identity in this order:

1. Look up the provider external identity in `ProviderEntityMapping`.
2. Reuse the mapped Slate ID when it exists.
3. Create a Slate-owned canonical ID only through an explicit identity policy for that entity type.
4. Persist the canonical record and mapping in the same transaction.

A normalized event references canonical participant, competition, and season IDs. It never retains a provider object for later frontend interpretation.

Provider mappings may be many-to-one. The ATP and WTA competition records for one US Open can map to distinct canonical Competitions that share the Slate `us-open` CompetitionGroup. A provider's gender split must not create separate top-level tennis products.

## Errors and partial data

Normalization has three outcomes:

- Accepted: valid canonical records can be written.
- Accepted with warnings: optional data is missing, but Slate can truthfully represent the event.
- Rejected: identity, status, timestamp, participant, or required score state is invalid or unknown.

Warnings and rejections use structured codes. They are logged at the ingestion boundary and are not displayed as invented score values. Missing optional data remains absent. The read model decides whether a supported degraded presentation is possible.

Provider observation timestamps travel with a normalization batch. Freshness is exposed through read models independently from event status, allowing Slate eventually to say that a live score is stale without changing it to a fabricated state.

## Idempotency and updates

- Reprocessing the same provider observation must not create duplicate canonical records.
- An external event mapping identifies the existing Slate Event for updates.
- Older observations must not overwrite newer accepted state.
- Final events should remain stable unless a provider supplies a newer correction.
- Repository writes for one normalized batch are atomic.

Detailed cross-provider conflict resolution is deferred until Slate actually uses more than one source for the same event.

## Mock adapter first

Phase 1 should prove the boundary with a small mock-provider payload kept separately from the canonical seed. It must normalize representative scheduled, live, and final events for all four sports, including:

- one ATP event and one WTA event grouped into one US Open;
- a Tottenham event whose participant identity survives competition changes;
- an MLB event with inning/base/count state;
- an NFL event with possession and down/distance.

The mock adapter is a contract test fixture. It is not a disguised real provider integration and must not invent an external vendor's fields.

The implementation lives under `src/providers/mock`. Its `slateKey` is an explicit deterministic identity policy available only to this invented adapter; it is not part of the provider-neutral contracts and does not imply that a real vendor supplies Slate IDs. Existing `ProviderEntityMapping` records always take precedence. The normalizer is pure: it performs no fetches and no writes, and returns one observation-stamped batch for a future repository transaction.

## Boundary tests

Tests must prove:

- malformed and unknown payloads fail at runtime validation;
- provider status values map to canonical statuses in one place;
- canonical IDs are independent from provider IDs;
- repeated normalization is idempotent;
- ATP and WTA competitions resolve to one US Open CompetitionGroup;
- sport-state discriminants match their Events;
- optional missing data remains missing;
- provider observation ordering prevents stale overwrites;
- provider-specific types are not imported by domain, read-model, or component modules.

## Deferred provider work

Phase 1 does not choose a vendor, call a sports API, set polling frequency, add secrets, or implement caching infrastructure. Provider research and the first real tennis adapter begin only after the canonical model, mock normalizer, persistence shape, and boundary tests pass review.
