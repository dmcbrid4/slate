# Phase 0 — local mock prototype

## Scope and source of truth

Read [the full Slate brief](../prompt.md) before changing product scope. This implementation serves the Phase 0 evaluation loop: yesterday, today, tomorrow, and the next thing you follow. Phase 1 has not started.

The original repository contained only a README and the brief. There was no framework, application, test suite, provider integration, or canonical data model to preserve.

## Implementation choices

- Next.js App Router, React, strict TypeScript, and a small CSS design system. No UI component library is needed for this prototype’s native links, buttons, inputs, and disclosure controls.
- One local client experience, with validated hash-addressed views for scoreboards, Search, Following, and events. Links work on reload and browser back/forward; score/date selection lives in the URL. Event links retain their originating scoreboard, and the primary Scores tab returns to the most recently opened destination and day. Route changes focus the main content and restore visited scroll positions.
- Fixtures are frozen to a fictionalized September weekend, anchored at `2026-09-06T20:42:00Z`. Dates group by the browser’s timezone, including fixtures that cross midnight UTC. A small label keeps the mock state explicit.
- Temporary discriminated fixture types describe the four score presentations. These are UI fixtures, not a canonical schema, provider interface, or persistence model.
- For You deduplicates event IDs before display. Direct team/player follows come first; broad tennis and NFL follows get compact sections. Other Premier League results use an expandable disclosure. NFL remains a complete **mock** daily slate, not a claim of real league coverage.
- The followed rail can scroll independently and keeps its active destination centered without moving the document. Full-page horizontal swipes only change followed destinations; vertical scrolling, short taps, multi-touch gestures, and rail-edge swipes are ignored. Date changes use explicit controls. Accessible up/down buttons reorder follows without requiring drag-and-drop; For You stays pinned.
- Yesterday, Today, and Tomorrow remain three equal date controls on every scoreboard. The selected day has the strongest state, while Today retains a quiet anchor marker when another day is open. Visible dates use the viewer's local calendar, semantic time elements expose machine-readable dates, and accessible labels provide the full date.
- Search spans a curated local set of teams, players, a tournament, competitions, and the unified ATP/WTA collection. Following an entity updates the rail and aggregate feed immediately.
- One US Open destination combines men’s and women’s singles. Its order of play groups matches by court and start time, with All / Men / Women as secondary filters. Draws, rankings, qualifying, and doubles are deferred.
- Sport-specific components share small foundations. Soccer has goal scorers; tennis has per-set games, points, and server; baseball has occupied bases, outs, counts, and a line score; football has possession, down/distance, and quarter totals.
- Context is a fixture string of at most one short sentence, included only when useful. No model calls or text-generation service.
- Near-monochrome light/dark themes, tabular score numerals, quiet metadata, subtle dividers, and colored monogram/country-code marks. Marks are local placeholders, not official team crests.
- Only follows/order/theme use localStorage, with in-memory fallback when unavailable. No account or user backend exists.
- Manifest, PNG/SVG icons, Apple touch icon, standalone metadata, and safe-area support are included. There is no service worker or offline-score caching. Full installation validation is deferred.

## Verification

Typecheck, ESLint, Node tests, and a production build are configured. Tests cover deduplication, direct-follow relevance, combined tennis, all sport/status combinations, local-date grouping, daylight-saving boundaries, reordering, swipe directions, route validation, malformed storage, and fixture score consistency.

The app was verified to compile and return HTTP 200 from its local development server. Browser QA covers 320px, 390px, and 430px mobile viewports; the following checklist remains useful for evaluation on a physical phone.

## Evaluate on a phone

1. Open For You at approximately 390px wide. Can you read both teams and the live state without opening a card? Does the first screen contain enough useful information?
2. Tap Yesterday, Today, and Tomorrow, then swipe through follows. Check that dates stay selected, vertical scrolling remains natural, and event taps still open details.
3. Open ATP/WTA, then US Open. Compare the combined court schedule with All / Men / Women. Is the tournament the obvious organizing object?
4. Check tennis point and server visibility, MLB bases/outs, soccer time, and NFL possession/down/distance in both themes.
5. Search for Alcaraz and follow him. Confirm his match moves to the personal section without duplicating the US Open event. Remove Tottenham while keeping Premier League and verify its event remains through the league follow.
6. Move a follow up/down, leave Following, and reload. Confirm the rail order persists. Remove all follows and try the empty state; restore starter follows afterward.
7. Open an event far down the feed, then use Back to scores and browser Back. Check retained date, destination, and scroll position.
8. Check at 320px, desktop width, and 200% text zoom. Try keyboard navigation, focus rings, and a screen reader. Tables may scroll horizontally on small screens.

## Yahoo comparison review

At a 390 × 844 mobile viewport, Slate reaches followed destinations, Yesterday / Today / Tomorrow, and sport-specific live state within the first screen. Yahoo Sports' public web experience puts the same score-checking task among broad sport navigation, news, fantasy, video, betting information, promotions, and advertising. For the narrow job in the brief, Slate already feels cleaner and more direct.

The review found no missing core flow. The final Phase 0 correction pass should only reassess swipe discoverability, first-viewport density at 320px and 390px, and whether placeholder monograms materially impede recognition. Production data trust, freshness, and coverage remain outside Phase 0.

## Next small iteration

Run the bounded final-corrections pass from the comparison review, then complete final validation and handoff. Stay in Phase 0 until this core loop feels convincing.
