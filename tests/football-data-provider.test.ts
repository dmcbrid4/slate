import test from 'node:test';
import assert from 'node:assert/strict';
import { decodeFootballDataMatches, FootballDataDecodeError } from '../src/providers/football-data/decoder.ts';

const match = (status = 'IN_PLAY') => ({ id: 99, utcDate: '2026-09-09T19:00:00Z', status, minute: '72', venue: 'White Hart Lane', competition: { code: 'PL' }, homeTeam: { id: 73, name: 'Tottenham Hotspur', shortName: 'Tottenham', tla: 'TOT' }, awayTeam: { id: 64, name: 'Liverpool', shortName: 'Liverpool', tla: 'LIV' }, score: { fullTime: { home: 2, away: 1 } }, goals: [{ minute: 18, team: { id: 73 }, scorer: { name: 'Solanke' } }] });

test('football-data decoder maps status, score, and goals to Slate order', () => {
  const [decoded] = decodeFootballDataMatches({ matches: [match()] });
  assert.deepEqual(decoded.score, [1, 2]);
  assert.equal(decoded.status, 'live');
  assert.equal(decoded.goals[0]?.teamId, 73);
  assert.equal(decoded.goals[0]?.scorer, 'Solanke');
});

test('football-data decoder normalizes terminal and deferred states', () => {
  assert.equal(decodeFootballDataMatches({ matches: [match('FINISHED')] })[0]?.status, 'final');
  assert.equal(decodeFootballDataMatches({ matches: [match('POSTPONED')] })[0]?.status, 'postponed');
});

test('football-data decoder rejects malformed payloads', () => {
  assert.throws(() => decodeFootballDataMatches({ matches: [{ id: 'bad' }] }), FootballDataDecodeError);
});
