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
24. [ ] Follow targeting, relevance provenance, and deduplication — Codex, GPT-5.6 Sol / high reasoning
25. [ ] Provider contracts and mock normalizer — Codex, GPT-5.6 Sol / high reasoning
26. [ ] Normalization test matrix — Claude, GPT-5.6 Terra / medium reasoning
    - Implement only the cases specified in `docs/providers.md` and `docs/phase-1.md`; do not invent provider behavior.
27. [ ] Drizzle/PostgreSQL schema and initial migration — Codex, GPT-5.6 Sol / high reasoning
    - Claude may perform a fully specified mechanical migration step using GPT-5.6 Terra / medium reasoning.
28. [ ] Repository and server read boundary — Codex, GPT-5.6 Sol / high reasoning
29. [ ] Phase 1 architecture audit — Codex, GPT-6 Astra / high reasoning if allowance permits; otherwise GPT-5.6 Sol / high reasoning
30. [ ] Phase 1 validation and handoff — Codex, GPT-5.6 Sol / high reasoning

Phase 1 implementation must preserve the Phase 0 UX and must not include a real sports provider, auth, polling, queues, Redis, workers, SSE, WebSockets, or Phase 2 tennis integration.

Task #22 added pure domain modules under `src/domain`: opaque Slate-owned IDs; canonical records for sports, participants, competitions, groups, seasons, events, follows, collections, providers, and mappings; discriminated state for all four sports; record constructors; and cross-record graph invariants. The Phase 0 fixtures and UI remain unchanged. Focused tests cover all sport states, timestamps, identity, sport consistency, event sides, follow targets and positions, and provider identity uniqueness.

Task #23 re-expressed the full fictional slate as a validated canonical graph in `src/data/canonical-seed.ts`. Identity, event state, presentation marks, and deterministic Context are separate. `src/read-models/project-scoreboard.ts` projects canonical records into sport-specific component-facing data, including ATP/WTA grouping, tennis sets/server/duration, structured soccer minutes and scorers, MLB count/pitchers/decisions, and NFL possession/down/distance. A parity test proves the projector preserves every visible Phase 0 fixture field. The UI still reads the temporary fixtures until #24 adds derived relevance and switches the data path.

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

The final validation pass confirmed the Phase 0 surface against the brief and the implemented routes. `npm run typecheck`, `npm run lint`, `npm test`, and `npm run build` all pass. The browser pass verified For You, ATP/WTA, the combined US Open route, a live tennis event detail page, Search, Following management, and explicit date destinations. The working tree is clean, `main` is pushed to `origin/main`, and no Phase 1 work was started.

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
