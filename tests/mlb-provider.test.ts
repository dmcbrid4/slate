import assert from 'node:assert/strict';
import test from 'node:test';
import { decodeMlbSchedule, MlbDecodeError } from '../src/providers/mlb/decoder.ts';

const game = {
  gamePk: 9001,
  gameDate: '2026-09-09T23:10:00Z',
  status: { abstractGameState: 'Live', detailedState: 'In Progress' },
  venue: { name: 'Chase Field' },
  teams: {
    away: { team: { id: 109, name: 'Arizona Diamondbacks', abbreviation: 'AZ' }, probablePitcher: { fullName: 'Zac Gallen' } },
    home: { team: { id: 119, name: 'Los Angeles Dodgers', abbreviation: 'LAD' }, probablePitcher: { fullName: 'Yoshinobu Yamamoto' } },
  },
  linescore: {
    currentInning: 7, inningHalf: 'Bottom', outs: 1, balls: 2, strikes: 1,
    teams: { away: { runs: 3 }, home: { runs: 4 } },
    innings: [{ away: { runs: 0 }, home: { runs: 1 } }, { away: { runs: 2 }, home: { runs: 0 } }],
    offense: { batter: { fullName: 'Corbin Carroll' }, first: {}, second: null, third: {} },
    defense: { pitcher: { fullName: 'Evan Phillips' } },
  },
};

test('MLB schedule decoder preserves live linescore state and team identity', () => {
  const [decoded] = decodeMlbSchedule({ dates: [{ date: '2026-09-09', games: [game] }] });
  assert.deepEqual(decoded, {
    id: 9001,
    start: '2026-09-09T23:10:00Z',
    status: 'live',
    venue: 'Chase Field',
    away: { id: 109, name: 'Arizona Diamondbacks', abbreviation: 'AZ' },
    home: { id: 119, name: 'Los Angeles Dodgers', abbreviation: 'LAD' },
    score: [3, 4], innings: [[0, 2], [1, 0]], inning: 7, half: 'Bottom', outs: 1, balls: 2, strikes: 1,
    bases: [true, false, true], batter: 'Corbin Carroll', pitcher: 'Evan Phillips', probablePitchers: ['Zac Gallen', 'Yoshinobu Yamamoto'],
  });
});

test('MLB schedule decoder maps terminal and deferred game states', () => {
  const decoded = decodeMlbSchedule({ dates: [{ games: [
    { ...game, gamePk: 9002, status: { abstractGameState: 'Final', detailedState: 'Final' }, linescore: undefined },
    { ...game, gamePk: 9003, status: { abstractGameState: 'Postponed', detailedState: 'Postponed' }, linescore: undefined },
  ] }] });
  assert.deepEqual(decoded.map(item => item.status), ['final', 'postponed']);
  assert.deepEqual(decoded.map(item => item.innings), [[[], []], [[], []]]);
});

test('MLB schedule decoder tolerates nullable pregame runs', () => {
  const [decoded] = decodeMlbSchedule({ dates: [{ games: [{ ...game, gamePk: 9004, status: { abstractGameState: 'Preview', detailedState: 'Scheduled' }, linescore: { teams: { away: { runs: null }, home: { runs: null } }, innings: [] } }] }] });
  assert.equal(decoded.score, undefined);
  assert.deepEqual(decoded.innings, [[], []]);
});

test('MLB schedule decoder rejects malformed game identities with a safe path', () => {
  assert.throws(() => decodeMlbSchedule({ dates: [{ games: [{ ...game, gamePk: 0 }] }] }), (error: unknown) => error instanceof MlbDecodeError && error.path === '$.dates[0].games[0].gamePk');
});
