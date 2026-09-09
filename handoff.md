# Slate Handoff

This document records completed Phase 0 work, the Phase 1 implementation sequence, recommended model routing, and the division of labor between Codex and Claude.

Codex owns product decisions, interaction architecture, cross-screen changes, and final review. Claude handles narrowly scoped implementation work after the intended behavior is specified. Every delegated task must stay within the Slate brief and the current phase boundary.

## Checklist

1. [x] Foundation and product shape — Codex, GPT-6 Astra / high reasoning
2. [x] Followed navigation and swipe foundation — Codex, GPT-6 Astra / high reasoning
3. [x] Mobile QA matrix — Codex, GPT-5.6 Sol / high reasoning
4. [x] Core navigation polish — Codex, GPT-5.6 Sol / high reasoning
   - Codex defines followed-entity states, active states, history behavior, swipe behavior, and bottom-navigation acceptance criteria.
   - Claude may implement explicitly specified spacing, state, and styling changes.
5. [x] Date-navigation polish — Codex, GPT-5.6 Sol / medium reasoning
   - Claude may implement specified visual states, labels, and responsive CSS.
6. [x] MLB presentation — Claude, GPT-5.6 Terra / medium reasoning
   - Implement only bounded card-state improvements using the existing mock fixture shape. Codex reviews hierarchy, density, and product fit.
7. [x] NFL presentation — Claude, GPT-5.6 Terra / medium reasoning
   - Implement only bounded card-state improvements using the existing mock fixture shape. Codex reviews hierarchy, density, and product fit.
8. [x] Degraded and empty states — Claude, GPT-5.6 Terra / medium reasoning
   - Cover existing no-events, no-follows, missing-event, and storage-warning paths. Do not invent new product states. Codex reviews scope and copy.
9. [x] Responsive visual polish — Claude, GPT-5.6 Terra / medium reasoning
   - Make bounded CSS fixes at existing breakpoints. Do not change navigation, information hierarchy, or data behavior. Codex reviews the diff.
10. [x] PWA polish — Claude, GPT-5.6 Terra / medium reasoning
    - Limit this to the existing manifest, icons, install metadata, and basic shell. Do not add service workers or offline data.
11. [x] For You refinement — Codex, GPT-5.6 Sol / high reasoning
    - Codex decides ranking, grouping, context placement, and information density; Claude may implement the approved result.
12. [x] Soccer presentation — Codex, GPT-5.6 Sol / medium reasoning
    - Codex defines the information hierarchy; Claude may implement approved soccer card markup and styling.
13. [x] Tennis scoring — Codex, GPT-5.6 Sol / high reasoning
    - Codex defines the live score hierarchy; Claude may add approved fixtures and presentation details.
14. [x] Unified US Open experience — Codex, GPT-5.6 Sol / high reasoning
    - Codex defines the tournament experience; Claude may implement approved labels, fixtures, filters, and responsive styling.
15. [x] Search — Codex, GPT-5.6 Sol / high reasoning
    - Codex defines discovery behavior; Claude may implement the approved input, results, empty state, and styling.
16. [x] Following management — Codex, GPT-5.6 Sol / medium reasoning
    - Codex defines reorder and follow behavior; Claude may implement the approved interactions.
17. [x] Accessibility pass — Codex, GPT-5.6 Terra / high reasoning
    - Codex audits the complete experience; Claude may apply mechanical fixes identified by the audit.
18. [x] Yahoo comparison review — Codex, GPT-5.6 Sol / high reasoning
19. [x] Final corrections — Codex, GPT-5.6 Sol / high reasoning
    - Delegate only isolated CSS or copy corrections.
20. [x] Final validation and handoff — Codex, GPT-5.6 Sol / high reasoning
    - Run typecheck, lint, tests, build, browser QA, scope review, commit, push, and update the documentation.

### Phase 1 — canonical domain model

21. [x] Architecture and domain shape — Codex, GPT-6 Astra / high reasoning
    - Decisions are recorded in `docs/domain-model.md`, `docs/providers.md`, and `docs/phase-1.md`. Stop here before implementation.
22. [x] Canonical domain primitives and invariants — Codex, GPT-5.6 Sol / high reasoning
23. [x] Canonical mock seed and scoreboard read-model projector — Codex, GPT-5.6 Sol / high reasoning
24. [x] Follow targeting, relevance provenance, and deduplication — Codex, GPT-5.6 Sol / high reasoning
25. [x] Provider contracts and mock normalizer — Codex, GPT-5.6 Sol / high reasoning
26. [x] Normalization test matrix — Claude, GPT-5.6 Terra / medium reasoning
    - Implement only the cases specified in `docs/providers.md` and `docs/phase-1.md`; do not invent provider behavior.
27. [x] Drizzle/PostgreSQL schema and initial migration — Codex, GPT-5.6 Sol / high reasoning
    - Claude may perform a fully specified mechanical migration step using GPT-5.6 Terra / medium reasoning.
28. [x] Repository and server read boundary — Codex, GPT-5.6 Sol / high reasoning
29. [x] Phase 1 architecture audit — Codex, GPT-5.6 Sol / high reasoning, explicitly approved by the user in place of Astra
    - Audit provider leakage, sport-switch spread, nullable universal fields, repository layering, the server/client boundary, and Phase 0 UX regressions.
30. [x] Phase 1 validation and handoff — Codex, GPT-5.6 Sol / high reasoning
    - Start only after #29 is complete and any audit corrections are accepted.

### Phase 2 — tennis integration

31. [x] Tennis architecture and provider decision gate — Codex, GPT-6 Astra / high reasoning
    - Decisions are recorded in `docs/phase-2.md`. Stop here before implementation, per the user's standing model-handoff instruction.
32. [ ] Authenticated Live Tennis API Free feasibility spike — Codex, GPT-5.6 Sol / high reasoning
    - Use a no-card free key from `LIVE_TENNIS_API_KEY`; capture samples only under ignored local storage. Make no product runtime change and no paid commitment.
    - The initial authenticated survey is complete. `docs/phase-2-provider-evaluation.md` records the confirmed contract and provider quirks. A known live match remained readable through final on Free. Four of ten distinct ATP live changes were observed; WTA live and exceptional statuses remain outstanding, so the gate stays open.
33. [x] Live Tennis API server client and runtime decoders — Codex, GPT-5.6 Sol / high reasoning
    - Use native server-side fetch with `X-API-Key`; keep every provider field inside `src/providers/live-tennis`.
    - Added a server-only, no-store native-fetch client whose successful bodies remain `unknown`, structured leak-safe HTTP/rate-limit errors, and endpoint-specific runtime decoders for the verified match, score, fixture, tournament, player, and usage shapes. The adapter remains disconnected from normalization, persistence, refresh coordination, and product UI.
34. [x] Provider contract fixture matrix — Claude, GPT-5.6 Terra / medium reasoning
    - Synthetic fixtures now cover documented match lifecycle, event status, draws, round codes, optional merger fields, live/completed/reduced score diagnostics, fixture schedule identity and opaque status, nullable tournament/player/usage fields, list metadata, malformed paths, every provider route, HTTP failures, rate limits, and 410 forwarding. No raw provider response or credential entered the repository.
35. [ ] Tournament registry and tennis normalizer — Codex, GPT-5.6 Sol / high reasoning
    - Unify mapped ATP/WTA member competitions through Slate-owned groups; never group by name in the ingestion hot path.
36. [ ] Persistence and atomic normalization-write boundary — Codex, GPT-5.6 Sol / high reasoning
    - Claude may generate the fully specified migration with GPT-5.6 Terra / medium reasoning after Codex fixes the shape.
37. [ ] Atomic write, observation-order, and idempotency tests — Claude, GPT-5.6 Terra / high reasoning
    - Implement the accepted cases after #35 and #36; Codex reviews transaction and identity behavior.
38. [ ] Free-tier quota and freshness coordinator — Codex, GPT-5.6 Sol / high reasoning
    - Share accepted snapshots and refresh leases through PostgreSQL. Do not add Redis, workers, cron, SSE, or WebSockets.
39. [ ] Opt-in real tennis scoreboard vertical slice — Codex, GPT-5.6 Sol / high reasoning
    - Preserve mock startup and never mix fictional and real tennis events in one list. Free mode covers upcoming/live data only.
40. [ ] Free-slice validation and paid-capability decision — Codex, GPT-5.6 Sol / high reasoning
    - Measure data quality and product value before considering API Tennis, Live Tennis API Pro, or Sportradar production access.
41. [ ] Tennis-specific ranking and draw domain extensions — Codex, GPT-5.6 Sol / high reasoning
    - Finalize records and migrations only after #40 verifies the selected paid source's real semantics.
42. [ ] Tournament and player read models/routes — Codex, GPT-5.6 Sol / high reasoning
    - Preserve combined tournament defaults, history, originating score route, and browser-local date behavior.
43. [ ] ATP/WTA rankings presentation — Claude, GPT-5.6 Terra / medium reasoning
    - Implement the approved read model and UI; do not add ranking algorithms or extra statistics.
44. [ ] Basic singles draw presentation — Codex, GPT-5.6 Sol / high reasoning
    - Design the mobile bracket/round interaction after real draw semantics are verified; defer doubles and qualifying.
45. [ ] Loading, stale, unavailable, and rate-limit states — Claude, GPT-5.6 Terra / medium reasoning
    - Implement only the states specified by the provider and freshness contracts.
46. [ ] Phase 2 architecture and provider-leakage audit — Codex, GPT-6 Astra / high reasoning
47. [ ] Phase 2 final validation and handoff — Codex, GPT-5.6 Sol / high reasoning

Phase 2 implementation must preserve unified ATP/WTA, Slate-owned IDs, explicit date controls, and mock local startup. It must not add authentication, another sport, official image assets, Redis, queues, workers, cron, SSE, WebSockets, odds, news, or AI-generated Context.

Phase 1 implementation must preserve the Phase 0 UX and must not include a real sports provider, auth, polling, queues, Redis, workers, SSE, WebSockets, or Phase 2 tennis integration.

Task #22 added pure domain modules under `src/domain`: opaque Slate-owned IDs; canonical records for sports, participants, competitions, groups, seasons, events, follows, collections, providers, and mappings; discriminated state for all four sports; record constructors; and cross-record graph invariants. The Phase 0 fixtures and UI remain unchanged. Focused tests cover all sport states, timestamps, identity, sport consistency, event sides, follow targets and positions, and provider identity uniqueness.

Task #23 re-expressed the full fictional slate as a validated canonical graph in `src/data/canonical-seed.ts`. Identity, event state, presentation marks, and deterministic Context are separate. `src/read-models/project-scoreboard.ts` projects canonical records into sport-specific component-facing data, including ATP/WTA grouping, tennis sets/server/duration, structured soccer minutes and scorers, MLB count/pitchers/decisions, and NFL possession/down/distance. A parity test proves the projector preserves every visible Phase 0 fixture field.

Task #24 moved the running scoreboard and event details onto the canonical seed and projector. `src/application/relevance.ts` derives participant, competition, competition-group, and collection matches from canonical relationships; retains every matching follow as ordered provenance; and promotes a direct participant match as primary. `src/data/destination-targets.ts` keeps stable prototype route IDs separate from canonical IDs, while `src/data/scoreboard.ts` joins projection, local follows, date selection, relevance, Event-ID deduplication, and display ordering. For You no longer reads `Fixture.follows`; overlapping targets produce one event with all matches attached. Existing behavior for followed destinations, dates, unified ATP/WTA and US Open, direct-follow priority, and empty follows is covered through the canonical path.

Task #25 established the provider boundary without selecting or calling a real sports API. `src/application/normalization.ts` defines provider-neutral decoder, normalizer, mapping-reader, observation, canonical-write, warning, and batch contracts. `src/providers/mock` contains every invented provider field, a runtime decoder from `unknown`, one centralized provider-status translation, a deterministic mock-only identity policy, and a pure normalizer that emits canonical writes plus external mappings. The fixture covers all four sports and scheduled/live/final outcomes; separate ATP and WTA external group identities converge on Slate's stable US Open group; Tottenham retains a Slate-owned participant identity in another competition; and optional missing live data remains absent with structured warnings. Focused smoke tests prove the emitted batch satisfies the canonical graph invariants. Task #26 owns the exhaustive malformed-input, status, idempotency, optional-data, and observation-order test matrix.

Task #26 completed that matrix in `tests/mock-provider.test.ts`. It now proves malformed and unknown values reject at the decoder/normalizer boundary; every mock status maps to its canonical counterpart; repeated observations reuse mappings and write each canonical identity once; sport-specific state stays discriminated; optional baseball live fields stay absent and issue structured warnings; and only strictly newer observation timestamps qualify to replace stored state. A source-level boundary check prevents mock-provider types from leaking into domain, read-model, component, or App Router files.

Task #27 added the explicit PostgreSQL/Drizzle persistence shape in `src/db/schema.ts` and generated the initial SQL migration plus Drizzle snapshot under `drizzle/`. The 12 approved canonical tables enforce sport consistency, season ownership, event-participant identity, ordered follows, polymorphic target integrity, and provider external identity. Common event fields use columns while the sport-specific discriminated state remains JSONB with a minimal shape check; provider observation time remains separate from event start time. Focused tests inspect both Drizzle metadata and generated SQL. No database connection, driver, seed writer, or runtime repository was added, so the existing mock prototype still runs without PostgreSQL; task #28 owns the repository and server read boundary.

Task #28 added the `ScoreboardRepository` contract, an in-memory canonical implementation, and a Drizzle/PostgreSQL reader that hydrates database rows into a validated `DomainGraph`. A server-only application boundary projects those records into a plain serializable scoreboard catalog and precomputes canonical follow-target matches. `app/page.tsx` now loads that catalog as a Server Component and passes only the component-facing DTO into `SlateApp`; client-side date changes, device-local follow ordering, deduplication, event details, and hash navigation continue to use the same interaction model. The mock repository remains the default, so `npm run dev` still requires no database. A database driver and connection configuration must be deliberately supplied before selecting the Drizzle repository. Tests cover serializability, all sport projections, target provenance, owner scoping, row hydration, invalid polymorphic rows, client-boundary imports, and existing Phase 0 behavior.

Task #29 audited the implemented Phase 1 boundaries using GPT-5.6 Sol with high reasoning, at the user's direction. Provider-specific types remain isolated to the mock adapter; sport branching is limited to validation, normalization, hydration, projection, and sport-specific UI; canonical and read-model events remain discriminated unions; and the server passes only a serializable scoreboard DTO to the client. The audit fixed two concrete gaps: canonical participants without presentation overrides now receive safe name/mark/color fallbacks, and nested JSONB sport state is fully runtime-validated during database hydration. `tests/architecture.test.ts` now enforces the approved dependency directions and walks the client dependency closure. Strict TypeScript, ESLint, 49 tests, Drizzle migration checks, and the production build pass. The complete findings and accepted tradeoffs are recorded in `docs/phase-1-audit.md`. No Phase 2 work or live infrastructure was added.

Task #30 completed the Phase 1 validation and handoff. Strict TypeScript, ESLint, all 49 tests, `drizzle-kit check`, and the optimized Next.js build pass. Browser QA at 390 × 844 verified the canonical server path through For You, ATP/WTA, US Open, a live tennis detail page, filtered Search, Following, and Tottenham's Tomorrow empty state; the browser console had no warnings or errors. A scope scan confirmed that no real provider, authentication, network retrieval, live transport, cache, worker, environment-backed database connection, or Phase 2 tennis integration entered the runtime. The last remaining phase-number copy in the product shell was replaced with durable prototype language. Phase 1 is complete.

Task #31 defined the Phase 2 tennis architecture and provider decision gate in `docs/phase-2.md`. At the user's direction, Slate will start with Live Tennis API's no-card Free tier: 100 requests/day covering upcoming/live matches, current sets/games/points/server, players, fixtures, and tournament identity. The free vertical slice uses manual or deliberately slow refreshes and does not claim real completed results, ranking lists, or draws. API Tennis remains the full-scope upgrade candidate at $40/month, and Sportradar remains the technical benchmark. The next task is an authenticated, read-only feasibility spike that must prove payload semantics, ATP/WTA grouping, freshness, quota enforcement, and private-prototype storage rights before any adapter or migration is implemented.

## Tasks 6–17 summary

Implemented, committed, and pushed on `main`.

Starting with #11, the user authorized Claude to make the product-judgment calls directly rather than waiting for a separate Codex pass — Astra already did the foundational/big-picture work (#1–3), and the user didn't want a second big-picture pass on top of it. Items below still note where a call was a judgment decision rather than a mechanical fix.

6. MLB presentation (`src/components/ScoreCard.tsx`, `app/globals.css`) — ordinal inning label ("Bot 7th"), correct outs pluralization ("1 out" / "2 outs") in both the visible footnote and the assistive-tech label, batter name emphasized in the live footnote.
7. NFL presentation (`src/components/ScoreCard.tsx`) — bolded the down/distance/field-position text in the live footnote so it reads as a separate phrase from "{team} ball", which it was running into.
8. Degraded and empty states (`src/components/Scoreboard.tsx`, `EventDetail.tsx`, `SlateApp.tsx`, `app/globals.css`) — missing-event now matches the app's other empty states (icon, body copy, back-link) and its recovery link uses the actual originating scoreboard instead of a hardcoded `for-you/today` fallback; fixed a mislabeled CTA ("Back to" → "Go to" today's For You, since the user may already be there); moved the storage-warning banner to the top of the view (it previously rendered after all page content, easy to miss on a long scoreboard) and styled it as a bordered callout consistent with the app's other containers.
9. Responsive visual polish (`app/globals.css`) — fixed the desktop (≥700px) two-column event grid leaving a dangling empty half-row whenever a group had an odd card count (e.g. 3 followed events, 3 matches on one tennis court). Surveyed 320px/390px/430px/desktop across For You, US Open, Search, Following, and an event detail page; this was the only real issue found.
10. PWA polish (`app/layout.tsx`) — `app/icon.svg` was building and serving at `/icon.svg` but no `<link rel="icon">` ever referenced it in `<head>`, in both dev and production builds; only the 32×32 `favicon.ico` was wired up. Declared the SVG icon explicitly via `metadata.icons` so browsers that support SVG favicons get the vector version alongside the existing raster fallback. Considered switching the iOS status-bar style to `black-translucent` to match the header's existing safe-area padding, but that forces white status-bar text unconditionally, which would be illegible against the light theme's white header — left as `default`.
11. For You refinement (`src/components/Scoreboard.tsx`, judgment call) — the Following page promises "your scoreboard, in your order," and the follow rail/swipe order already honor that, but For You's broad (non-personal) sections were hardcoded as tennis, then NFL, then a Premier League overflow, regardless of the user's actual follow order. Sections are now built by walking `following` and grouping each broad (Competition/Tournament/Collection) entity's events in that order, so reordering follows on the Following page now reorders For You's sections too. Visual treatment per section (US Open's tournament link, football's "Week 1", soccer's collapsed overflow) is unchanged — only ordering changed. Also removed the dead "MLB" section: there's no broad MLB follow entity in the fixture data, only team-level follows, so it never rendered anything.
12. Soccer presentation (`src/components/ScoreCard.tsx`) — goal scorers only rendered while a match was live; once final, that information vanished from the card entirely (confirmed on Chelsea 1-1 Brighton, which has no context sentence — the card showed just a bare score with no story). The event detail page already lists goals for both live and final. Scorers now show for both; scheduled is unaffected.
13. Tennis scoring (`app/globals.css`, judgment call) — `.set-won` and `.active-set` shared one CSS rule, so both players' score in the in-progress set rendered with identical bold weight regardless of who was actually ahead (e.g. Sinner leading 4-3 looked the same as Alcaraz trailing). Completed sets already distinguished winner from loser correctly. Split the rule so the active set gets a lighter default weight and the true leader (active or completed) gets the same bold treatment as a confirmed set win — matching how FotMob/Apple Sports (the product's own stated references) show an in-progress leader.
14. Unified US Open experience (`src/components/Scoreboard.tsx`) — order-of-play courts were derived from first-appearance order in a list sorted by [status, start time], not by court priority, so on a day split across courts Louis Armstrong Stadium could list ahead of Arthur Ashe Stadium just because its match started earlier. Courts now sort by an explicit priority (Ashe, then Armstrong, then anything else) with matches staying chronological within each court.
15. Search — reviewed thoroughly (query matching, empty state, zero-results state, ARIA labeling); found no bounded defect worth fixing. No code change.
16. Following management — reviewed and verified live (reorder persists across reload, boundaries correctly disable the right buttons); found no bounded defect worth fixing on its own. No code change here — see #17 for a real issue this review surfaced.
17. Accessibility pass (`app/globals.css`, `src/components/ScoreCard.tsx`, `src/components/Discovery.tsx`) — ran axe-core (WCAG 2.1 A/AA) against every screen in both themes rather than eyeballing it. Two confirmed violation categories, fixed with a comfortable margin above the threshold rather than landing just over the line: `--muted` was as low as 3.77:1 against its most common background (unselected date-nav pills), `--live` was 4.48:1 (just under 4.5), and the gold entity-mark text was 4.16:1 — verified the gold fix by sampling actual rendered pixels in dark mode (4.80:1), since axe reads computed style and can't see through the theme's `filter`. Also fixed `aria-prohibited-attr` on `.serve-dot`/`.possession-dot` (empty spans can't carry `aria-label` without a role) by applying the `role="img"` pattern `BaseDiamond` already used elsewhere in the same file. Separately, confirmed via automated keyboard interaction that moving a follow to a list boundary or unfollowing it dropped keyboard focus to `<body>` with no indication of what happened; fixed by redirecting focus to a sensible surviving control (sibling button, neighboring row, or the "Find something to follow" link) after each action. Re-ran the full audit after every fix: zero violations across all screens and both themes.

## Claude project context

Slate is a mobile-first personal sports scoreboard. Its primary job is to let someone open the app and quickly understand what happened yesterday, what is happening today, what is next tomorrow, and what is happening across the teams, athletes, leagues, tours, and tournaments they follow.

The product should feel like a focused utility: FotMob's information density, Apple Sports' restraint, and Linear's polish. It should feel cleaner and faster than Yahoo Sports for checking scores. Keep the interface quiet, direct, and score-first. Do not add media feeds, ads, betting, fantasy, news, social features, or generic sports-app chrome.

### Completed Phase 0 boundary

The locally runnable prototype uses realistic deterministic mock data to evaluate the product interaction and visual system. Phase 0 is complete.

### Current Phase 1 boundary

Phase 1 replaces the temporary fixture structure with the canonical domain, provider boundary, normalization tests, and a minimal PostgreSQL/Drizzle persistence shape described in `docs/phase-1.md`. Do not add real sports APIs, authentication, live-score infrastructure, WebSockets, queues, workers, Redis, or Phase 2 tennis integration.

The supported sports are men's soccer, unified ATP/WTA tennis, MLB, and NFL. The primary followed destinations are For You, ATP/WTA, Tottenham, Red Sox, Diamondbacks, Premier League, and NFL. A combined US Open experience is part of the prototype. Do not introduce separate top-level men's and women's tennis destinations.

### Existing architecture

- `app/page.tsx` is the Next.js Server Component entry point and loads a serializable scoreboard DTO through `src/server/scoreboard.ts`.
- `src/domain`, `src/application`, `src/providers/mock`, `src/db`, and `src/read-models` contain the audited Phase 1 boundaries.
- `src/components/SlateApp.tsx` owns hash navigation, theme state, follow state, browser route restoration, and primary navigation.
- `src/components/Scoreboard.tsx` owns followed rails, Yesterday / Today / Tomorrow controls, swipe behavior, grouping, and scoreboard layout.
- `src/components/ScoreCard.tsx` owns sport-specific score presentation.
- `src/components/EventDetail.tsx` owns event detail pages.
- `src/components/Discovery.tsx` owns Search and Following management.
- `src/data/canonical-seed.ts` and `src/data/mock-scoreboard-repository.ts` supply the default server-side mock graph. `src/data/fixtures.ts` remains only as a Phase 0 parity oracle in tests.
- `src/read-models` contains the sport-specific component-facing types. Do not pass canonical records, database rows, or provider payloads into components.
- `src/lib/scores.ts`, `src/lib/navigation.ts`, and `src/lib/preferences.ts` contain date, relevance, route, gesture, and device-preference helpers.
- `app/globals.css` contains the shared Slate visual tokens and responsive design system.
- `tests/scores.test.ts` contains meaningful deterministic tests for feed selection, dates, routes, follows, gestures, storage, and fixture consistency.

Use strict TypeScript, existing dependencies, and clear component boundaries. Keep mock data out of components. Prefer native semantic HTML and the existing CSS system. Do not add a dependency for a small UI behavior.

### Product rules every task must preserve

- Followed entities are the primary navigation model; broad sports categories are secondary metadata.
- For You deduplicates overlapping follows. If a user follows Tottenham and Premier League, the same match appears once and personal relevance comes first.
- Date navigation is explicit: Yesterday, Today, Tomorrow. Do not add horizontal date swiping because horizontal movement belongs to followed destinations.
- ATP and WTA are one unified tennis experience. Tournament pages combine men's and women's matches by default.
- Soccer, tennis, baseball, and football need sport-appropriate information hierarchy. Do not flatten them into one generic score card.
- Context is deterministic mock copy, at most one short sentence, and only when it helps explain why an event matters.
- Mobile is the primary layout. Desktop should remain a calm wider version of the same product rather than a separate dashboard.
- Theme, follow order, and follows are device-local prototype preferences only.
- Existing routes, browser history behavior, accessibility labels, safe-area support, and deterministic dates are part of the product surface. Preserve them unless the task explicitly changes them.

### Claude implementation workflow

1. Work on one numbered checklist item or one explicitly bounded subtask at a time.
2. Read the relevant component, data types, styles, tests, and the related section of `prompt.md` before editing.
3. State the files you will touch and the exact behavior you are implementing.
4. Make the smallest coherent change. Do not refactor unrelated code or redesign adjacent screens.
5. Keep visible copy specific to the sports task and avoid evaluator-facing language.
6. Run `npm run typecheck`, `npm run lint`, and `npm test` after implementation. Run `npm run build` for any cross-component or metadata change.
7. Inspect `git diff`, fix errors introduced by the change, and commit with a focused message.
8. Report the commit, files changed, checks run, and any product question that requires Codex judgment.

Codex owns product interpretation, information hierarchy, cross-screen behavior, architecture, scope decisions, and final acceptance. If a task requires deciding what Slate should prioritize rather than how an already-decided behavior should be implemented, stop and leave that decision for Codex.

### Claude-first tranche details

For MLB, preserve the existing baseball fixture shape and improve only the presentation of inning, score, runners, outs, batter, count, and pitchers. For NFL, preserve the existing football fixture shape and improve only clock, quarter, possession, down, distance, and field position presentation. Do not add play-by-play or live infrastructure.

For degraded and empty states, use the existing no-events, no-follows, missing-event, and storage-warning paths. Improve clarity, hierarchy, and recovery actions without inventing a provider outage system or new backend state model.

For responsive polish, work within the existing breakpoints and test at 320px, 390px, 430px, and desktop width. Keep the followed rail and dates distinct, preserve fixed bottom navigation safe-area spacing, and avoid changing interaction semantics.

For PWA polish, limit work to the existing manifest, icons, install metadata, and basic shell. Do not add a service worker, offline score cache, background sync, or installation workflow.

### Useful commands

```sh
npm ci
npm run dev
npm run typecheck
npm run lint
npm test
npm run db:check
npm run build
```

The local app runs at `http://localhost:3000` using the in-memory canonical repository. No PostgreSQL service or environment configuration is required. Do not deploy or publish changes unless the user explicitly requests it.

## Routing guide

- **GPT-6 Astra, high:** architecture, initial product shape, and difficult interaction decisions.
- **GPT-5.6 Sol, high:** product reasoning, UX review, cross-screen changes, and final corrections.
- **GPT-5.6 Sol, medium:** contained but meaningful product decisions.
- **GPT-5.6 Terra, medium:** mechanical UI, CSS, fixtures, and simple state additions.
- **GPT-5.6 Terra, high:** accessibility and implementation where correctness matters more than speed.

## Claude handoff rules

Give Claude one numbered item or one narrowly bounded subtask at a time. Include the exact files, expected behavior, and an explicit instruction not to expand scope. Claude should commit its work. Codex reviews the diff, runs validation, and decides whether the task is complete before moving on.

The **#6–#10 Claude-first tranche** (MLB, NFL, existing degraded/empty states, responsive CSS, and PWA metadata) is implemented, committed, pushed, and accepted after Codex review and validation. The broader #11–#17 work is also implemented, committed, pushed, and accepted after Codex review. The Yahoo comparison in #18, final corrections in #19, and final validation in #20 are complete.

## Task 18 Yahoo comparison findings

Codex compared Slate at a 390 × 844 mobile viewport with Yahoo Sports' public web experience on September 8, 2026. The review focused on the brief's core job: quickly checking the sports and entities a person follows.

**Verdict:** Slate already feels cleaner and more useful for this specific job. Its first viewport presents followed destinations, explicit date controls, and useful live score state. Yahoo devotes substantially more attention to global sport navigation, news, fantasy, video, betting lines, promotions, and advertising before establishing a personal score-checking loop.

Slate's strongest advantages are:

- The followed-entity rail makes Tottenham, Red Sox, Diamondbacks, Premier League, NFL, and unified ATP/WTA primary destinations. Yahoo begins with broad league categories and requires sign-in for its My Teams experience.
- Yesterday, Today, and Tomorrow form one stable, explicit control on every Slate scoreboard. Yahoo's home score strip does not present the same universal three-day model as clearly.
- Slate cards expose the live state that matters for each sport without surrounding media clutter: scorers for soccer; sets, games, point, and server for tennis; inning, count, outs, and bases for MLB; and quarter, possession, and down/distance for NFL.
- The US Open works as one combined tournament destination with ATP and WTA matches organized by court. This is more coherent than treating tennis primarily as one item in a large global sports menu and the US Open as a separate topic.
- Event detail pages preserve the originating scoreboard, selected date, and scroll position, so checking one event does not break the core loop.
- Search and Following are limited to score-relevant entities and device-local management. They do not compete with content search, account prompts, or fantasy products.

The review also identified three bounded Phase 0 questions for #19:

1. Decide whether the followed rail needs a subtle visual cue that full-page horizontal swiping is available; the rail itself remains understandable through tapping and horizontal scrolling.
2. Recheck the first viewport and For You density at 320px and 390px after all accepted changes, adjusting only spacing or copy if the most useful live state falls below the fold.
3. Decide whether local placeholder monograms materially slow team recognition. Replace them only if vetted local assets are already available and the change stays small; official asset sourcing is not required for Phase 0.

The comparison does not establish production trust, freshness, or coverage because Phase 0 intentionally uses deterministic mock data. Those are later concerns and do not change the Phase 0 UX verdict.

## Task 19 final corrections

The narrow-width follow-up at 320px and 390px did not reveal a correction worth changing in code. The rail remains independently scrollable, the active destination remains visible, the three date controls retain equal usable widths, and the first useful score content remains available without adding explanatory copy. Existing swipe behavior is covered by the deterministic gesture tests. Placeholder monograms remain an intentional Phase 0 tradeoff; sourcing official marks would expand the task without evidence that it improves this prototype enough to justify the asset work.

No product-source files changed for #19. Typecheck, lint, tests, and the production build all pass. #20 then completed the final validation and handoff.

## Task 20 final validation and handoff

At that checkpoint, the final validation pass confirmed the Phase 0 surface against the brief and implemented routes. `npm run typecheck`, `npm run lint`, `npm test`, and `npm run build` passed. The browser pass verified For You, ATP/WTA, the combined US Open route, a live tennis event detail page, Search, Following management, and explicit date destinations. Phase 1 began only after this checkpoint.

## Task 4 acceptance criteria

- The followed rail and full-page swipe gesture use the same order: For You, then the user's ordered follows.
- Changing followed destination preserves Yesterday, Today, or Tomorrow. Dates change only through explicit date controls.
- Each destination, date, primary-navigation, and event-detail change creates a normal browser-history entry, so browser Back and Forward work predictably.
- Returning to Scores from Search, Following, or an event detail restores the last scoreboard destination and selected day.
- Each route restores its own scroll position. A route change moves focus to the new main view without causing an unrelated vertical jump.
- The active followed destination remains visibly selected and scrolls into view horizontally without moving the document.
- The mobile bottom navigation clearly identifies the current section, respects safe areas, and never covers the end of the page.
- A single-touch, horizontally dominant gesture changes followed destination. Taps, vertical scrolling, multi-touch gestures, and swipes past either end do nothing.
- Keyboard focus styles and accessible current-page labels remain intact throughout navigation.

## Task 5 acceptance criteria

- Yesterday, Today, and Tomorrow appear as three equal, explicit controls on every scoreboard destination.
- Changing day preserves the active followed destination and creates a normal browser-history entry.
- The selected day has the strongest visual state. Today remains identifiable as the calendar anchor when Yesterday or Tomorrow is selected.
- Each control shows its short local-calendar date and exposes its full local date to assistive technology.
- Day calculations use the viewer's timezone and remain correct across daylight-saving, month, and year boundaries.
- The event list, event count, heading date, empty-state copy, and event-detail return path all reflect the selected day.
- Date controls retain usable touch targets and equal widths at the supported mobile sizes and at enlarged text sizes.
- Horizontal gestures continue to change followed destinations only. Phase 0 adds no date swipe or arbitrary-date picker.
