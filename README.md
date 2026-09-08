# Slate

A mobile-first personal sports scoreboard. This repository currently implements **Phase 0 only**, using fictionalized mock sports data.

[The complete product brief](prompt.md) is the source of truth. [Phase 0 implementation notes and evaluation checklist](docs/phase-0.md) describe what exists today.

## Run locally

Use **Node.js 22.18+** (Node 24 recommended) and npm.

```sh
npm ci
npm run dev
```

Open **http://localhost:3000**. No environment variables, accounts, API keys, or database are required.

For phone testing, connect your phone and computer to the same Wi-Fi, then open `http://<your-computer-LAN-IP>:3000` on the phone. The dev server listens on all interfaces. Normal browser use works over local HTTP; standalone installation behavior depends on browser and secure-context requirements.

## Checks

```sh
npm run typecheck
npm run lint
npm test
npm run build
```

To run the production build locally:

```sh
npm run build
npm start
```

## What to try

- Tap or swipe between For You, ATP/WTA, Tottenham, Red Sox, Diamondbacks, Premier League, and NFL.
- Use Yesterday / Today / Tomorrow; the chosen day stays selected when changing follows.
- Open a score card for a sport-specific event page.
- Open US Open from ATP/WTA; its order of play combines men and women, with secondary filters.
- Search `tot`, `alca`, or `prem`; add or remove follows and inspect For You.
- Reorder destinations in Following. For You stays pinned first.
- Toggle the theme in the header. Follows, order, and theme persist on this device.

The reference clock is frozen at **September 6, 2026, 20:42 UTC**. Event dates and times are displayed in the browser’s timezone. Fixtures intentionally illustrate different sports states; they are **not actual results, schedules, or live scores**.

## Structure

```text
app/                  Next.js shell, metadata, manifest, design tokens/styles
src/components/       Scoreboard, sport cards, event details, Search, Following
src/data/             Separate entity and event fixtures; temporary UI types
src/lib/              Date grouping, relevance/deduplication, ordering, preferences
tests/                Node test runner: feed, timezone, gesture, storage invariants
docs/phase-0.md        Implementation decisions and next evaluation pass
```

Runtime dependencies are Next.js, React, and React DOM. No sports providers, authentication, database, queues, workers, or live-score infrastructure are included. The manifest, icons, and safe-area styling provide PWA groundwork; offline caching is not implemented.
