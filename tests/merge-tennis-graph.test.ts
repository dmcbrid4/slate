import assert from 'node:assert/strict';
import test from 'node:test';
import {
  collectionId,
  competitionGroupId,
  competitionId,
  defineDomainGraph,
  eventId,
  followId,
  ownerId,
  participantId,
  providerId,
  seasonId,
  type DomainGraph,
} from '../src/domain/index.ts';
import { mergeRealTennisIntoGraph } from '../src/application/merge-tennis-graph.ts';

const owner = ownerId('local-primary');

function mockLikeGraph(): DomainGraph {
  return defineDomainGraph({
    sports: [{ id: 'soccer', name: 'Soccer' }, { id: 'tennis', name: 'Tennis' }],
    participants: [
      { id: participantId('tottenham'), sportId: 'soccer', type: 'team', name: 'Tottenham Hotspur', shortName: 'Tottenham', slug: 'tottenham' },
      { id: participantId('liverpool'), sportId: 'soccer', type: 'team', name: 'Liverpool', shortName: 'Liverpool', slug: 'liverpool' },
      { id: participantId('carlos-alcaraz'), sportId: 'tennis', type: 'player', name: 'Carlos Alcaraz', shortName: 'Alcaraz', slug: 'carlos-alcaraz' },
      { id: participantId('jannik-sinner'), sportId: 'tennis', type: 'player', name: 'Jannik Sinner', shortName: 'Sinner', slug: 'jannik-sinner' },
    ],
    competitionGroups: [{ id: competitionGroupId('us-open'), sportId: 'tennis', name: 'US Open', shortName: 'US Open', slug: 'us-open' }],
    competitions: [
      { id: competitionId('premier-league'), sportId: 'soccer', name: 'Premier League', shortName: 'Premier League', slug: 'premier-league' },
      { id: competitionId('us-open-atp'), sportId: 'tennis', name: 'US Open Men', shortName: 'US Open', slug: 'us-open-men', competitionGroupId: competitionGroupId('us-open') },
    ],
    seasons: [
      { id: seasonId('premier-league-2026-27'), competitionId: competitionId('premier-league'), name: '2026-27' },
      { id: seasonId('us-open-atp-2026'), competitionId: competitionId('us-open-atp'), name: '2026' },
    ],
    events: [
      { id: eventId('tot-liv'), sportId: 'soccer', competitionId: competitionId('premier-league'), seasonId: seasonId('premier-league-2026-27'), startsAt: '2026-09-06T19:15:00Z', status: 'live', state: { goals: [] } },
      { id: eventId('alcaraz-sinner'), sportId: 'tennis', competitionId: competitionId('us-open-atp'), seasonId: seasonId('us-open-atp-2026'), startsAt: '2026-09-06T19:00:00Z', status: 'live', state: { sets: [], round: 'Quarterfinal' } },
    ],
    eventParticipants: [
      { eventId: eventId('tot-liv'), participantId: participantId('tottenham'), side: 0, order: 0 },
      { eventId: eventId('tot-liv'), participantId: participantId('liverpool'), side: 1, order: 0 },
      { eventId: eventId('alcaraz-sinner'), participantId: participantId('carlos-alcaraz'), side: 0, order: 0 },
      { eventId: eventId('alcaraz-sinner'), participantId: participantId('jannik-sinner'), side: 1, order: 0 },
    ],
    collections: [{ id: collectionId('atp-wta'), name: 'ATP/WTA', shortName: 'ATP/WTA', slug: 'atp-wta' }],
    collectionMembers: [{ collectionId: collectionId('atp-wta'), target: { type: 'competition_group', id: competitionGroupId('us-open') }, position: 0 }],
    follows: [
      { id: followId('follow-atp-wta'), ownerId: owner, target: { type: 'collection', id: collectionId('atp-wta') }, position: 0 },
      { id: followId('follow-tottenham'), ownerId: owner, target: { type: 'participant', id: participantId('tottenham') }, position: 1 },
    ],
    providers: [],
    providerMappings: [],
  });
}

function emptyGraph(): DomainGraph {
  return defineDomainGraph({
    sports: [], participants: [], competitionGroups: [], competitions: [], seasons: [], events: [],
    eventParticipants: [], collections: [], collectionMembers: [], follows: [], providers: [], providerMappings: [],
  });
}

function realTennisGraph(): DomainGraph {
  return defineDomainGraph({
    sports: [{ id: 'tennis', name: 'Tennis' }],
    participants: [
      { id: participantId('real-player-one'), sportId: 'tennis', type: 'player', name: 'Real Player One', shortName: 'One', slug: 'real-player-one' },
      { id: participantId('real-player-two'), sportId: 'tennis', type: 'player', name: 'Real Player Two', shortName: 'Two', slug: 'real-player-two' },
    ],
    competitionGroups: [{ id: competitionGroupId('us-open'), sportId: 'tennis', name: 'US Open', shortName: 'US Open', slug: 'us-open' }],
    competitions: [{ id: competitionId('us-open-atp'), sportId: 'tennis', name: 'US Open Men', shortName: 'US Open', slug: 'us-open-men', competitionGroupId: competitionGroupId('us-open') }],
    seasons: [{ id: seasonId('us-open-atp-2026'), competitionId: competitionId('us-open-atp'), name: '2026' }],
    events: [{ id: eventId('real-match-1'), sportId: 'tennis', competitionId: competitionId('us-open-atp'), seasonId: seasonId('us-open-atp-2026'), startsAt: '2026-09-09T18:00:00Z', status: 'live', state: { sets: [], round: 'Round of 16' } }],
    eventParticipants: [
      { eventId: eventId('real-match-1'), participantId: participantId('real-player-one'), side: 0, order: 0 },
      { eventId: eventId('real-match-1'), participantId: participantId('real-player-two'), side: 1, order: 0 },
    ],
    collections: [], collectionMembers: [], follows: [], providers: [{ id: providerId('live-tennis'), name: 'Live Tennis API' }], providerMappings: [],
  });
}

test('merging preserves every other sport untouched', () => {
  const merged = mergeRealTennisIntoGraph(mockLikeGraph(), realTennisGraph());

  assert.deepEqual(merged.participants.filter(p => p.sportId === 'soccer'), mockLikeGraph().participants.filter(p => p.sportId === 'soccer'));
  assert.deepEqual(merged.events.filter(e => e.sportId === 'soccer'), mockLikeGraph().events.filter(e => e.sportId === 'soccer'));
  assert.ok(merged.follows.some(follow => follow.target.type === 'participant' && follow.target.id === participantId('tottenham')));
});

test('merging fully replaces tennis: mock tennis is gone, real tennis is present', () => {
  const merged = mergeRealTennisIntoGraph(mockLikeGraph(), realTennisGraph());

  assert.equal(merged.participants.some(p => p.id === participantId('carlos-alcaraz')), false, 'mock tennis participant must not survive');
  assert.equal(merged.events.some(e => e.id === eventId('alcaraz-sinner')), false, 'mock tennis event must not survive');
  assert.ok(merged.participants.some(p => p.id === participantId('real-player-one')), 'real tennis participant must be present');
  assert.ok(merged.events.some(e => e.id === eventId('real-match-1')), 'real tennis event must be present');
  assert.deepEqual(merged.seasons.map(s => s.id).sort(), [seasonId('premier-league-2026-27'), seasonId('us-open-atp-2026')].sort());
});

test('merging keeps the ATP/WTA follow and drops only the now-empty collection member on cold start', () => {
  const merged = mergeRealTennisIntoGraph(mockLikeGraph(), emptyGraph());

  assert.ok(merged.follows.some(follow => follow.target.type === 'collection' && follow.target.id === collectionId('atp-wta')), 'the durable collection follow must survive cold start');
  assert.equal(merged.collectionMembers.length, 0, 'a collection member pointing at a not-yet-fetched competition group must be dropped, not left dangling');
  assert.equal(merged.competitionGroups.length, 0);
  assert.equal(merged.events.some(e => e.sportId === 'tennis'), false);
  assert.ok(merged.events.some(e => e.id === eventId('tot-liv')), 'other sports remain available even when tennis has no data yet');
});

test('the merged graph always satisfies canonical domain invariants', () => {
  assert.doesNotThrow(() => mergeRealTennisIntoGraph(mockLikeGraph(), realTennisGraph()));
  assert.doesNotThrow(() => mergeRealTennisIntoGraph(mockLikeGraph(), emptyGraph()));
});
