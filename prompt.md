# SLATE — PROJECT BRIEF FOR CODEX

## 0. Purpose of this document

You are helping build a new personal sports scores web application called **Slate**.

Treat this document as the product and technical source of truth unless later instructions explicitly override it.

Do not immediately start implementing everything described here.

First:

1. Read the entire brief.
2. Understand the product philosophy.
3. Inspect the existing repository if one exists.
4. Propose an implementation sequence appropriate to the current state of the project.
5. Avoid unnecessary scope expansion.
6. Prefer simple, durable architecture over speculative infrastructure.
7. Do not add features merely because similar sports apps have them.

The project should initially serve the owner and a small number of friends. It may become public later if it becomes genuinely good, but **do not architect v1 as though it already serves millions of users**.

---

# 1. Product name

# Slate

No tagline is required.

Do not invent a slogan or product line in the UI.

The name comes from the idea of a person's daily **slate of games and matches**.

---

# 2. Product vision

Slate should be:

> A clean, fast, mobile-first sports scoreboard centered on the teams, athletes, leagues, tours, and competitions the user follows.

The best conceptual reference is **FotMob**, except generalized beyond soccer.

Important influences:

* FotMob: information architecture and scores-first philosophy
* Apple Sports: restraint
* Linear: visual cleanliness and product polish

Slate should **not** try to become ESPN.

The product exists because current alternatives have specific problems:

### FotMob

Excellent product, but soccer only.

### ESPN

Too much clutter, content, media, promotion, and poor product design for this use case.

### Yahoo Sports

Usable but ad-heavy and organized awkwardly.

Specific Yahoo complaints:

* tennis is unnecessarily split into men's and women's experiences
* soccer competitions are organized awkwardly
* ads and other clutter reduce usability

Slate should feel closer to a **utility** than a sports media company.

---

# 3. Core product philosophy

The app should optimize for this loop:

> Open Slate → see what happened yesterday → see what is happening today → see what is happening tomorrow → swipe to another thing I follow.

This is the central experience.

The app should not primarily organize itself around broad top-level categories such as:

* Soccer
* Tennis
* Baseball
* Football

Those are useful metadata and discovery categories, but the primary navigation should represent **what the user follows**.

A user may follow:

* a team
* a player
* a league
* a tournament
* a tour
* a broader curated competition collection

Examples:

* Tottenham Hotspur
* Premier League
* Champions League
* ATP/WTA
* Carlos Alcaraz
* Coco Gauff
* Boston Red Sox
* Arizona Diamondbacks
* NFL

The product is therefore better thought of as:

> A customizable scoreboard constructed from followed entities.

Not:

> A generic scoreboard with a favorites feature bolted onto it.

---

# 4. Initial user's interests

Use these as the reference dataset while designing the first experience.

### Soccer

* Tottenham Hotspur
* major men's leagues and competitions

### Tennis

* the full ATP/WTA main tours
* not merely favorite players

### MLB

* Boston Red Sox
* Arizona Diamondbacks

### NFL

* likely league-wide visibility rather than one specific favorite team initially

These should be useful development fixtures and mock-data subjects.

---

# 5. Initial sports scope

V1 targets:

1. Men's soccer
2. ATP/WTA tennis
3. MLB
4. NFL

Do NOT include in v1 unless explicitly requested later:

* NBA
* NHL
* F1
* college sports
* women's soccer
* Challenger tennis
* ITF tennis
* golf
* combat sports
* fantasy
* betting

The architecture should not intentionally block additional sports, but do not build generalized abstractions solely for hypothetical future sports.

---

# 6. Soccer coverage

Initial soccer coverage only needs major men's competitions.

Reasonable initial targets:

* Premier League
* UEFA Champions League
* La Liga
* Bundesliga
* Serie A
* Ligue 1
* MLS

Potentially later:

* Europa League
* FA Cup
* EFL Cup
* World Cup
* Euros
* Copa América
* major USMNT competitions

Do not pursue maximum league coverage simply because an API provides it.

Slate should prefer:

> Curated useful coverage

over:

> Every competition in the provider database.

No women's soccer is required for now.

---

# 7. Tennis philosophy

Tennis is one of the most important differentiators of Slate.

## Critical rule

**ATP and WTA must not be treated as two separate sports in the user experience.**

The user follows:

# ATP/WTA

as one top-level followed collection.

Users experience major tournaments such as:

* Australian Open
* Indian Wells
* Miami
* Roland Garros
* Wimbledon
* Cincinnati
* US Open

as tournaments, not as completely unrelated men's and women's products.

Therefore Slate should intentionally normalize provider data into a better user-facing structure.

Example:

Provider data may contain:

* ATP Wimbledon
* WTA Wimbledon

Slate should be capable of representing:

```text
Wimbledon
  ├── Men's Singles
  ├── Women's Singles
  ├── Men's Doubles
  ├── Women's Doubles
  └── Mixed Doubles
```

The tournament is the primary user-facing object.

Gender/event category becomes a secondary filter where appropriate.

---

# 8. Tennis scope

Include:

* ATP tour-level events
* WTA tour-level events
* Grand Slams

Exclude initially:

* ATP Challenger
* ITF
* lower-level events unless later requested

Qualifying and doubles policy can remain configurable.

Likely product preference:

* Grand Slam qualifying: potentially show
* ordinary weekly qualifying: lower priority / hidden by default
* Grand Slam doubles: useful
* ordinary weekly doubles: potentially collapsed or filtered by default

Do not let low-priority tennis matches overwhelm the primary scores interface.

---

# 9. Tennis tournament page

A tournament page should conceptually resemble:

# US Open

Tabs or sections might eventually include:

* Today
* Draws
* Rankings / Seeds where relevant
* Info
* News

Today's order of play should combine ATP and WTA matches by default.

Example:

```text
Arthur Ashe Stadium

11:30 AM
Coco Gauff vs Naomi Osaka

Not before 2:30 PM
Carlos Alcaraz vs Taylor Fritz

7:00 PM
Aryna Sabalenka vs Qinwen Zheng

Not before 9:00 PM
Jannik Sinner vs Jack Draper
```

Useful filters:

* All
* Men
* Women
* Singles
* Doubles
* Mixed

But the default should not force the user to choose ATP or WTA before seeing matches.

---

# 10. Tennis live scoring

Point-by-point tennis would be a very valuable feature.

The desired eventual score presentation is something like:

```text
Carlos Alcaraz
6   3   40

Jannik Sinner
4   4   30  🎾

Second set
Sinner serving
```

A detailed live match page may later contain:

```text
Current game

0–0
15–0
15–15
30–15
30–30
40–30
```

Potential future event detail:

* ace
* double fault
* winner
* unforced error
* break point
* serve state

However:

**Do not require expensive true streaming point-by-point infrastructure for initial implementation.**

Architect live tennis data behind a provider interface so that Slate can begin with periodic current-score snapshots and later upgrade to a WebSocket/push provider.

The UI and internal model should not assume the initial provider is permanent.

---

# 11. Yesterday / Today / Tomorrow

This is one of the defining UX requirements.

Every primary followed scoreboard page should make these immediately available:

```text
Yesterday    TODAY    Tomorrow
```

Today receives clear visual emphasis.

A calendar control can provide arbitrary-date navigation, but normal interaction should not require opening a date picker.

The mental model is:

### Yesterday

What happened?

### Today

What is happening?

### Tomorrow

What is next?

Preserve this everywhere sensible.

---

# 12. Followed-entity navigation

One of the user's favorite behaviors in Yahoo Sports is swiping between leagues/things being followed.

Slate should preserve and improve this.

Potential followed rail:

```text
For You
Premier League
ATP/WTA
Tottenham
Red Sox
Diamondbacks
NFL
```

The user should be able to:

* tap these
* horizontally scroll through them
* ideally swipe between corresponding full scoreboard views

Important gesture constraint:

Do not assign conflicting horizontal swipe gestures to both:

* dates
* followed entities

Preferred current design:

### Full-page horizontal swipe

Changes followed entity.

### Explicit Yesterday / Today / Tomorrow controls

Changes date.

This prevents ambiguous nested swipe behavior.

---

# 13. Following management

Users should be able to reorder followed entities.

Example:

```text
Your Scores

☰ For You
☰ ATP/WTA
☰ Tottenham
☰ Red Sox
☰ Diamondbacks
☰ Premier League
☰ NFL
```

The order should determine the order of the swipe/navigation rail.

The system should support following different entity types without forcing separate management screens for each.

---

# 14. For You page

`For You` is a special aggregated scoreboard.

It combines relevant events from everything followed.

Example user follows:

* Tottenham
* Premier League
* Alcaraz
* Red Sox

If Tottenham plays a Premier League match, the event must not appear twice.

Slate should deduplicate overlapping follow relationships.

Example:

```text
TODAY

10:00 AM · Premier League
Tottenham vs Liverpool

1:30 PM · Cincinnati · Quarterfinal
Alcaraz vs Rune

7:10 PM · MLB
Yankees at Red Sox
```

Potential hierarchy for broad competition follows:

If the user follows both Tottenham and Premier League, prioritize Tottenham and avoid letting nine unrelated league games dominate the page.

Potential approach:

```text
Tottenham vs Liverpool

8 other Premier League matches
```

This behavior can evolve, but the For You page should always prioritize personal relevance.

---

# 15. Search

Search should work across entity types.

Examples:

Search:

```text
tot
```

Returns:

```text
Tottenham Hotspur
Team · Premier League
+ Follow
```

Search:

```text
alca
```

Returns:

```text
Carlos Alcaraz
Player · ATP
+ Follow
```

Search:

```text
prem
```

Returns:

```text
Premier League
Competition · Soccer
+ Follow
```

Search should eventually cover:

* teams
* players
* competitions
* tournaments
* curated collections

The user should not have to choose a sport before searching.

---

# 16. Primary app navigation

Keep mobile navigation extremely small.

Likely:

### Scores

Primary product.

### Search

Find and follow entities.

### Following

Manage followed entities and ordering.

Settings can live behind an avatar/menu.

Avoid navigation such as:

```text
Home
Scores
Watch
News
Fantasy
More
```

Slate is not a media portal.

---

# 17. Soccer experience

FotMob should be the conceptual reference.

Do not reinvent successful soccer conventions merely to be different.

## Team page example

# Tottenham Hotspur

Potential tabs:

* Overview
* Matches
* Table
* Squad
* News

Overview could include:

### Next match

Tottenham vs Liverpool
Saturday · 12:30 PM

### Form

W · W · D · L · W

### Relevant table slice

```text
3 Liverpool      18
4 Tottenham      17
5 Chelsea        16
```

### Recent

```text
Tottenham 2–1 Villa
Arsenal 1–1 Tottenham
```

A Tottenham page should naturally combine all Tottenham competitions:

* Premier League
* Champions League
* FA Cup
* League Cup

The team is the object being followed, not a specific league occurrence of that team.

---

# 18. Baseball experience

Baseball should use baseball-native presentation rather than forcing everything into a generic score component.

## Pregame

```text
NYY @ BOS
7:10 PM · Fenway Park

Cole
vs
Crochet
```

## Live

```text
NYY 3
BOS 5

Bottom 7th · 1 out

◆ ◇ ◆

Judge at bat
1–2 count
```

## Final

```text
NYY 3
BOS 5

FINAL

W: Crochet
L: Cole
SV: Whitlock
```

Event detail can eventually include:

* inning-by-inning line
* box score
* batting
* pitching
* play-by-play
* pitch information

But advanced depth is not required for the first usable Slate release.

---

# 19. NFL experience

Example main card:

```text
Patriots 17
Bills 20

Q4 · 6:32

BUF ball
2nd & 7
NE 42
```

Detailed game page can eventually contain:

* drives
* scoring
* play-by-play
* team stats
* player stats

Because there are relatively few NFL games, a user following `NFL` may reasonably see the entire league's daily slate.

---

# 20. Universal event model

Use the concept:

# Event

rather than `Game`.

A soccer match is an event.

A tennis match is an event.

A baseball game is an event.

An NFL game is an event.

This preserves flexibility without pretending every sport has the same internal state.

Possible conceptual structure:

```ts
interface Event {
  id: string
  sportId: string
  competitionId: string
  seasonId?: string

  startTime: Date
  status: EventStatus

  participants: EventParticipant[]

  venue?: Venue

  score: CanonicalScore

  sportState?: SportSpecificEventState
}
```

Do not place every possible sport-specific field directly into the core Event schema.

Use:

> common normalized core + sport-specific state

Examples:

### Soccer state

```ts
{
  minute,
  addedTime,
  aggregateScore,
  penaltyScore,
  period
}
```

### Tennis state

```ts
{
  sets,
  games,
  points,
  servingParticipantId,
  round,
  court,
  bestOf,
  tiebreakState
}
```

### Baseball state

```ts
{
  inning,
  inningHalf,
  outs,
  balls,
  strikes,
  baseState,
  batterId,
  pitcherId
}
```

### NFL state

```ts
{
  quarter,
  clock,
  possessionParticipantId,
  down,
  distance,
  fieldPosition
}
```

---

# 21. Participant abstraction

A useful canonical abstraction is:

```ts
Participant {
  id
  type: TEAM | PLAYER

  sportId

  name
  shortName

  countryCode?
  logoUrl?
}
```

Examples:

* Tottenham = Participant / TEAM
* Red Sox = Participant / TEAM
* Arizona Diamondbacks = Participant / TEAM
* Carlos Alcaraz = Participant / PLAYER
* Coco Gauff = Participant / PLAYER

Use an `EventParticipant` join/relationship to associate participants with events.

Do not create frontend assumptions that every participant is a team.

---

# 22. Competition model

Possible domain objects:

```text
Sport
Participant
Competition
CompetitionGroup
Season
Event
EventParticipant
EventState
Standing
Provider
ProviderEntityMapping
User
Follow
```

This is conceptual, not a mandatory exact database schema.

Inspect implementation needs before finalizing.

---

# 23. CompetitionGroup

`CompetitionGroup` is especially useful for tennis.

Example:

```text
CompetitionGroup
id: us-open-2026
name: US Open

Competition
id: provider-atp-us-open
groupId: us-open-2026

Competition
id: provider-wta-us-open
groupId: us-open-2026
```

This allows Slate's data model to correct undesirable provider organization.

General rule:

> Slate's domain model should represent the user experience Slate wants, not merely reproduce the structure of a third-party API.

Provider IDs and provider competition boundaries are implementation details.

---

# 24. Follow model

Avoid separate persistence concepts such as:

```text
followed_team
followed_player
followed_league
```

Prefer one polymorphic/domain-target approach.

Conceptually:

```ts
interface Follow {
  id: string
  userId: string

  targetType:
    | "participant"
    | "competition"
    | "competition_group"
    | "collection"

  targetId: string

  position: number
}
```

Curated collections may include things such as:

```text
collection:atp-wta
collection:nfl
```

Do not force the database to use this exact implementation if another type-safe approach is materially better.

Preserve the behavior.

---

# 25. Context feature

Slate should include very short contextual information explaining why a result matters.

This may become one of the defining features.

Strict rule:

> Context should normally be one short sentence or less.

Examples:

```text
Tottenham moves up to 3rd.
```

```text
Alcaraz advances to the semifinal.
```

```text
Boston moves 1.5 games ahead in the Wild Card race.
```

```text
Arizona wins the series, 2–1.
```

Do not write mini-articles.

Do not display Context merely because there is room.

If there is nothing meaningful to say, omit it.

---

# 26. Context generation strategy

Prefer deterministic structured logic wherever possible.

Do NOT send everything to an LLM.

Examples:

### Soccer

```text
standingBefore = 6
standingAfter = 4

→ Tottenham moves up to 4th.
```

### Tennis

```text
round = quarterfinal
winner = Alcaraz
nextRound = semifinal

→ Alcaraz advances to the semifinal.
```

### MLB

```text
seriesBefore = 1–1
seriesAfter = 2–1

→ Boston wins the series, 2–1.
```

Potential later AI use:

* unusual milestones
* narrative context that structured data cannot easily express
* brief recaps

AI should remain a background enhancement, not a visible chatbot product.

Do NOT add an "Ask Slate AI" feature unless explicitly requested.

---

# 27. News philosophy

News should exist only when the user deliberately opens a relevant entity page.

Examples:

* Tottenham page → News tab
* Alcaraz page → News
* Premier League page → News
* Red Sox page → News

Do NOT put general news on:

* primary Scores page
* For You scoreboard
* main app navigation

There should be no endless news feed.

News is supplemental information, not the product.

---

# 28. Spoiler mode

Roadmap, not initial requirement.

Potential future modes:

### Scores On

Everything displayed.

### Hide Results

Match status shown, result hidden.

### Full Spoiler Mode

Even result-adjacent information such as:

* set count
* overtime
* penalties
* match duration

may be hidden.

A finished event could show:

```text
Tottenham vs Arsenal
Finished

Reveal result
```

Do not implement unless requested after core scores functionality works.

---

# 29. Notifications

Roadmap feature.

Potential granularity:

### Soccer

* lineup released
* kickoff
* goals
* halftime
* final

### Tennis

* match scheduled
* starting soon
* started
* set complete
* final

### MLB/NFL

* starting soon
* started
* major scoring
* final

Default future notification behavior should be restrained.

Probably:

* starting soon
* final

Do not build notification infrastructure into early MVP unless necessary.

---

# 30. Calendar

Roadmap feature.

Eventually a user could see all followed sports events in a calendar and potentially subscribe through an ICS feed.

Example day:

```text
Sep 12

10:00 AM
Tottenham

2:30 PM
Alcaraz

7:10 PM
Red Sox
```

Useful, but not core v1.

---

# 31. Social features

No.

Do not add:

* comments
* social feeds
* profiles for discovery
* friend activity
* reactions
* public sharing network

A basic share sheet/card could theoretically appear much later, but there is no current social-product requirement.

---

# 32. Betting and fantasy

Explicit anti-features.

Do NOT add:

* odds
* sportsbook integrations
* betting prompts
* fantasy sports
* gambling affiliate links

unless explicitly requested later.

---

# 33. Advertising

There should be no ads in the intended personal version.

A key reason Slate exists is dissatisfaction with ad-heavy alternatives.

Do not design around ad inventory or sponsored content.

If Slate ever becomes a public product, monetization can be reconsidered separately.

---

# 34. Mobile-first design

Slate is explicitly:

# Mobile first

The primary test device is a phone.

The desired end state is:

> Slate is good enough to remove Yahoo Sports from the user's phone home screen.

Desktop should still be polished and responsive, but do not compromise mobile interactions to produce elaborate desktop dashboards.

---

# 35. PWA

Initial deployment should preferably be an excellent PWA.

Goals:

* installable
* good standalone mobile behavior
* fast launch
* proper icons/manifest
* responsive touch targets
* app-like navigation
* sensible caching
* safe-area support
* good dark mode

Do not start with native iOS development.

If Slate becomes exceptional, App Store/native options may be evaluated later.

---

# 36. Visual design principles

Target:

> FotMob information density × Apple Sports restraint × Linear polish

Prefer:

* clean typography
* generous but not wasteful spacing
* near-monochrome UI
* team logos/crests and flags providing natural color
* clear score hierarchy
* quiet secondary metadata
* subtle dividers
* minimal chrome

Avoid:

* enormous decorative cards
* gradients everywhere
* generic SaaS dashboard appearance
* excessive shadows
* sports-TV visual clichés
* betting-style neon
* unnecessary animation
* promotional surfaces

The app should feel precise and calm.

---

# 37. Example mobile score card

Conceptually:

```text
Champions League

Tottenham                  2
Barcelona                  1

FINAL

Tottenham moves into 4th.
```

Tennis:

```text
Cincinnati · QF

Alcaraz          6   4   40
Sinner           4   4   30 🎾

LIVE
Sinner serving
```

Baseball:

```text
Yankees                    3
Red Sox                    5

BOT 7 · 1 OUT

◆ ◇ ◆

Judge at bat · 1–2
```

NFL:

```text
Patriots                  17
Bills                     20

Q4 · 6:32

BUF ball · 2nd & 7 · NE 42
```

These are illustrative, not pixel-perfect requirements.

---

# 38. Specialized event pages

All event pages should share a coherent top-level grammar:

```text
Competition
Round / status

Participant A

Score

Participant B

Context
```

Below that, sport-specific experiences diverge.

### Soccer

Eventually:

* timeline
* lineups
* statistics
* standings implications
* xG
* shot map
* player ratings

### Tennis

Eventually:

* current point/game
* point-by-point
* match stats
* H2H
* draw
* tournament context

### MLB

Eventually:

* plays
* box score
* pitching
* batting
* inning line
* pitch data

### NFL

Eventually:

* drives
* play-by-play
* team statistics
* scoring summary

Do not try to make these sport-specific sections artificially identical.

---

# 39. Advanced statistics

Roadmap.

Not required for v1.

Examples:

### Soccer

* xG
* shot maps
* player ratings

### Tennis

* serve percentages
* break points
* winners
* unforced errors
* rally information if available

### MLB

* advanced batting/pitching metrics

### NFL

* advanced player/team metrics

The initial value proposition is clean scores and schedules, not analytics.

---

# 40. Data provider philosophy

This project must be:

# Provider agnostic

Do not let React components or business logic depend directly on a third-party API's schema.

Never create UI logic such as:

```ts
fixture.status.short === "FT"
```

if `fixture` is an API-Football provider object.

Required flow:

```text
External provider
      ↓
Provider adapter
      ↓
Slate canonical representation
      ↓
Persistence/cache
      ↓
Slate server/API
      ↓
Frontend
```

Every provider should be replaceable without rewriting the frontend.

---

# 41. Provider entity mapping

Maintain mapping between Slate's canonical entities and provider IDs.

Conceptually:

```text
Slate participant:
carlos-alcaraz

Provider:
live-tennis-api
Provider ID:
123419

Provider:
sportradar
Provider ID:
sr:competitor:...
```

The exact implementation may use mapping tables or source records.

The important requirement is that Slate owns its canonical IDs.

---

# 42. Data providers and cost constraints

Sports data cost is a major constraint.

This app is initially for one user and a handful of friends.

Target infrastructure/data cost:

> Preferably under $10/month initially.

Soft ceiling:

> Approximately $20/month unless there is a compelling improvement.

Do not introduce an expensive enterprise sports feed simply because it is technically superior.

During development, free API tiers and mock data are acceptable.

Provider decisions should optimize:

* reliability
* sufficient freshness
* cost
* legal/licensing suitability
* ability to swap later

Commercial/public deployment would require a separate licensing review.

---

# 43. Tennis provider cost strategy

True streaming point-by-point tennis can be expensive.

Therefore:

### Initial version

Polling/snapshot live score is acceptable.

### Desired UX

Should still support:

* sets
* games
* current point
* server

### Future

Streaming per-point WebSocket or push provider can replace polling.

This is precisely why provider abstraction is mandatory.

---

# 44. Live-score architecture

Do NOT have each browser independently hammer the upstream sports API.

Preferred architecture:

```text
Sports provider
      ↓
Slate ingestion / server fetch
      ↓
Shared cache
      ↓
Slate API
      ↓
Clients
```

If five friends are looking at the same Red Sox game:

Slate should ideally make one upstream fetch for the current state, not five equivalent upstream fetches.

Use caching intelligently.

---

# 45. Polling strategy

Polling frequency should reflect both sport and whether the data matters right now.

Potential initial targets:

### Soccer

10–30 seconds while relevant/live if provider budget supports it.

### Tennis

20–30-second snapshots initially, unless live provider allows something better.

### MLB

5–30 seconds depending on provider limits and detail level.

### NFL

5–30 seconds depending on provider limits.

Do NOT interpret these numbers as hard requirements.

Design an adaptive strategy.

Examples:

* If nobody is using Slate, do not aggressively poll.
* If no event is live, reduce refresh frequency dramatically.
* Yesterday's final result should not be repeatedly fetched.
* Tomorrow's schedule does not need live cadence.
* Standings can refresh after relevant games complete.

---

# 46. Data-budget awareness

Slate should exploit the fact that it has very few users.

Example optimization:

If no client has accessed Slate for a long period:

* do not continuously poll every live event worldwide

If user opens ATP/WTA:

* fetch/update relevant tennis slate

If user opens Red Sox game:

* prioritize that game

Cache:

* completed scores aggressively
* schedules sensibly
* logos almost indefinitely
* standings between meaningful changes

Avoid building a data-ingestion company.

---

# 47. Infrastructure

Preferred initial stack:

### App

* Next.js
* TypeScript
* React

### Styling

* Tailwind CSS
* potentially selected shadcn/ui primitives

Do not let a component library dictate the visual identity.

### Database

* PostgreSQL

### ORM

Either:

* Drizzle
* Prisma

Choose based on repository conventions and project needs.

### Cache

Potentially:

* Redis
* Upstash Redis

Only add when needed.

### Hosting

* Vercel is acceptable

### Authentication

Could use:

* Auth.js
* Clerk
* Supabase Auth
* another lightweight solution

But authentication is not required before the core product experience works.

---

# 48. Authentication philosophy

Do not spend the beginning of the project on authentication.

The earliest working version can effectively be:

> one seeded personal user

Once the product works:

* add auth
* allow several friends
* persist individual follow setups

Do not let login/account plumbing delay the core experience.

---

# 49. Initial MVP

V1 should contain roughly:

## Sports

* soccer
* ATP/WTA tennis
* MLB
* NFL

## Following

* follow teams
* follow players
* follow leagues
* follow competition groups
* follow ATP/WTA collection
* reorder follows

## Scores

* Yesterday
* Today
* Tomorrow
* scheduled
* live
* final

## Pages

* team page
* player page
* competition page
* tennis tournament page
* event/game/match page

## Basic supporting data

* soccer standings
* tennis rankings
* tennis tournament/draw structure where feasible
* MLB standings
* NFL standings

## Context

* deterministic brief Context where reliable

## News

* entity pages only

## Platform

* responsive mobile-first PWA

This is already a large project.

Do not add roadmap features just to make v1 feel "complete."

---

# 50. Explicitly excluded from v1

Do NOT add without direct instruction:

* notifications
* spoiler mode
* native iOS app
* social functionality
* user messaging
* comments
* betting
* fantasy
* advanced sports statistics
* AI chatbot
* generic news feed
* women's soccer
* Challenger tennis
* ITF tennis
* NBA
* NHL
* F1
* college sports
* ad system
* subscriptions/payment system

Keep this list visible during scope decisions.

---

# 51. Build strategy

The product should be built in phases.

## PHASE 0 — PRODUCT PROTOTYPE WITH MOCK DATA

Before solving sports APIs, make the experience good.

Use realistic mock data for:

* Tottenham soccer match
* Alcaraz tennis match
* Red Sox baseball game
* Diamondbacks baseball game
* NFL game

Build:

* mobile app shell
* followed navigation
* Yesterday / Today / Tomorrow
* For You
* score cards
* event pages
* search concept
* following/reordering concept

Success criterion:

> The interface is compelling enough that the user wishes it had real live data.

Do not begin by ingesting hundreds of competitions.

---

# 52. PHASE 1 — CANONICAL DOMAIN MODEL

Once the UX works:

Implement canonical representations for:

* Sport
* Participant
* Competition
* CompetitionGroup
* Season
* Event
* EventParticipant
* Follow
* Provider mapping

Design provider adapter contracts.

Write tests around normalization.

This is an architecture-critical phase.

---

# 53. PHASE 2 — TENNIS

Tennis should likely be the first real sports integration.

Reason:

It is the hardest domain conceptually because it requires:

* player participants
* ATP/WTA unification
* tournament groups
* multiple competitions inside one user-facing tournament
* set/game/point scoring
* serving state
* rounds
* draws
* potentially qualifying/doubles filtering

If Slate's architecture handles tennis cleanly, traditional team sports should be easier.

Initial tennis target:

* ATP/WTA main tour
* Grand Slams
* Yesterday / Today / Tomorrow
* live current score
* tournament page
* player page
* rankings
* basic draw where available

---

# 54. PHASE 3 — SOCCER

Use Tottenham and Premier League as the reference integration.

Implement:

* major men's competitions
* team schedules across competitions
* competition schedule
* table
* live score/status
* team page
* event page

The domain model should let Tottenham naturally appear across all competitions.

---

# 55. PHASE 4 — MLB

Reference teams:

* Boston Red Sox
* Arizona Diamondbacks

Implement:

* team schedules
* league slate if followed
* live score state
* inning
* inning half
* outs
* basic base state if data permits
* standings
* game page

Do not overbuild pitch-level visualization initially.

---

# 56. PHASE 5 — NFL

Implement:

* league follow
* full weekly slate
* live score
* quarter
* clock
* possession/down/distance if available
* standings
* game page

Because the NFL slate is small, following the entire league should be a first-class use case.

---

# 57. PHASE 6 — AUTHENTICATION AND MULTIUSER

After Slate is personally useful:

* authentication
* user-specific follows
* ordering
* preferences
* several friends

Do not optimize for large-scale multi-tenancy prematurely.

---

# 58. PHASE 7 — LIVE INFRASTRUCTURE IMPROVEMENTS

Only once usage demonstrates need:

* better caching
* adaptive ingestion
* SSE/WebSockets
* true tennis point push
* more aggressive live refresh
* provider upgrades
* background scheduling

Do not pay complexity costs before UX demonstrates value.

---

# 59. Success criteria

The most important success metric is not number of features.

It is:

> Does the user voluntarily open Slate instead of Yahoo Sports?

Secondary indicators:

* Can the user understand today's relevant sports slate in seconds?
* Can they move between followed entities faster than in existing apps?
* Is tennis better organized than Yahoo?
* Does the product feel cleaner than ESPN?
* Does soccer retain the usability the user likes about FotMob?
* Can a user check yesterday/today/tomorrow with almost no navigation?
* Is mobile usage effortless?
* Is operating cost still reasonable?

---

# 60. Important product tensions to preserve

## Broad coverage vs relevance

Choose relevance.

## Generic components vs sport-specific UX

Share foundations, specialize presentation.

## Live freshness vs API cost

Use adaptive data retrieval and upgrade only when justified.

## Provider schema vs Slate schema

Slate owns the domain model.

## Feature richness vs cleanliness

Choose cleanliness.

## Desktop sophistication vs mobile usability

Choose mobile.

## AI novelty vs accurate structured data

Choose structured data.

---

# 61. Anti-patterns

Avoid these.

### 1. Provider leakage

Bad:

```tsx
if (apiFootballFixture.fixture.status.short === "FT")
```

Good:

```tsx
if (event.status === "final")
```

---

### 2. Sport-switch explosions

Avoid code like:

```ts
if (sport === "soccer") ...
else if (sport === "tennis") ...
else if (sport === "baseball") ...
```

throughout generic application layers.

Sport-specific behavior belongs in clear boundaries/components/adapters.

---

### 3. Over-generalization

Do not build abstract engines for hypothetical sports that do not exist yet.

---

### 4. UI driven by API shape

The provider's categories are not the UX specification.

Especially in tennis.

---

### 5. Premature infrastructure

Do not introduce:

* Kafka
* Kubernetes
* elaborate queues
* microservices

for an app used by several people unless there is a concrete reason.

---

### 6. Premature AI

Do not use LLMs where standings/math/rules produce deterministic Context.

---

### 7. Feature creep

When uncertain whether to add something:

do not.

Raise it as an option instead.

---

# 62. Code quality expectations

Use:

* strict TypeScript
* clear domain types
* meaningful component boundaries
* runtime validation for external API data
* tests around provider normalization
* tests around overlapping follow/deduplication logic
* deterministic date/time handling
* explicit timezone behavior
* accessible UI controls
* semantic HTML
* responsive layouts

Avoid:

* `any`
* raw provider objects in frontend components
* giant components
* huge universal schemas with dozens of nullable sport fields
* unnecessary dependency additions

---

# 63. Timezones

Sports schedules happen globally.

Internal canonical times should use unambiguous timestamps.

Presentation should default to the user's timezone.

This is especially important for:

* European soccer
* Japanese/Australian tennis
* US sports

Never require the user to mentally convert event times.

---

# 64. Date grouping

Be careful about global events crossing midnight.

"Today" means:

> the user's local calendar date

not:

> the provider's source timezone date

Normalize event timestamps first, then determine Yesterday / Today / Tomorrow in the user's timezone.

Write tests for this.

---

# 65. Event deduplication

The same event may enter a feed through multiple follows.

Example:

User follows:

* Tottenham
* Premier League

Tottenham vs Arsenal should appear once in `For You`.

Store/expose enough provenance to explain why an event is relevant without duplicating it.

---

# 66. Design system strategy

Create a small internal Slate design language rather than relying entirely on default library styles.

Establish:

* type scale
* spacing scale
* score emphasis
* metadata style
* status treatment
* separators
* interaction states
* icon conventions
* team/player avatar conventions
* loading skeletons
* error states
* empty states

Keep visual vocabulary deliberately small.

---

# 67. Dark mode

Dark mode should be first-class.

Avoid a low-effort inverted-light-theme implementation.

Team crests, country flags, score states, and live indicators should remain legible and balanced in both modes.

---

# 68. Performance expectations

The primary score screen should feel instant.

Prioritize:

* server-side initial data where sensible
* caching
* small client bundles
* optimized images/logos
* minimal animation
* skeletons rather than layout jumps
* preserving selected follow/date navigation state

Do not fetch large news payloads on the scores page.

---

# 69. Error states

Sports providers will fail.

Design gracefully for:

* stale live data
* missing score fields
* delayed event status
* missing logos
* provider outage
* tournament missing a draw
* unsupported stats
* API rate limits

Never fabricate sports data.

If stale data is being displayed, the system should be able to indicate that appropriately.

---

# 70. MODEL STRATEGY FOR CODEX

The owner is on **ChatGPT Plus**, so model usage should be intelligent rather than simply using the most expensive model for everything.

Available model names/settings may evolve, so use the closest available equivalent if the exact option is not shown.

## General philosophy

Do not use Astra simply because it is the strongest model.

Reserve expensive/high-allowance reasoning for work where a bad decision is expensive to undo.

Use cheaper models for implementation that is mechanically straightforward.

---

# 71. GPT-6 ASTRA — WHEN TO USE IT

Use **GPT-6 Astra** selectively.

Plus has limited Astra usage, so preserve it.

### Use Astra for:

* initial system architecture review
* canonical sports domain model
* provider boundary design
* complex ATP/WTA tournament normalization
* live-score ingestion/caching architecture
* major repo-wide refactors
* difficult bugs that have resisted Sol
* architecture audits before adding another sport
* reasoning about whether existing abstractions will scale cleanly
* major migrations touching many subsystems

### Recommended reasoning

Use **High** where available for most Astra tasks.

Use the highest available setting only when the problem genuinely warrants it.

Do not automatically run Astra at maximum effort.

### Example Astra task

> Review the current Slate repository and determine whether the Event, Participant, Competition, CompetitionGroup, Follow, and ProviderMapping architecture cleanly supports ATP/WTA tennis, soccer, MLB, and NFL without provider leakage or sport-specific hacks. Identify architectural weaknesses, propose the smallest durable corrections, implement them, and add tests.

Excellent Astra task.

### Bad Astra task

> Add 12px padding below the score card.

Do not waste Astra usage on this.

---

# 72. GPT-5.6 SOL — PRIMARY SERIOUS CODING MODEL

Use **GPT-5.6 Sol** for most important implementation.

### Default effort

**High** for:

* new feature implementation
* provider adapters
* state modeling
* database changes
* difficult component behavior
* debugging
* test design
* cross-file refactoring
* business logic
* For You aggregation
* deduplication
* timezone/date handling

**Medium** for:

* moderate components
* simple routes
* normal CRUD
* smaller refactors
* straightforward API integration after architecture already exists

Sol should probably perform the majority of serious Slate development.

---

# 73. GPT-5.6 TERRA — DEFAULT ROUTINE MODEL

Use **GPT-5.6 Terra** aggressively for routine work.

Recommended reasoning:

**Medium**

Good tasks:

* styling
* responsive tweaks
* building already-designed components
* form wiring
* simple database queries
* loading states
* empty states
* small utilities
* adding tests for known behavior
* simple bug fixes
* code cleanup
* renaming
* file organization
* straightforward migrations
* implementing a clearly specified endpoint

If the architecture and acceptance criteria are already clear, Terra is usually the right choice.

---

# 74. GPT-5.6 LUNA — MECHANICAL WORK

Use Luna when available for very simple and repetitive tasks.

Examples:

* rename symbols
* update imports
* copy an established component pattern
* basic formatting
* tiny test additions
* documentation maintenance

Prefer Low/Medium effort depending on interface availability.

Do not rely on Luna for foundational sports-domain decisions.

---

# 75. MAX REASONING

Use `max` reasoning selectively.

Good examples:

* a provider abstraction is becoming tangled after multiple integrations
* tennis and soccer reveal conflicting assumptions in Event modeling
* there is a difficult concurrency/cache consistency bug
* a major migration could corrupt data
* repeated normal attempts fail
* performing a comprehensive architecture review before public release

Bad examples:

* routine components
* visual tweaks
* ordinary CRUD
* adding a simple field

High reasoning should usually be sufficient.

---

# 76. RECOMMENDED MODEL FLOW BY PHASE

## Phase 0 — Mock UI

Initial UX/design system:

**Sol High**

Routine component implementation:

**Terra Medium**

Visual cleanup:

**Terra Medium**

Astra generally unnecessary.

---

## Phase 1 — Canonical domain model

Architecture:

**Astra High**

Implementation:

**Sol High**

Routine migrations/tests:

**Terra Medium**

Final architecture audit:

**Astra High** if allowance permits.

This is one of the places where Astra usage is justified.

---

## Phase 2 — Tennis

Initial data-model/provider design:

**Astra High**

Adapter implementation:

**Sol High**

UI work:

**Terra Medium**

Point-scoring/debugging:

**Sol High**

If tennis reveals a deep domain-model flaw:

**Astra High**

---

## Phase 3 — Soccer

Provider and mapping design:

**Sol High**

Implementation:

**Sol High / Terra Medium**

Routine team/table UI:

**Terra Medium**

Architecture review only if soccer exposes problems:

**Astra High**

---

## Phase 4 — MLB

Normal implementation:

**Sol High**

Cards/UI:

**Terra Medium**

Advanced live state issues:

**Sol High**

Astra only if the shared Event model breaks down.

---

## Phase 5 — NFL

Same general strategy:

**Sol High** for domain work.

**Terra Medium** for routine implementation.

---

## Phase 6 — Auth

Usually:

**Sol Medium/High**

then:

**Terra Medium**

No need for Astra unless authentication causes an architectural problem.

---

## Phase 7 — Live infrastructure

Caching/polling/SSE architecture:

**Astra High**

Implementation:

**Sol High**

Routine instrumentation:

**Terra Medium**

Concurrency/performance bugs:

**Sol High → Astra High if unresolved**

---

# 77. MODEL ESCALATION RULE

Use this escalation ladder:

```text
Terra Medium
      ↓ if task is genuinely difficult
Sol High
      ↓ if architecture-wide / repeated failure
Astra High
      ↓ only for exceptional cases
Max effort
```

Do not begin every task at the bottom of this diagram.

Preserve Plus usage.

---

# 78. MODEL HANDOFF PRACTICE

When changing models, leave concise repository notes.

For architecture-heavy work, create or maintain something like:

```text
docs/architecture.md
docs/providers.md
docs/domain-model.md
```

The goal is to prevent expensive models from repeatedly rediscovering the architecture.

Document:

* important decisions
* rejected approaches
* provider quirks
* invariants
* migration assumptions

This also makes Terra much more effective on routine work.

---

# 79. AGENT BEHAVIOR

When given a feature request:

1. Inspect relevant existing code first.
2. Identify whether the task is local or architectural.
3. Reuse current patterns where they are sound.
4. Do not refactor unrelated code.
5. Implement the smallest coherent solution.
6. Run relevant tests/typechecks/lint.
7. Report what changed.
8. Mention significant assumptions.
9. Flag real architectural issues instead of papering over them.
10. Do not invent APIs or provider fields.

When documentation and implementation differ:

* determine whether code or docs reflect the latest explicit requirement
* update stale documentation when appropriate

---

# 80. FIRST TASK FOR A FRESH REPOSITORY

If Slate does not yet exist, begin with Phase 0.

Do NOT integrate real sports APIs immediately.

First create a mobile-first working prototype using mock data that demonstrates:

1. Slate app shell
2. Scores tab
3. followed-entity horizontal navigation
4. For You
5. ATP/WTA
6. Tottenham
7. Red Sox
8. Diamondbacks
9. NFL
10. Yesterday / Today / Tomorrow
11. representative scheduled/live/final states for all four sports
12. specialized score cards
13. a basic event-detail page
14. Following management mock
15. Search mock
16. clean light/dark responsive design
17. installable-PWA groundwork if low-cost to add

Use realistic fictionalized/mock sports states.

Do not spend significant effort on backend architecture during this first UI prototype.

The immediate objective is:

> Determine whether Slate's navigation and scores experience is genuinely better to use than Yahoo Sports.

Once that is convincing, proceed to the canonical domain model.

---

# 81. FIRST TASK FOR AN EXISTING REPOSITORY

If a Slate repository already exists:

Before changing code:

1. inspect the repo
2. identify framework/dependencies
3. identify current architecture
4. identify existing domain types
5. identify existing routes/pages
6. identify existing tests
7. identify any provider coupling
8. identify areas inconsistent with this brief

Then provide a short implementation assessment.

Do not rewrite working code merely to match hypothetical stylistic preferences.

Prioritize differences that affect:

* product behavior
* future sports integrations
* maintainability
* provider independence
* mobile UX

---

# 82. FINAL PRODUCT PRINCIPLE

Whenever two implementation or product choices are both plausible, prefer the choice that makes Slate feel like:

> A fast personal sports scoreboard.

Not:

> A sports website.

The core experience must remain:

# What happened yesterday?

# What's happening today?

# What's happening tomorrow?

# What do the things I follow look like right now?

Everything else is secondary.
