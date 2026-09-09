# Slate

A mobile-first personal sports scoreboard. The repository contains the complete Phase 0 mock-data product experience, Phase 1 canonical architecture, and opt-in Phase 2 tennis and MLB provider slices. The running app still uses fictionalized local data by default.

[The complete product brief](prompt.md) is the source of truth. See the [Phase 0 implementation record](docs/phase-0.md), [Phase 1 plan](docs/phase-1.md), [Phase 1 architecture audit](docs/phase-1-audit.md), and [Phase 2 tennis architecture](docs/phase-2.md) for the current scope and decisions.

## Run locally

Use **Node.js 22.18+** (Node 24 recommended) and npm.

```sh
npm ci
npm run dev
```

Open **http://localhost:3000**. No environment variables, accounts, API keys, or database are required for mock mode.

To opt into the server-side MLB Stats API slice, set `MLB_API_ENABLED=true` in `.env.local`. It requires no key. The slice is limited to schedule and live-score data for the MLB teams represented in Slate and falls back to mock data when the provider is unavailable. See [the MLB Phase 2 record](docs/phase-2-mlb.md).

To opt into the free-tier Premier League and Champions League slice, set `FOOTBALL_DATA_ENABLED=true` and `FOOTBALL_DATA_API_TOKEN` in `.env.local`. Slate makes one bounded server-side request for the three-day window around the scoreboard date, keeps known followed clubs, and falls back to mock soccer data on errors. This prototype does not poll. See [the football-data.org Phase 2 record](docs/phase-2-football-data.md).

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
src/domain/           Canonical records, opaque IDs, and runtime invariants
src/application/      Repository contracts, normalization contracts, relevance
src/providers/mock/   Invented provider decoder, fixture, and normalizer
src/db/               Drizzle schema and PostgreSQL repository implementation
src/read-models/      Serializable sport-specific scoreboard projection
src/server/           Server-only scoreboard composition
src/components/       Scoreboard, sport cards, event details, Search, Following
src/data/             Canonical mock seed, local destinations, legacy parity data
src/lib/              Date grouping, relevance/deduplication, ordering, preferences
drizzle/              Generated initial PostgreSQL migration and snapshot
tests/                Domain, normalization, persistence, architecture, and UX tests
docs/                 Phase records, domain design, provider boundary, and audit
```

Runtime dependencies are Next.js, React, React DOM, Drizzle ORM, and the server-only marker. No database driver or connection is required for mock mode, so local startup does not require PostgreSQL. The provider slices are server-side request-driven reads only; there is no authentication, queue, worker, browser provider connection, or production live-score infrastructure. The manifest, icons, and safe-area styling provide PWA groundwork; offline caching is not implemented.
