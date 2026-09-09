import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { createMappingReader, isNewerObservation, NormalizationError } from '../src/application/normalization.ts';
import { defineDomainGraph, participantId, providerId } from '../src/domain/index.ts';
import type { ProviderEntityMapping } from '../src/domain/model.ts';
import { mockProviderDecoder, MockProviderDecodeError, mockProviderFixture, mockProviderNormalizer } from '../src/providers/mock/index.ts';

const mockProviderId = providerId('mock-sports');

function normalize(input: unknown = mockProviderFixture, mappings: readonly ProviderEntityMapping[] = []) {
  const payload = mockProviderDecoder.parse(input);
  return mockProviderNormalizer.normalize(payload, {
    providerId: mockProviderId,
    observedAt: '2026-09-06T20:42:00Z',
    mappings: createMappingReader(mappings),
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

test('unknown provider values and references are rejected at the boundary', () => {
  const unknownStatus = {
    ...mockProviderFixture,
    events: mockProviderFixture.events.map(event => event.externalId === 'event-1001' ? { ...event, status: 'abandoned' } : event),
  };
  assert.throws(
    () => mockProviderDecoder.parse(unknownStatus),
    (error: unknown) => error instanceof MockProviderDecodeError && error.path === '$.events[0].status',
  );

  const unknownParticipant = {
    ...mockProviderFixture,
    events: mockProviderFixture.events.map(event => event.externalId === 'event-1001'
      ? { ...event, participants: [{ externalId: 'club-101' }, { externalId: 'missing-club' }] }
      : event),
  };
  assert.throws(
    () => normalize(unknownParticipant),
    (error: unknown) => error instanceof NormalizationError && error.code === 'unknown_reference',
  );
});

test('every mock status maps in one place to its canonical event status', () => {
  const expected = {
    not_started: 'scheduled',
    in_progress: 'live',
    complete: 'final',
    delayed: 'postponed',
    called_off: 'cancelled',
    paused: 'suspended',
  } as const;

  for (const [providerStatus, canonicalStatus] of Object.entries(expected)) {
    const payload = {
      ...mockProviderFixture,
      events: mockProviderFixture.events.map(event => event.externalId === 'event-1001' ? { ...event, status: providerStatus } : event),
    };
    const event = normalize(payload).records.find(write => write.type === 'event' && write.record.id === 'tottenham-roma-europa-2026');
    assert.equal(event?.type, 'event');
    if (event?.type === 'event') assert.equal(event.record.status, canonicalStatus);
  }
});

test('reprocessing an observation reuses mappings and emits one write per canonical identity', () => {
  const first = normalize();
  const second = normalize(mockProviderFixture, first.mappings);

  assert.deepEqual(second.records, first.records);
  assert.deepEqual(second.mappings, []);
  assert.equal(second.records.length, new Set(second.records.map(write => {
    if (write.type === 'event_participant') return `${write.type}:${write.record.eventId}:${write.record.side}:${write.record.order}`;
    return `${write.type}:${write.record.id}`;
  })).size);
});

test('normalization retains each sport-specific state without universal score fields', () => {
  const events = normalize().records.filter(write => write.type === 'event').map(write => write.record);
  const soccer = events.find(event => event.sportId === 'soccer');
  const tennis = events.find(event => event.sportId === 'tennis' && event.competitionId === 'us-open-atp');
  const baseball = events.find(event => event.sportId === 'baseball');
  const football = events.find(event => event.sportId === 'football');

  assert.ok(soccer?.sportId === 'soccer' && Array.isArray(soccer.state.goals));
  assert.ok(tennis?.sportId === 'tennis' && tennis.state.sets.at(-1)?.status === 'in_progress');
  assert.ok(baseball?.sportId === 'baseball' && baseball.state.inning === 7 && baseball.state.bases?.[2]);
  assert.ok(football?.sportId === 'football' && football.state.possessionParticipantId === 'buffalo-bills' && football.state.down === 2);
});

test('optional provider data stays absent and is reported as structured degradation', () => {
  const partial = {
    ...mockProviderFixture,
    events: mockProviderFixture.events.map(event => {
      if (event.externalId !== 'event-3001') return event;
      const { venue, state: _state, ...base } = event;
      void venue;
      return { ...base, state: { innings: _state.innings } };
    }),
  };
  const batch = normalize(partial);
  const baseball = batch.records.find(write => write.type === 'event' && write.record.id === 'yankees-red-sox-2026-09-06');

  assert.equal(baseball?.type, 'event');
  if (baseball?.type === 'event' && baseball.record.sportId === 'baseball') {
    assert.equal(baseball.record.venueName, undefined);
    assert.equal(baseball.record.state.inning, undefined);
    assert.equal(baseball.record.state.outs, undefined);
    assert.equal(baseball.record.state.bases, undefined);
  }
  assert.deepEqual(batch.warnings.filter(warning => warning.externalEventId === 'event-3001').map(warning => warning.code), ['missing_venue', 'missing_live_detail']);
});

test('only newer provider observations are eligible to replace stored state', () => {
  assert.equal(isNewerObservation('2026-09-06T20:42:00Z', undefined), true);
  assert.equal(isNewerObservation('2026-09-06T20:43:00Z', '2026-09-06T20:42:00Z'), true);
  assert.equal(isNewerObservation('2026-09-06T20:42:00Z', '2026-09-06T20:42:00Z'), false);
  assert.equal(isNewerObservation('2026-09-06T20:41:59Z', '2026-09-06T20:42:00Z'), false);
  assert.throws(
    () => isNewerObservation('2026-09-06T20:42:00', undefined),
    (error: unknown) => error instanceof NormalizationError && error.code === 'invalid_observation_time',
  );
});

function sourceFiles(directory: string): readonly string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? sourceFiles(path) : path.endsWith('.ts') || path.endsWith('.tsx') ? [path] : [];
  });
}

test('provider-specific types do not leak into canonical or presentation layers', () => {
  const protectedFiles = ['src/domain', 'src/read-models', 'src/components', 'app'].flatMap(sourceFiles);
  for (const file of protectedFiles) {
    const source = readFileSync(file, 'utf8');
    assert.doesNotMatch(source, /from\s+['"][^'"]*providers\//, `${file} imports a provider module.`);
    assert.ok(!source.includes('MockProvider'), `${file} references a mock provider type.`);
  }
});
