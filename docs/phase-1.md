# Phase 1 — canonical domain model

Status: implementation steps 1–7 are complete. The remaining work is the bounded architecture audit and final validation.

## Goal

Replace the temporary Phase 0 data shape with a provider-independent domain and persistence boundary while preserving the proven mobile product experience. Phase 1 ends when mock data flows through the same normalization and read-model seams that a future provider will use.

This phase does not integrate live sports data.

## Architecture decisions

- Keep React components behind sport-specific `ScoreboardEvent` read models.
- Model common Event identity separately from discriminated sport state.
- Represent teams and players as Participants joined to Events through EventParticipants.
- Use a stable CompetitionGroup to unify provider-split ATP and WTA competitions into one US Open.
- Represent ATP/WTA as a small curated Collection.
- Derive event relevance from canonical relationships and Follows; remove follow IDs from Events.
- Preserve all matched follows as provenance while deduplicating by canonical Event ID.
- Own canonical IDs in Slate and isolate every external ID in ProviderEntityMapping.
- Decode external input from `unknown`, normalize it, then persist a canonical batch atomically.
- Use PostgreSQL and Drizzle for persistence, with repositories shielding services from database rows.
- Keep one seeded owner and device-local preferences during Phase 1. Authentication remains Phase 6.
- Store common Event fields as columns and validated sport state as JSONB initially.

Detailed shapes and invariants live in [domain-model.md](./domain-model.md). Provider contracts live in [providers.md](./providers.md).

## Module boundaries

Use this direction rather than treating it as a requirement for exact filenames:

```text
src/domain/        canonical records, sport state, IDs, invariants
src/application/   relevance, normalization orchestration, read-model projection
src/providers/     provider-specific decoders and normalizers
src/db/            Drizzle schema, migrations, and repository implementations
src/read-models/   stable component-facing scoreboard and detail shapes
src/components/    presentation only
```

Dependencies point inward: components may depend on read models; application services may depend on domain records and repository contracts; provider and database modules implement outer-boundary contracts. Domain modules do not import React, Next.js, Drizzle, or provider code.

## Implementation sequence

1. Add pure canonical types, branded/opaque ID helpers, constructors, and invariant checks. Do not touch the UI yet.
2. Re-express the current fictional slate as canonical seed data and add a projector that produces the existing score-card read models.
3. Switch scoreboard selection to canonical relationship traversal, relevance provenance, and Event-ID deduplication. Preserve the Phase 0 behavior with parity tests.
4. Add provider contracts and a mock provider decoder/normalizer using invented fixture fields clearly labeled as mock.
5. Add the normalization test matrix, including ATP/WTA grouping, all sport states, malformed input, identity mapping, idempotency, and observation ordering.
6. Add the Drizzle PostgreSQL schema and initial migration for the approved canonical records. Keep repositories behind interfaces.
7. Add a server-side repository/query boundary and use it to build the scoreboard read model. Keep local mock startup available until a database-backed run is deliberately enabled.
8. Run an architecture audit for provider leakage, sport-switch spread, nullable universal fields, and Phase 0 UX regressions.

Each step should be a focused commit. Do not combine provider research or a real API integration with Phase 1.

## Exit criteria

- Canonical representations exist for Sport, Participant, Competition, CompetitionGroup, Season, Event, EventParticipant, Follow, Collection, Provider, and ProviderEntityMapping.
- Soccer, tennis, MLB, and NFL event state is type-safe and validated.
- ATP and WTA records can normalize into one user-facing US Open group.
- Tottenham remains one Participant across multiple competitions.
- For You relevance is derived, deduplicated, ordered, and carries match provenance.
- No React component imports provider types or database rows.
- A mock provider payload passes through runtime decoding and canonical normalization.
- PostgreSQL schema and migrations preserve the domain invariants that belong in storage.
- Phase 0 routes and presentation continue to pass their existing tests and browser checks.
- Typecheck, lint, tests, and production build pass.

## Model routing

- Architecture and final audit: GPT-6 Astra, high reasoning.
- Canonical types, relevance, normalization, schema, and repository implementation: GPT-5.6 Sol, high reasoning.
- Fully specified fixtures, migrations, and test cases: GPT-5.6 Terra, medium reasoning, with Codex review.
- Mechanical renames or import moves: GPT-5.6 Luna, low or medium reasoning when available.

## Scope guardrails

Do not add a real provider, authentication, user registration, background jobs, Redis, queues, polling, SSE, WebSockets, standings, rankings, draws, news, or production deployment. Do not broaden sports coverage. Do not redesign the Phase 0 UI unless migration reveals a concrete incompatibility.
