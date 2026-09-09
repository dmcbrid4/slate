# Phase 1 architecture audit

Status: complete on September 9, 2026. The architecture is fit for the current Slate scope and ready for the separate Phase 1 validation task.

## Audit scope

This review checked the completed canonical-domain work against the product brief, with particular attention to provider leakage, repeated sport branching, universal nullable fields, repository layering, the server/client boundary, and preservation of the Phase 0 product experience.

The review covered `src/domain`, `src/application`, `src/providers`, `src/db`, `src/read-models`, the server composition root, the client dependency closure, the migration, and the deterministic test suite. It did not select a real provider or add production infrastructure.

## Findings

| Area | Result | Evidence |
| --- | --- | --- |
| Provider isolation | Pass | Invented upstream fields and status values exist only in `src/providers/mock`. Domain records, read models, components, and App Router modules do not import provider types. Runtime input enters the decoder as `unknown`. |
| Sport-specific behavior | Pass | Sport branching is concentrated in domain validation, provider normalization, database hydration, read-model projection, and sport-specific presentation. Generic identity, relevance, follow targeting, deduplication, repository selection, and server loading do not switch across sports. |
| Canonical shape | Pass | `CanonicalEvent` and `ScoreboardEvent` are discriminated unions. PostgreSQL stores common event fields as columns and sport state as JSONB, avoiding one event table filled with nullable fields for unrelated sports. Optional fields represent genuinely optional concepts such as venue, country, live count, or branding. |
| Repository layering | Pass | `ScoreboardRepository` is application-owned. The memory and Drizzle implementations sit outside the contract, and `buildScoreboardData` consumes the contract without knowing which implementation supplied the graph. |
| Server/client boundary | Pass | `app/page.tsx` calls the server-only loader. Projection and canonical follow matching finish before React crosses into `SlateApp`; the client receives a plain serializable `ScoreboardData` value with no rows, mappings, Maps, or provider payloads. |
| Phase 0 behavior | Pass | The canonical projector retains exact visible-fixture parity, and existing tests continue to cover followed destinations, date navigation, For You ordering and deduplication, unified ATP/WTA and US Open, routes, preferences, gestures, and all four sport presentations. The audit made no intentional UI change. |

## Corrections made during the audit

Two issues warranted code changes:

1. The projector required an entry in the mock presentation map for every participant. A valid database-only participant could therefore fail before reaching the UI, even though the domain explicitly allows missing marks. Participant presentation overrides are now optional; the projector falls back to canonical names, country codes or initials, and neutral styling. Existing mock output remains unchanged.
2. Drizzle's JSONB `$type` annotation supplied compile-time types but did not validate nested values read at runtime. Malformed stored score state could throw an incidental JavaScript error or pass shallow checks. Domain validation now checks the nested shape and bounded values for soccer, tennis, baseball, and football before a hydrated graph is accepted.

The audit also added an executable layer-direction test. It verifies the approved imports for domain, read-model, application, provider, and database modules, then walks the `SlateApp` dependency closure to ensure server, database, provider, and canonical-seed modules cannot enter the client bundle.

## Accepted Phase 1 tradeoffs

- The memory repository remains the default. The Drizzle repository accepts an injected PostgreSQL-compatible database, but Slate intentionally has no driver, credentials, environment configuration, or database startup requirement yet.
- The Drizzle reader loads the small canonical graph in one bounded repository call and filters follows by owner. Date-window and event-detail queries should be added when real data volume creates that need; building them before provider integration would add speculative complexity.
- Follow choices and ordering remain device-local in the interactive prototype. The canonical graph has one seeded owner so repository ownership and target relationships can be proven without starting authentication.
- Mock presentation and deterministic Context remain server-side composition data. The fallback path lets records without overrides render safely. Split presentation fixtures from the canonical seed if either becomes independently maintained; the current file is still small and deterministic.
- Phase 0 fixtures remain only as a parity oracle in tests. Production UI and server composition use the canonical projection path.

## Scope confirmation

Phase 1 contains no real sports API, provider SDK, authentication, polling, background worker, queue, cache, SSE, WebSocket, deployment configuration, standings, rankings, draws, news, or AI-generated Context. Tennis remains a unified ATP/WTA product experience and Phase 2 has not started.

## Audit verification

At audit completion, strict TypeScript, ESLint, all 49 deterministic tests, Drizzle migration validation, and the optimized Next.js production build pass. Task #30 remains the separate final Phase 1 validation and handoff checkpoint.
