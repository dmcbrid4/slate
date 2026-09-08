import { participants as p } from './entities.ts';
import type { Fixture } from './types.ts';

// Fictionalized showcase weekend. These are not historical results or real schedules.
// Freeze the reference instant so the same states remain available on every visit.
export const DEMO_NOW = '2026-09-06T20:42:00Z';
export const fixtures: Fixture[] = [
  {
    id: 'tot-liv', sport: 'soccer', competition: 'Premier League', competitionId: 'premier-league',
    start: '2026-09-06T19:15:00Z', status: 'live', participants: [p.spurs, p.liverpool],
    follows: ['tottenham', 'liverpool', 'premier-league'], venue: 'Tottenham Hotspur Stadium',
    score: [2, 1], minute: '72′', goals: [
      { minute: '18′', player: 'Solanke', side: 0 }, { minute: '41′', player: 'Salah', side: 1 }, { minute: '63′', player: 'Kulusevski', side: 0 },
    ],
  },
  {
    id: 'che-bha', sport: 'soccer', competition: 'Premier League', competitionId: 'premier-league',
    start: '2026-09-06T15:00:00Z', status: 'final', participants: [p.chelsea, p.brighton],
    follows: ['premier-league'], venue: 'Stamford Bridge', score: [1, 1],
    goals: [{ minute: '26′', player: 'Palmer', side: 0 }, { minute: '68′', player: 'Mitoma', side: 1 }],
  },
  {
    id: 'ars-avl', sport: 'soccer', competition: 'Premier League', competitionId: 'premier-league',
    start: '2026-09-05T16:30:00Z', status: 'final', participants: [p.arsenal, p.villa],
    follows: ['premier-league'], venue: 'Emirates Stadium', score: [2, 0],
    context: 'Arsenal moves up to 2nd.',
    goals: [{ minute: '34′', player: 'Saka', side: 0 }, { minute: '77′', player: 'Havertz', side: 0 }],
  },
  {
    id: 'nfo-whu', sport: 'soccer', competition: 'Premier League', competitionId: 'premier-league',
    start: '2026-09-07T19:00:00Z', status: 'scheduled', participants: [p.forest, p.westham],
    follows: ['premier-league'], venue: 'The City Ground', goals: [],
  },
  {
    id: 'alcaraz-sinner', sport: 'tennis', competition: 'US Open', competitionId: 'us-open',
    start: '2026-09-06T19:00:00Z', status: 'live', participants: [p.alcaraz, p.sinner],
    follows: ['atp-wta', 'us-open', 'alcaraz', 'sinner'], venue: 'Arthur Ashe Stadium',
    category: 'Men', round: 'Quarterfinal', sets: [[6, 3], [4, 4]], points: ['40', '30'], server: 1, duration: '1h 42m',
  },
  {
    id: 'gauff-osaka', sport: 'tennis', competition: 'US Open', competitionId: 'us-open',
    start: '2026-09-06T16:00:00Z', status: 'final', participants: [p.gauff, p.osaka],
    follows: ['atp-wta', 'us-open', 'gauff'], venue: 'Arthur Ashe Stadium',
    category: 'Women', round: 'Quarterfinal', sets: [[6, 7], [3, 5]], duration: '1h 36m',
    context: 'Gauff advances to the semifinal.',
  },
  {
    id: 'sabalenka-zheng', sport: 'tennis', competition: 'US Open', competitionId: 'us-open',
    start: '2026-09-06T23:00:00Z', status: 'scheduled', participants: [p.sabalenka, p.zheng],
    follows: ['atp-wta', 'us-open'], venue: 'Arthur Ashe Stadium',
    category: 'Women', round: 'Quarterfinal', sets: [[], []],
  },
  {
    id: 'fritz-draper', sport: 'tennis', competition: 'US Open', competitionId: 'us-open',
    start: '2026-09-07T18:00:00Z', status: 'scheduled', participants: [p.fritz, p.draper],
    follows: ['atp-wta', 'us-open'], venue: 'Arthur Ashe Stadium',
    category: 'Men', round: 'Quarterfinal', sets: [[], []],
  },
  {
    id: 'pegula-paolini', sport: 'tennis', competition: 'US Open', competitionId: 'us-open',
    start: '2026-09-07T16:00:00Z', status: 'scheduled', participants: [p.pegula, p.paolini],
    follows: ['atp-wta', 'us-open'], venue: 'Louis Armstrong Stadium',
    category: 'Women', round: 'Quarterfinal', sets: [[], []],
  },
  {
    id: 'fritz-rublev-r16', sport: 'tennis', competition: 'US Open', competitionId: 'us-open',
    start: '2026-09-05T18:00:00Z', status: 'final', participants: [p.fritz, { name: 'Andrey Rublev', short: 'Rublev', mark: 'RU', color: 'blue', seed: 8 }],
    follows: ['atp-wta', 'us-open'], venue: 'Louis Armstrong Stadium',
    category: 'Men', round: 'Round of 16', sets: [[6, 4, 6, 6], [3, 6, 4, 2]], duration: '2h 48m',
    context: 'Fritz reaches the quarterfinal.',
  },
  {
    id: 'pegula-r16', sport: 'tennis', competition: 'US Open', competitionId: 'us-open',
    start: '2026-09-05T16:00:00Z', status: 'final', participants: [p.pegula, { name: 'Emma Navarro', short: 'Navarro', mark: 'US', color: 'blue', seed: 10 }],
    follows: ['atp-wta', 'us-open'], venue: 'Arthur Ashe Stadium',
    category: 'Women', round: 'Round of 16', sets: [[6, 6], [4, 2]], duration: '1h 22m',
    context: 'Pegula reaches the quarterfinal.',
  },
  {
    id: 'nyy-bos', sport: 'baseball', competition: 'MLB', competitionId: 'mlb',
    start: '2026-09-06T18:10:00Z', status: 'live', participants: [p.yankees, p.boston],
    follows: ['red-sox'], venue: 'Fenway Park', score: [3, 5], inning: 7, half: 'Bottom', outs: 1,
    bases: [true, false, true], batter: 'Duran', count: '1–2', pitchers: ['Gerrit Cole', 'Garrett Crochet'],
    innings: [[0, 0, 1, 0, 2, 0, 0], [2, 0, 0, 1, 0, 2]], hits: [7, 9], errors: [0, 0],
  },
  {
    id: 'az-lad', sport: 'baseball', competition: 'MLB', competitionId: 'mlb',
    start: '2026-09-06T23:10:00Z', status: 'scheduled', participants: [p.arizona, p.dodgers],
    follows: ['diamondbacks'], venue: 'Dodger Stadium', pitchers: ['Zac Gallen', 'Yoshinobu Yamamoto'],
  },
  {
    id: 'nyy-bos-yesterday', sport: 'baseball', competition: 'MLB', competitionId: 'mlb',
    start: '2026-09-05T17:10:00Z', status: 'final', participants: [p.yankees, p.boston],
    follows: ['red-sox'], venue: 'Fenway Park', score: [2, 4], pitchers: ['Max Fried', 'Brayan Bello'],
    decision: 'W: Bello · L: Fried · SV: Whitlock', context: 'Boston moves 1.5 games ahead in the Wild Card race.',
    innings: [[0, 0, 0, 1, 0, 1, 0, 0, 0], [0, 2, 0, 0, 1, 0, 1, 0]], hits: [6, 8], errors: [1, 0],
  },
  {
    id: 'az-lad-yesterday', sport: 'baseball', competition: 'MLB', competitionId: 'mlb',
    start: '2026-09-05T20:10:00Z', status: 'final', participants: [p.arizona, p.dodgers],
    follows: ['diamondbacks'], venue: 'Dodger Stadium', score: [6, 3], pitchers: ['Merrill Kelly', 'Tyler Glasnow'],
    decision: 'W: Kelly · L: Glasnow · SV: Martinez', context: 'Arizona evens the series, 1–1.',
    innings: [[0, 1, 0, 0, 3, 0, 0, 2, 0], [1, 0, 0, 0, 0, 2, 0, 0, 0]], hits: [10, 7], errors: [0, 1],
  },
  {
    id: 'bos-bal-tomorrow', sport: 'baseball', competition: 'MLB', competitionId: 'mlb',
    start: '2026-09-07T23:05:00Z', status: 'scheduled', participants: [p.boston, p.orioles],
    follows: ['red-sox'], venue: 'Oriole Park at Camden Yards', pitchers: ['Tanner Houck', 'Trevor Rogers'],
  },
  {
    id: 'sd-az-tomorrow', sport: 'baseball', competition: 'MLB', competitionId: 'mlb',
    start: '2026-09-07T20:10:00Z', status: 'scheduled', participants: [p.padres, p.arizona],
    follows: ['diamondbacks'], venue: 'Chase Field', pitchers: ['Michael King', 'Brandon Pfaadt'],
  },
  {
    id: 'ne-buf', sport: 'football', competition: 'NFL', competitionId: 'nfl',
    start: '2026-09-06T17:00:00Z', status: 'live', participants: [p.patriots, p.bills],
    follows: ['nfl', 'bills'], venue: 'Highmark Stadium', score: [17, 20], clock: 'Q4 · 6:32', possession: 1,
    situation: '2nd & 7 · NE 42', quarters: [[0, 10, 7, 0], [7, 3, 7, 3]],
  },
  {
    id: 'dal-phi', sport: 'football', competition: 'NFL', competitionId: 'nfl',
    start: '2026-09-06T17:00:00Z', status: 'final', participants: [p.cowboys, p.eagles],
    follows: ['nfl'], venue: 'Lincoln Financial Field', score: [21, 28],
    quarters: [[7, 7, 0, 7], [0, 14, 7, 7]], context: 'Philadelphia opens the season with a division win.',
  },
  {
    id: 'bal-kc', sport: 'football', competition: 'NFL', competitionId: 'nfl',
    start: '2026-09-08T00:15:00Z', status: 'scheduled', participants: [p.ravens, p.chiefs],
    follows: ['nfl'], venue: 'Arrowhead Stadium',
  },
];
