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
5. [ ] Date-navigation polish — Codex, GPT-5.6 Sol / medium reasoning
   - Claude may implement specified visual states, labels, and responsive CSS.
6. [ ] For You refinement — Codex, GPT-5.6 Sol / high reasoning
   - Claude may implement approved ordering, section styling, and copy changes.
7. [ ] Soccer presentation — Codex, GPT-5.6 Sol / medium reasoning
   - Claude may implement approved soccer card markup and styling.
8. [ ] Tennis scoring — Codex, GPT-5.6 Sol / high reasoning
   - Claude may add approved fixtures and presentation details.
9. [ ] Unified US Open experience — Codex, GPT-5.6 Sol / high reasoning
   - Claude may implement approved tournament labels, fixtures, tabs, and responsive styling.
10. [ ] MLB presentation — Claude, GPT-5.6 Terra / medium reasoning
    - Codex reviews hierarchy, density, and product fit.
11. [ ] NFL presentation — Claude, GPT-5.6 Terra / medium reasoning
    - Codex reviews hierarchy, density, and product fit.
12. [ ] Search — Codex, GPT-5.6 Sol / high reasoning
    - Claude may implement the approved input, results, empty state, and styling.
13. [ ] Following management — Codex, GPT-5.6 Sol / medium reasoning
    - Claude may implement the approved reorder, follow, and unfollow interactions.
14. [ ] Degraded and empty states — Claude, GPT-5.6 Terra / medium reasoning
    - Codex reviews scope and state coverage.
15. [ ] Accessibility pass — Codex, GPT-5.6 Terra / high reasoning
    - Claude may apply mechanical fixes identified by the audit.
16. [ ] Responsive visual polish — Claude, GPT-5.6 Terra / medium reasoning
    - Codex reviews that interaction and information hierarchy remain unchanged.
17. [ ] PWA polish — Claude, GPT-5.6 Terra / medium reasoning
    - Limit this to manifest, icon, install metadata, and a basic shell already supported by the prototype.
18. [ ] Yahoo comparison review — Codex, GPT-5.6 Sol / high reasoning
19. [ ] Final corrections — Codex, GPT-5.6 Sol / high reasoning
    - Delegate only isolated CSS or copy corrections.
20. [ ] Final validation and handoff — Codex, GPT-5.6 Sol / high reasoning
    - Run typecheck, lint, tests, build, browser QA, scope review, commit, push, and update the documentation.

## Routing guide

- **GPT-6 Astra, high:** architecture, initial product shape, and difficult interaction decisions.
- **GPT-5.6 Sol, high:** product reasoning, UX review, cross-screen changes, and final corrections.
- **GPT-5.6 Sol, medium:** contained but meaningful product decisions.
- **GPT-5.6 Terra, medium:** mechanical UI, CSS, fixtures, and simple state additions.
- **GPT-5.6 Terra, high:** accessibility and implementation where correctness matters more than speed.

## Claude handoff rules

Give Claude one numbered item or one narrowly bounded subtask at a time. Include the exact files, expected behavior, and an explicit instruction not to expand scope. Claude should commit its work. Codex reviews the diff, runs validation, and decides whether the task is complete before moving on.

The next task is **#5 Date-navigation polish**. Codex should define date-control behavior and edge cases; Claude may implement bounded visual-state and responsive-CSS changes.

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
