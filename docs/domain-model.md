# Slate canonical domain model

Status: Phase 1 architecture decision. Canonical primitives, invariants, seed data, and the scoreboard projector are implemented through task #23.

## Purpose

Slate needs a provider-independent model that supports soccer, unified ATP/WTA tennis, MLB, and NFL while preserving the Phase 0 product behavior. The domain should describe Slate's product, not an upstream feed or the current card components.

The canonical model has three boundaries:

```text
provider payload → normalized domain records → scoreboard read models → React components
```

Provider payloads never cross the normalization boundary. Database rows never become component props directly. Score cards continue to receive small sport-specific read models.

## Problems in the Phase 0 fixture shape

The current fixture types were intentionally temporary. They contain four useful ideas—an Event abstraction, sport-specific state, explicit timestamps, and discriminated unions—but they should not become the production schema unchanged.

- Participants are duplicated between `entities.ts` and inline fixture presentation objects.
- `Fixture.follows` stores derived relevance on the event. Relevance should be calculated from participants, competitions, competition groups, collections, and the viewer's follows.
- Competition names and IDs do not express seasons or the ATP/WTA-to-US-Open grouping.
- Presentation fields such as marks and colors sit beside identity and score state.
- There is no provider mapping or runtime normalization boundary.

Phase 1 should replace those weaknesses while keeping the working UI stable.

## Identity and time rules

- Slate owns every canonical ID. Provider IDs are never canonical IDs.
- IDs are opaque strings in application code. Seed data may use readable values, but clients must not infer meaning from them.
- User-facing routes use stable slugs where needed; a slug is not a provider ID.
- Event instants are UTC ISO timestamps in TypeScript and `timestamptz` in PostgreSQL.
- Calendar grouping happens only after converting an event instant into the viewer's timezone.
- Provider observation time is ingestion metadata, separate from the event's scheduled start time.

## Canonical records

### Sport

```ts
type SportCode = 'soccer' | 'tennis' | 'baseball' | 'football';

interface Sport {
  id: SportCode;
  name: string;
}
```

Only the four current sports are modeled. Adding a sport is an explicit product and domain change.

### Participant

```ts
interface Participant {
  id: string;
  sportId: SportCode;
  type: 'team' | 'player';
  name: string;
  shortName: string;
  slug: string;
  countryCode?: string;
  mark?: AssetRef;
}
```

Teams and players share identity behavior without assuming every participant is a team. Branding is optional so missing marks remain a supported state.

### Competition, CompetitionGroup, and Season

```ts
interface Competition {
  id: string;
  sportId: SportCode;
  name: string;
  shortName: string;
  slug: string;
  category?: 'men' | 'women' | 'mixed' | 'open';
  competitionGroupId?: string;
}

interface CompetitionGroup {
  id: string;
  sportId: SportCode;
  name: string;
  shortName: string;
  slug: string;
}

interface Season {
  id: string;
  competitionId: string;
  name: string;
  startsOn?: string;
  endsOn?: string;
}
```

`CompetitionGroup` is a stable Slate-owned user-facing grouping. For tennis, `us-open-atp` and `us-open-wta` can both belong to `us-open`. Annual editions remain seasons of the member competitions. This lets a user follow US Open across years without following a provider-specific men's or women's record.

ATP/WTA is a curated collection, not a sport and not a provider competition. NFL remains a competition because following it naturally means following that league's slate.

### Collection

```ts
interface Collection {
  id: string;
  name: string;
  shortName: string;
  slug: string;
}

interface CollectionMember {
  collectionId: string;
  target: Exclude<FollowTarget, { type: 'collection' }>;
  position: number;
}
```

Collections are small, Slate-curated lists of canonical targets. Collection nesting is intentionally excluded to avoid cycles. Phase 1 should use explicit members rather than inventing a general rules engine. The ATP/WTA collection can include the supported main-tour competitions and competition groups.

### Event and EventParticipant

```ts
type EventStatus =
  | 'scheduled'
  | 'live'
  | 'final'
  | 'postponed'
  | 'cancelled'
  | 'suspended';

interface EventCore {
  id: string;
  sportId: SportCode;
  competitionId: string;
  seasonId?: string;
  startsAt: string;
  status: EventStatus;
  venueName?: string;
}

interface EventParticipant {
  eventId: string;
  participantId: string;
  side: number;
  order: number;
  designation?: 'home' | 'away';
  result?: 'win' | 'loss' | 'draw';
  seed?: number;
}
```

`side` groups participants who compete together; `order` makes their order deterministic. Current events have two sides and one participant per side. This does not add doubles to scope, but it avoids encoding a singles-only assumption into the relationship.

The common Event contains only fields shared across the supported sports. Scores and live state use a discriminated sport-state union:

```ts
type CanonicalEvent =
  | (EventCore & { sportId: 'soccer'; state: SoccerEventState })
  | (EventCore & { sportId: 'tennis'; state: TennisEventState })
  | (EventCore & { sportId: 'baseball'; state: BaseballEventState })
  | (EventCore & { sportId: 'football'; state: FootballEventState });
```

Each state contains only that sport's score and status detail:

- Soccer: side totals, period, minute, added time, aggregate/penalty totals when present, and goal events.
- Tennis: ordered sets, current games and points, serving participant, round, court, best-of, elapsed duration, and tiebreak state when present.
- Baseball: side totals, inning lines, inning/half, outs, balls, strikes, occupied bases, probable/current pitcher and batter references, hits, errors, and decision summary when present.
- Football: side totals, quarter lines, quarter, clock, possession, down, distance, and field position when present.

The TypeScript union is canonical. PostgreSQL should store common Event fields as columns and the validated sport state as JSONB initially. This avoids a universal table full of nullable sport fields and avoids prematurely normalizing play-by-play or statistics. A field should move to a column or dedicated table only when Slate needs to query or constrain it independently.

### Follow

```ts
type FollowTarget =
  | { type: 'participant'; id: string }
  | { type: 'competition'; id: string }
  | { type: 'competition_group'; id: string }
  | { type: 'collection'; id: string };

interface Follow {
  id: string;
  ownerId: string;
  target: FollowTarget;
  position: number;
}
```

Phase 1 uses one seeded owner and does not add authentication or a User model. `ownerId` is an opaque ownership boundary that can later point to an authenticated profile. The current device-local preference remains usable while the canonical follow service is introduced.

### Provider and ProviderEntityMapping

```ts
interface Provider {
  id: string;
  name: string;
}

interface ProviderEntityMapping {
  providerId: string;
  providerEntityType: string;
  providerEntityId: string;
  canonical:
    | { type: 'participant'; id: string }
    | { type: 'competition'; id: string }
    | { type: 'competition_group'; id: string }
    | { type: 'season'; id: string }
    | { type: 'event'; id: string };
}
```

`providerId + providerEntityType + providerEntityId` is unique. Multiple provider records may map to one canonical record, which is required when separate ATP and WTA provider competitions feed one Slate competition group.

## Relevance and deduplication

Events do not contain follow IDs. A relevance service derives matches from the canonical graph:

1. Direct participant follows match EventParticipants.
2. Competition follows match `Event.competitionId`.
3. Competition-group follows match the Event's Competition group.
4. Collection follows expand through explicit CollectionMembers.
5. Results deduplicate by canonical Event ID and retain every matching follow as provenance.

The scoreboard read model returns provenance separately from the event, for example `matchedBy` and `primaryMatch`. Direct participant matches rank ahead of broad competition/group/collection matches. This preserves the current For You behavior without storing user-specific data on an Event.

## Read-model boundary

React components should consume a `ScoreboardEvent` discriminated union produced by a projector. It may remain close to the current `Fixture` card shape during migration, but it must be generated from canonical records.

The projector owns:

- resolving participant display names and marks;
- producing sport-specific score-card state;
- attaching brief deterministic Context;
- attaching relevance provenance and freshness metadata;
- preserving stable event-detail links.

Context is derived product copy, not provider-authored event data. Phase 1 keeps it deterministic and optional.

## Persistence decision

Use PostgreSQL with Drizzle for the first persistent implementation. Drizzle fits the repository's TypeScript-first style and keeps schema/migration details explicit. The initial schema should contain:

- `sports`
- `participants`
- `competition_groups`
- `competitions`
- `seasons`
- `events`
- `event_participants`
- `collections`
- `collection_members`
- `providers`
- `provider_entity_mappings`
- `follows`

Repositories sit between application services and Drizzle. UI and normalization code do not import database rows. Phase 1 should keep the existing mock prototype runnable without a database until the canonical seed and repository path are proven.

## Required invariants

- An Event's sport must match its Competition and sport-state discriminant.
- Every EventParticipant's Participant must belong to the Event's sport.
- Event participant `(eventId, side, order)` values are unique.
- A Season belongs to the same Competition referenced by its Events.
- A CompetitionGroup and each member Competition share a sport.
- Provider external identity is unique within a provider and provider entity type.
- Follow targets must exist and positions are unique per owner.
- Event start timestamps are valid and unambiguous.
- Normalizing the same provider observation twice is idempotent.
- Unknown provider status or malformed score state fails explicitly; Slate never fabricates a replacement.

## Deliberately deferred

- Real sports providers and provider-specific fields
- Authentication and multiuser behavior
- Polling, queues, workers, Redis, SSE, and WebSockets
- Standings, rankings, draws, news, statistics, and play-by-play schemas
- Conflict resolution across two live providers for the same event
- General collection rule engines
- Doubles UI and competitions outside the brief's v1 scope
