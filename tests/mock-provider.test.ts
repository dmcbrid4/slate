import assert from 'node:assert/strict';
import test from 'node:test';
import { createMappingReader } from '../src/application/normalization.ts';
import { defineDomainGraph, participantId, providerId } from '../src/domain/index.ts';
import { mockProviderDecoder, MockProviderDecodeError, mockProviderFixture, mockProviderNormalizer } from '../src/providers/mock/index.ts';

const mockProviderId = providerId('mock-sports');

function normalize(input: unknown = mockProviderFixture) {
  const payload = mockProviderDecoder.parse(input);
  return mockProviderNormalizer.normalize(payload, {
    providerId: mockProviderId,
    observedAt: '2026-09-06T20:42:00Z',
    mappings: createMappingReader([]),
  });
}

test('mock payload decodes from unknown and normalizes to canonical writes', () => {
  const batch = normalize(structuredClone(mockProviderFixture));
  const events = batch.records.filter(write => write.type === 'event').map(write => write.record);

  assert.equal(events.length, mockProviderFixture.events.length);
  assert.deepEqual(new Set(events.map(event => event.sportId)), new Set(['soccer', 'tennis', 'baseball', 'football']));
  assert.deepEqual(new Set(events.map(event => event.status)), new Set(['scheduled', 'live', 'final']));
  assert.equal(batch.providerId, mockProviderId);
  assert.equal(batch.observedAt, '2026-09-06T20:42:00Z');
  assert.deepEqual(batch.warnings, []);
  assert.doesNotThrow(() => defineDomainGraph({
    sports: [
      { id: 'soccer', name: 'Soccer' },
      { id: 'tennis', name: 'Tennis' },
      { id: 'baseball', name: 'Baseball' },
      { id: 'football', name: 'Football' },
    ],
    participants: batch.records.filter(write => write.type === 'participant').map(write => write.record),
    competitionGroups: batch.records.filter(write => write.type === 'competition_group').map(write => write.record),
    competitions: batch.records.filter(write => write.type === 'competition').map(write => write.record),
    seasons: batch.records.filter(write => write.type === 'season').map(write => write.record),
    events,
    eventParticipants: batch.records.filter(write => write.type === 'event_participant').map(write => write.record),
    collections: [],
    collectionMembers: [],
    follows: [],
    providers: [{ id: mockProviderId, name: 'Mock Sports' }],
    providerMappings: batch.mappings,
  }));
});

test('mock normalization keeps provider identity outside canonical IDs and unifies US Open groups', () => {
  const batch = normalize();
  const groupWrites = batch.records.filter(write => write.type === 'competition_group');
  const groupMappings = batch.mappings.filter(mapping => mapping.providerEntityType === 'competition_group');
  const tottenham = batch.records.find(write => write.type === 'participant' && write.record.id === 'tottenham');

  assert.equal(groupWrites.length, 1);
  assert.equal(groupWrites[0].record.id, 'us-open');
  assert.equal(groupMappings.length, 2);
  assert.deepEqual(new Set(groupMappings.map(mapping => mapping.canonical.id)), new Set(['us-open']));
  assert.ok(tottenham);
  assert.ok(batch.mappings.every(mapping => mapping.providerEntityId !== mapping.canonical.id));
});

test('existing provider mappings win over the mock identity policy', () => {
  const payload = mockProviderDecoder.parse(mockProviderFixture);
  const existing = {
    providerId: mockProviderId,
    providerEntityType: 'participant',
    providerEntityId: 'club-101',
    canonical: { type: 'participant' as const, id: participantId('spurs-stable-id') },
  };
  const batch = mockProviderNormalizer.normalize(payload, {
    providerId: mockProviderId,
    observedAt: '2026-09-06T20:42:00Z',
    mappings: createMappingReader([existing]),
  });
  const tottenham = batch.records.find(write => write.type === 'participant' && write.record.name === 'Tottenham Hotspur');

  assert.ok(tottenham?.type === 'participant');
  assert.equal(tottenham.record.id, 'spurs-stable-id');
  assert.ok(!batch.mappings.some(mapping => mapping.providerEntityType === 'participant' && mapping.providerEntityId === 'club-101'));
});

test('malformed mock payloads fail in the decoder before normalization', () => {
  const malformed = { ...mockProviderFixture, events: [{ externalId: 'broken' }] };
  assert.throws(
    () => mockProviderDecoder.parse(malformed),
    (error: unknown) => error instanceof MockProviderDecodeError && error.path === '$.events[0].slateKey',
  );
});
