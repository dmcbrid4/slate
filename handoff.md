# Slate Phase 0 Handoff

This document records the remaining Phase 0 work, recommended model routing, and the division of labor between Codex and Claude.

Codex owns product decisions, interaction architecture, cross-screen changes, and final review. Claude handles narrowly scoped implementation work after the intended behavior is specified. Every delegated task must stay within the Slate brief and Phase 0 scope.

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
11. [ ] For You refinement — Codex, GPT-5.6 Sol / high reasoning
    - Codex decides ranking, grouping, context placement, and information density; Claude may implement the approved result.
12. [ ] Soccer presentation — Codex, GPT-5.6 Sol / medium reasoning
    - Codex defines the information hierarchy; Claude may implement approved soccer card markup and styling.
13. [ ] Tennis scoring — Codex, GPT-5.6 Sol / high reasoning
    - Codex defines the live score hierarchy; Claude may add approved fixtures and presentation details.
14. [ ] Unified US Open experience — Codex, GPT-5.6 Sol / high reasoning
    - Codex defines the tournament experience; Claude may implement approved labels, fixtures, filters, and responsive styling.
15. [ ] Search — Codex, GPT-5.6 Sol / high reasoning
    - Codex defines discovery behavior; Claude may implement the approved input, results, empty state, and styling.
16. [ ] Following management — Codex, GPT-5.6 Sol / medium reasoning
    - Codex defines reorder and follow behavior; Claude may implement the approved interactions.
17. [ ] Accessibility pass — Codex, GPT-5.6 Terra / high reasoning
    - Codex audits the complete experience; Claude may apply mechanical fixes identified by the audit.
18. [ ] Yahoo comparison review — Codex, GPT-5.6 Sol / high reasoning
19. [ ] Final corrections — Codex, GPT-5.6 Sol / high reasoning
    - Delegate only isolated CSS or copy corrections.
20. [ ] Final validation and handoff — Codex, GPT-5.6 Sol / high reasoning
    - Run typecheck, lint, tests, build, browser QA, scope review, commit, push, and update the documentation.

## Tasks 6–10 summary

Implemented and committed on `main` (not pushed).

6. MLB presentation (`src/components/ScoreCard.tsx`, `app/globals.css`) — ordinal inning label ("Bot 7th"), correct outs pluralization ("1 out" / "2 outs") in both the visible footnote and the assistive-tech label, batter name emphasized in the live footnote.
7. NFL presentation (`src/components/ScoreCard.tsx`) — bolded the down/distance/field-position text in the live footnote so it reads as a separate phrase from "{team} ball", which it was running into.
8. Degraded and empty states (`src/components/Scoreboard.tsx`, `EventDetail.tsx`, `SlateApp.tsx`, `app/globals.css`) — missing-event now matches the app's other empty states (icon, body copy, back-link) and its recovery link uses the actual originating scoreboard instead of a hardcoded `for-you/today` fallback; fixed a mislabeled CTA ("Back to" → "Go to" today's For You, since the user may already be there); moved the storage-warning banner to the top of the view (it previously rendered after all page content, easy to miss on a long scoreboard) and styled it as a bordered callout consistent with the app's other containers.
9. Responsive visual polish (`app/globals.css`) — fixed the desktop (≥700px) two-column event grid leaving a dangling empty half-row whenever a group had an odd card count (e.g. 3 followed events, 3 matches on one tennis court). Surveyed 320px/390px/430px/desktop across For You, US Open, Search, Following, and an event detail page; this was the only real issue found.
10. PWA polish (`app/layout.tsx`) — `app/icon.svg` was building and serving at `/icon.svg` but no `<link rel="icon">` ever referenced it in `<head>`, in both dev and production builds; only the 32×32 `favicon.ico` was wired up. Declared the SVG icon explicitly via `metadata.icons` so browsers that support SVG favicons get the vector version alongside the existing raster fallback. Considered switching the iOS status-bar style to `black-translucent` to match the header's existing safe-area padding, but that forces white status-bar text unconditionally, which would be illegible against the light theme's white header — left as `default`.

## Claude project context

Slate is a mobile-first personal sports scoreboard. Its primary job is to let someone open the app and quickly understand what happened yesterday, what is happening today, what is next tomorrow, and what is happening across the teams, athletes, leagues, tours, and tournaments they follow.

The product should feel like a focused utility: FotMob's information density, Apple Sports' restraint, and Linear's polish. It should feel cleaner and faster than Yahoo Sports for checking scores. Keep the interface quiet, direct, and score-first. Do not add media feeds, ads, betting, fantasy, news, social features, or generic sports-app chrome.

### Current Phase 0 boundary

This is a locally runnable prototype using realistic deterministic mock data. Phase 0 exists to evaluate the product interaction and visual system. Do not add real sports APIs, authentication, live-score infrastructure, WebSockets, queues, workers, Redis, provider SDKs, or production data modeling. Do not begin Phase 1.

The supported sports are men's soccer, unified ATP/WTA tennis, MLB, and NFL. The primary followed destinations are For You, ATP/WTA, Tottenham, Red Sox, Diamondbacks, Premier League, and NFL. A combined US Open experience is part of the prototype. Do not introduce separate top-level men's and women's tennis destinations.

### Existing architecture

- `app/page.tsx` is the Next.js entry point and renders the client-side Slate experience.
- `src/components/SlateApp.tsx` owns hash navigation, theme state, follow state, browser route restoration, and primary navigation.
- `src/components/Scoreboard.tsx` owns followed rails, Yesterday / Today / Tomorrow controls, swipe behavior, grouping, and scoreboard layout.
- `src/components/ScoreCard.tsx` owns sport-specific score presentation.
- `src/components/EventDetail.tsx` owns event detail pages.
- `src/components/Discovery.tsx` owns Search and Following management.
- `src/data/entities.ts` and `src/data/fixtures.ts` hold mock data separately from UI components.
- `src/data/types.ts` contains temporary discriminated fixture types for the prototype. Do not turn them into a canonical production schema.
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
npm run build
```

The local app runs at `http://localhost:3000`. The repository is already configured for local-only Phase 0 work. Do not deploy or publish changes unless the user explicitly requests it.

## Routing guide

- **GPT-6 Astra, high:** architecture, initial product shape, and difficult interaction decisions.
- **GPT-5.6 Sol, high:** product reasoning, UX review, cross-screen changes, and final corrections.
- **GPT-5.6 Sol, medium:** contained but meaningful product decisions.
- **GPT-5.6 Terra, medium:** mechanical UI, CSS, fixtures, and simple state additions.
- **GPT-5.6 Terra, high:** accessibility and implementation where correctness matters more than speed.

## Claude handoff rules

Give Claude one numbered item or one narrowly bounded subtask at a time. Include the exact files, expected behavior, and an explicit instruction not to expand scope. Claude should commit its work. Codex reviews the diff, runs validation, and decides whether the task is complete before moving on.

The **#6–#10 Claude-first tranche** (MLB, NFL, existing degraded/empty states, responsive CSS, and PWA metadata) is implemented and committed. Codex should review each bounded change and run validation before accepting it. The next Codex product-reasoning task is **#11 For You refinement**.

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
