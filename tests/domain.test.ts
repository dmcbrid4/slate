import assert from 'node:assert/strict';
import test from 'node:test';
import {
  collectionId,
  competitionGroupId,
  competitionId,
  defineCompetition,
  defineDomainGraph,
  defineEvent,
  DomainInvariantError,
  eventId,
  followId,
  ownerId,
  participantId,
  providerId,
  seasonId,
  type DomainGraph,
} from '../src/domain/index.ts';

const ids = {
  atp: competitionId('us-open-atp'),
  wta: competitionId('us-open-wta'),
  group: competitionGroupId('us-open'),
  season: seasonId('us-open-atp-2026'),
  event: eventId('alcaraz-sinner-2026'),
  alcaraz: participantId('carlos-alcaraz'),
  sinner: participantId('jannik-sinner'),
  collection: collectionId('atp-wta'),
  provider: providerId('mock-sports'),
};

function validGraph(): DomainGraph {
  return {
    sports: [{ id: 'tennis', name: 'Tennis' }],
    participants: [
      { id: ids.alcaraz, sportId: 'tennis', type: 'player', name: 'Carlos Alcaraz', shortName: 'Alcaraz', slug: 'carlos-alcaraz', countryCode: 'ES' },
      { id: ids.sinner, sportId: 'tennis', type: 'player', name: 'Jannik Sinner', shortName: 'Sinner', slug: 'jannik-sinner', countryCode: 'IT' },
    ],
    competitionGroups: [{ id: ids.group, sportId: 'tennis', name: 'US Open', shortName: 'US Open', slug: 'us-open' }],
    competitions: [
      { id: ids.atp, sportId: 'tennis', name: 'US Open Men', shortName: 'US Open', slug: 'us-open-men', category: 'men', competitionGroupId: ids.group },
      { id: ids.wta, sportId: 'tennis', name: 'US Open Women', shortName: 'US Open', slug: 'us-open-women', category: 'women', competitionGroupId: ids.group },
    ],
    seasons: [{ id: ids.season, competitionId: ids.atp, name: '2026', startsOn: '2026-08-24', endsOn: '2026-09-13' }],
    events: [{
      id: ids.event,
      sportId: 'tennis',
      competitionId: ids.atp,
      seasonId: ids.season,
      startsAt: '2026-09-06T19:00:00Z',
      status: 'live',
      venueName: 'Arthur Ashe Stadium',
      state: {
        round: 'Quarterfinal',
        court: 'Arthur Ashe Stadium',
        bestOf: 5,
        sets: [
          { games: [6, 4], status: 'complete' },
          { games: [3, 4], status: 'in_progress' },
        ],
        points: ['40', '30'],
        servingParticipantId: ids.sinner,
      },
    }],
    eventParticipants: [
      { eventId: ids.event, participantId: ids.alcaraz, side: 0, order: 0, seed: 2 },
      { eventId: ids.event, participantId: ids.sinner, side: 1, order: 0, seed: 1 },
    ],
    collections: [{ id: ids.collection, name: 'ATP/WTA', shortName: 'ATP/WTA', slug: 'atp-wta' }],
    collectionMembers: [
      { collectionId: ids.collection, target: { type: 'competition_group', id: ids.group }, position: 0 },
    ],
    follows: [
      { id: followId('follow-atp-wta'), ownerId: ownerId('local-primary'), target: { type: 'collection', id: ids.collection }, position: 0 },
    ],
    providers: [{ id: ids.provider, name: 'Mock Sports' }],
    providerMappings: [{
      providerId: ids.provider,
      providerEntityType: 'event',
      providerEntityId: 'external-100',
      canonical: { type: 'event', id: ids.event },
    }],
  };
}

test('Slate IDs reject empty, uppercase, and provider-shaped values', () => {
  assert.throws(() => participantId(''), TypeError);
  assert.throws(() => participantId('Carlos-Alcaraz'), TypeError);
  assert.throws(() => participantId('sr:competitor:123'), TypeError);
  assert.equal(participantId('carlos-alcaraz'), 'carlos-alcaraz');
});

test('domain constructors validate timestamps and sport score state', () => {
  const competition = validGraph().competitions[0];
  assert.doesNotThrow(() => defineCompetition(competition));
  const event = validGraph().events[0];
  if (event.sportId !== 'tennis') throw new Error('Expected the canonical tennis event fixture.');
  assert.doesNotThrow(() => defineEvent(event));
  assert.throws(
    () => defineEvent({ ...event, startsAt: '2026-09-06T19:00:00' }),
    (error: unknown) => error instanceof DomainInvariantError && error.code === 'invalid_instant',
  );
  assert.throws(
    () => defineEvent({ ...event, state: { ...event.state, sets: [{ games: [3, 4], status: 'in_progress' }, { games: [0, 0], status: 'complete' }] } }),
    (error: unknown) => error instanceof DomainInvariantError && error.code === 'invalid_score_state',
  );
});

test('canonical constructors validate each supported sport state', () => {
  const base = {
    competitionId: competitionId('example-competition'),
    startsAt: '2026-09-06T19:00:00Z',
    status: 'live' as const,
  };
  assert.doesNotThrow(() => defineEvent({
    ...base,
    id: eventId('soccer-event'),
    sportId: 'soccer',
    state: { score: [2, 1], period: 'second_half', minute: 72, goals: [{ side: 0, minute: 18 }] },
  }));
  assert.doesNotThrow(() => defineEvent({
    ...base,
    id: eventId('baseball-event'),
    sportId: 'baseball',
    state: { score: [3, 5], innings: [[0, 0, 1], [2, 0, 0]], inning: 7, half: 'bottom', outs: 1, balls: 1, strikes: 2, bases: [true, false, true] },
  }));
  assert.doesNotThrow(() => defineEvent({
    ...base,
    id: eventId('football-event'),
    sportId: 'football',
    state: { score: [17, 20], quarters: [[0, 10, 7, 0], [7, 3, 7, 3]], quarter: 4, clock: '6:32', down: 2, distance: 7 },
  }));
  assert.throws(
    () => defineEvent({ ...base, id: eventId('bad-baseball-event'), sportId: 'baseball', state: { innings: [[], []], outs: 3 } }),
    (error: unknown) => error instanceof DomainInvariantError && error.code === 'invalid_score_state',
  );
});

test('a valid unified tennis graph satisfies canonical invariants', () => {
  assert.doesNotThrow(() => defineDomainGraph(validGraph()));
});

test('events and competition groups must share a sport', () => {
  const graph = validGraph();
  const competitions = graph.competitions.map((competition, index) => index === 0 ? { ...competition, sportId: 'soccer' as const } : competition);
  assert.throws(
    () => defineDomainGraph({ ...graph, sports: [...graph.sports, { id: 'soccer', name: 'Soccer' }], competitions }),
    (error: unknown) => error instanceof DomainInvariantError && error.code === 'sport_mismatch',
  );
});

test('event participants must exist, match the event sport, and occupy unique positions', () => {
  const graph = validGraph();
  assert.throws(
    () => defineDomainGraph({ ...graph, eventParticipants: [...graph.eventParticipants, { ...graph.eventParticipants[1], participantId: ids.alcaraz }] }),
    (error: unknown) => error instanceof DomainInvariantError && error.code === 'duplicate_position',
  );
  assert.throws(
    () => defineDomainGraph({ ...graph, eventParticipants: graph.eventParticipants.slice(0, 1) }),
    (error: unknown) => error instanceof DomainInvariantError && error.code === 'missing_event_side',
  );
  assert.throws(
    () => defineDomainGraph({ ...graph, eventParticipants: [...graph.eventParticipants, { ...graph.eventParticipants[0], side: 1, order: 1 }] }),
    (error: unknown) => error instanceof DomainInvariantError && error.code === 'duplicate_event_participant',
  );
});

test('follow targets and positions are valid per owner', () => {
  const graph = validGraph();
  const duplicate = { ...graph.follows[0], id: followId('follow-us-open'), target: { type: 'competition_group' as const, id: ids.group } };
  assert.throws(
    () => defineDomainGraph({ ...graph, follows: [...graph.follows, duplicate] }),
    (error: unknown) => error instanceof DomainInvariantError && error.code === 'duplicate_position',
  );
});

test('provider identities are unique and point to canonical records', () => {
  const graph = validGraph();
  const duplicate = { ...graph.providerMappings[0], canonical: { type: 'participant' as const, id: ids.alcaraz } };
  assert.throws(
    () => defineDomainGraph({ ...graph, providerMappings: [...graph.providerMappings, duplicate] }),
    (error: unknown) => error instanceof DomainInvariantError && error.code === 'duplicate_provider_identity',
  );
});
