# Phase 2 — tennis integration architecture

Status: architecture and free-provider plan complete. Implementation has not started.

This phase begins the first real sports integration while preserving Slate's unified ATP/WTA product model. The work stops at this document until the provider contract is verified with an authenticated trial payload.

## Product outcome

Phase 2 should make the existing tennis experience truthful and current for:

- ATP and WTA main-tour singles plus Grand Slam singles;
- Yesterday, Today, and Tomorrow;
- scheduled, live, final, postponed, suspended, retired, cancelled, and walkover outcomes;
- sets, games, current point, tiebreak state, and server when the provider supplies them;
- one combined tournament page whose gender category is a secondary filter;
- player pages with recent and upcoming matches plus current ranking;
- ATP and WTA singles rankings;
- a basic main-singles draw when reliable source data exists.

Challenger, ITF, juniors, ordinary qualifying, doubles, mixed doubles, point timelines, match statistics, odds, news, notifications, authentication, and additional sports remain outside the first Phase 2 slice. Grand Slam qualifying and doubles remain later tennis options after the main-singles flow is reliable.

### First free slice

Start with Live Tennis API's free tier. The first vertical slice covers provider-authenticated upcoming/live ATP and WTA singles, tournament and player identity, and current sets/games/points/server. It does not pretend the free tier supplies Yesterday results, full ranking lists, or brackets. The existing mock tennis experience remains available in mock mode; real mode must not fabricate missing results, rankings, or brackets, and real and fictional tennis events must never appear in the same scoreboard or tournament list.

## Provider decision gate

Provider information below was checked against official documentation on September 9, 2026. Prices, quotas, coverage, and terms must be rechecked before purchase or public deployment.

| Provider | Product fit | Current entry cost | Decision |
| --- | --- | --- | --- |
| Live Tennis API | Free includes live/upcoming matches, scores, players, fixtures, and tournament catalogue. Its score shape explicitly includes sets, games, points, and server; Basic adds results at $9.99/month. | Free is 100 requests/day with no card; Basic is $9.99/month; rank-ordered rankings require Pro at $29.99/month. No bracket endpoint appears in the documented endpoint set. | **First implementation candidate.** Use Free for a deliberately low-frequency real-score vertical slice. Make no paid commitment. |
| API Tennis | Documents tournaments, fixtures, live score, point-by-point data, server, players, ATP/WTA standings, and draw brackets. Its draw response distinguishes provider-fed and reconstructed brackets. | Starter is $40/month with 8,000 requests/day and a 14-day trial. | **Full-scope upgrade candidate.** Evaluate only after the free slice proves that real tennis materially improves Slate enough to consider exceeding the $20 soft ceiling. |
| Sportradar Tennis v3 | Documents schedules, live scores, point timelines, player profiles, rankings, and bracket structures with explicit coverage tiers. | A self-issued 30-day trial has 1,000 requests and 1 QPS. Production pricing is not publicly stated. | **Technical benchmark.** Use only if the self-serve candidates fail and production pricing/licensing can meet Slate's scale. |

Official references:

- [API Tennis plans](https://api-tennis.com/) and [endpoint documentation](https://api-tennis.com/documentation)
- [API Tennis terms](https://api-tennis.com/terms-of-use)
- [Live Tennis API plans](https://livetennisapi.com/pricing), [full API reference](https://docs.livetennisapi.com/reference.html), and [terms](https://livetennisapi.com/terms)
- [Sportradar Tennis overview](https://developer.sportradar.com/tennis/docs/tennis-ig-overview), [coverage tiers](https://developer.sportradar.com/tennis/docs/tennis-ig-data-coverage-tiers), and [trial limits](https://developer.sportradar.com/tennis/docs/ig-account-maintenance)

The first implementation task is an authenticated Live Tennis API Free spike. It must not change the running product. The quota-safe procedure and evidence checklist live in [the spike runbook](./phase-2-spike.md). A go decision requires all of the following:

1. Capture representative ATP and WTA upcoming/live singles, player, tournament, and usage payloads.
2. Confirm the live payload truthfully exposes current games, current point, server, tiebreaks, and retirement/suspension states without inference from prose.
3. Confirm player, match, and tournament IDs remain stable across fixtures, match lists, score details, players, and tournaments.
4. Confirm separate men's and women's US Open provider records can be mapped to one Slate `CompetitionGroup` without name matching in the hot path.
5. Measure visible update delay across at least ten available changes in live matches and record missing, game-only, or contradictory states.
6. Verify that a hard 80-request daily budget and the refresh policy below can be enforced using the provider's usage response.
7. Confirm the terms permit normalized storage needed to run the private prototype. Obtain written clarification before public deployment on display, caching, and attribution. Provider-supplied images remain disabled unless their rights are separately cleared.

Raw trial payloads belong in an ignored local directory such as `.local/provider-samples/`; credentials and raw responses must never be committed. Tests should use the smallest synthetic contract fixtures that preserve the observed field shapes without republishing actual results.

## Domain changes

The Phase 1 core remains intact. `Sport`, `Participant`, `Competition`, `CompetitionGroup`, `Season`, `Event`, `EventParticipant`, `Follow`, and provider mappings already express the primary tennis identities.

Extend tennis at sport-specific boundaries:

- Add normalized event metadata for discipline (`singles` initially), stage (`main` initially, then `qualifying` when enabled), and an optional structured round code alongside the truthful display label.
- Add `TennisRankingSnapshot` and ordered `TennisRankingEntry` records keyed by category, discipline, publication date, and canonical player ID.
- Add a singles-first `TennisDraw` plus ordered draw slots keyed by canonical competition and season. A slot may reference a player, Event, seed, bye, winner, and next slot. Unknown future players stay absent rather than becoming fake participants.
- Keep ranking and draw records in a tennis-specific domain module and tables. Do not add tennis columns to universal Event or Participant tables.
- Keep ATP and WTA as categories inside one tennis sport and one followed `ATP/WTA` collection. Each provider competition retains its own canonical `Competition`; paired tournament records share a Slate-owned `CompetitionGroup`.

Ranking and draw fields remain provisional through the free slice because the selected tier does not expose those complete surfaces. Do not migrate them until the later paid-capability decision verifies real semantics.

## Tournament identity policy

Provider tournament names are insufficient identity. Normalization resolves tournaments through persisted `ProviderEntityMapping` records and a small reviewed registry:

```text
provider ATP tournament ID ─┐
                            ├─ canonical member Competitions ─→ Slate CompetitionGroup
provider WTA tournament ID ─┘
```

The registry initially covers Grand Slams and the supported ATP/WTA main-tour events. Unknown or excluded tournaments produce structured out-of-scope warnings and are not silently grouped by similar names. Challenger, ITF, junior, exhibition, and team events remain excluded from the scoreboard query.

## Provider and ingestion boundaries

The runtime flow is:

```text
Slate refresh coordinator
  → provider-specific HTTP client returning unknown
  → endpoint-specific runtime decoder
  → Live Tennis API normalizer
  → atomic canonical write transaction
  → narrow scoreboard/tournament/player query
  → serializable read model
  → React client
```

Use native server-side `fetch`; the API is small enough that a provider SDK adds little value. Put all Live Tennis API paths, parameters, field names, status translations, and quirks under `src/providers/live-tennis`. The API key lives only in `LIVE_TENNIS_API_KEY`, is sent by the server in the `X-API-Key` header, and must never enter a client bundle, URL, log, or committed fixture.

Add an application-owned write contract beside `ScoreboardRepository`. Its atomic operation accepts a validated `NormalizationBatch`, upserts canonical records and mappings, and rejects an observation older than the stored `observed_at`. The Drizzle implementation owns transactions and row conversion. Provider clients and normalizers never import Drizzle or write directly.

Replace the whole-graph production read with narrow date-window, tournament, ranking, draw, and player queries before real volume is enabled. Keep `readGraph` for deterministic tests and mock mode until the cutover is complete.

## Refresh and cost policy

Browsers call Slate only. They never call the tennis provider or receive its key.

Use request-driven refresh in the first integration, with PostgreSQL holding both the last accepted data and a small provider-sync lease. The first active Slate request after a refresh deadline may fetch upstream; concurrent requests read the same accepted snapshot. This provides a shared result across several users without Redis, a queue, a worker, or a browser-per-user upstream multiplier.

The free tier is a product-development feed, not a credible 20–30-second live service. Enforce an application-side ceiling of 80 calls per UTC day so debugging and retries cannot consume the provider's full 100-call allowance.

Initial free-slice targets, subject to measured response behavior:

| Data | Refresh target |
| --- | --- |
| Live ATP/WTA singles | Manual during the feasibility spike; no faster than every 30 minutes in the first product slice |
| Upcoming fixtures | At startup when stale, then no more than every 6 hours |
| Match/player detail | From stored normalized data; one explicit provider refresh may be offered during development |
| Tournament catalogue | Daily or when an unknown tournament identity appears |
| Provider usage | Before a refresh near the local budget ceiling |
| Completed results, ranking lists, draws | Unavailable in Free; remain out of real-data mode |

A later paid plan may move included live matches toward the brief's 20–30-second target after quota math and freshness measurements support it.

Fetch a date range wide enough to cover Yesterday/Today/Tomorrow after browser-local timezone conversion. Keep the current explicit date controls and group canonical UTC instants in the viewer's timezone.

The client may poll a Slate route only while the page is visible and a current event can change. The server response includes `asOf`, provider observation time, and the next suggested refresh time. When the provider fails, return the last accepted data with freshness metadata. Never erase a score, advance a status, or invent a point because a request failed.

## Read models and routes

Preserve the existing `ScoreboardData` and sport-specific score cards. Add separate serializable read models for:

- combined tournament order of play and tournament metadata;
- a basic singles draw grouped into readable rounds;
- ATP and WTA ranking lists within one tennis experience;
- player identity, current ranking, recent results, and upcoming matches.

The existing followed destination and hash routes remain valid. Player profile and tournament subviews should retain the originating scoreboard route, selected day, browser history behavior, and scroll restoration. The tournament default remains the combined men's and women's order of play; category and future discipline filters remain secondary.

## Failure behavior

- Decoder rejection: record endpoint, observed time, and structured code without logging the key or full raw payload.
- Unknown status or identity: reject the affected record and retain the last accepted canonical state.
- Missing optional live detail: show the truthful reduced score and freshness state.
- Rate limit: honor provider reset information when available and extend Slate's next refresh time.
- Provider outage: serve the last accepted snapshot with a short stale indicator after the agreed threshold.
- No stored snapshot: show the existing bounded unavailable/empty treatment with a retry action against Slate.

## Phase 2 exit criteria

- Real ATP and WTA main-tour singles normalize through one provider boundary into Slate-owned identities.
- US Open and other paired events appear as unified tournament groups.
- Yesterday/Today/Tomorrow, player follows, deduplication, and sport-specific presentation work with real canonical rows.
- Live cards truthfully show sets, games, point, and server when covered.
- The free vertical slice proves upcoming/live scoreboards and player/tournament identity first. Full Phase 2 later adds repository-backed completed results, player pages, current rankings, and one basic singles draw after a paid-capability decision.
- Provider calls are server-only, shared, quota-aware, and resilient to stale or malformed responses.
- Mock mode stays locally runnable without credentials or PostgreSQL.
- Provider, normalization, persistence, architecture, accessibility, and browser checks pass.
- The measured provider quality and monthly cost are recorded before any paid commitment.

## Explicit exclusions

Do not add authentication, Redis, queues, background workers, cron scheduling, SSE, WebSockets, odds, betting, news, AI Context, notifications, official image assets, or another sport. Do not build point-by-point history or advanced statistics in the first Phase 2 slice. Do not select a second live provider without a separate identity and conflict-resolution review.
