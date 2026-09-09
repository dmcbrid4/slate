import type { MockProviderPayload } from './types.ts';

// Invented contract data for exercising Slate's provider boundary. It does not model a real vendor.
export const mockProviderFixture = {
  schemaVersion: 1,
  participants: [
    { externalId: 'club-101', slateKey: 'tottenham', sport: 'soccer', type: 'team', name: 'Tottenham Hotspur', shortName: 'Tottenham' },
    { externalId: 'club-202', slateKey: 'roma', sport: 'soccer', type: 'team', name: 'Roma', shortName: 'Roma' },
    { externalId: 'player-301', slateKey: 'carlos-alcaraz', sport: 'tennis', type: 'player', name: 'Carlos Alcaraz', shortName: 'Alcaraz', countryCode: 'ES' },
    { externalId: 'player-302', slateKey: 'jannik-sinner', sport: 'tennis', type: 'player', name: 'Jannik Sinner', shortName: 'Sinner', countryCode: 'IT' },
    { externalId: 'player-303', slateKey: 'coco-gauff', sport: 'tennis', type: 'player', name: 'Coco Gauff', shortName: 'Gauff', countryCode: 'US' },
    { externalId: 'player-304', slateKey: 'naomi-osaka', sport: 'tennis', type: 'player', name: 'Naomi Osaka', shortName: 'Osaka', countryCode: 'JP' },
    { externalId: 'club-401', slateKey: 'new-york-yankees', sport: 'baseball', type: 'team', name: 'New York Yankees', shortName: 'Yankees' },
    { externalId: 'club-402', slateKey: 'red-sox', sport: 'baseball', type: 'team', name: 'Boston Red Sox', shortName: 'Red Sox' },
    { externalId: 'player-403', slateKey: 'jarren-duran', sport: 'baseball', type: 'player', name: 'Jarren Duran', shortName: 'Duran' },
    { externalId: 'player-404', slateKey: 'garrett-crochet', sport: 'baseball', type: 'player', name: 'Garrett Crochet', shortName: 'Crochet' },
    { externalId: 'club-501', slateKey: 'new-england-patriots', sport: 'football', type: 'team', name: 'New England Patriots', shortName: 'Patriots' },
    { externalId: 'club-502', slateKey: 'buffalo-bills', sport: 'football', type: 'team', name: 'Buffalo Bills', shortName: 'Bills' },
  ],
  competitionGroups: [
    { externalId: 'draw-men-901', slateKey: 'us-open', sport: 'tennis', name: 'US Open', shortName: 'US Open' },
    { externalId: 'draw-women-902', slateKey: 'us-open', sport: 'tennis', name: 'US Open', shortName: 'US Open' },
  ],
  competitions: [
    { externalId: 'competition-11', slateKey: 'europa-league', sport: 'soccer', name: 'UEFA Europa League', shortName: 'Europa League', category: 'men' },
    { externalId: 'competition-21', slateKey: 'us-open-atp', sport: 'tennis', name: 'US Open Men', shortName: 'US Open', category: 'men', groupExternalId: 'draw-men-901' },
    { externalId: 'competition-22', slateKey: 'us-open-wta', sport: 'tennis', name: 'US Open Women', shortName: 'US Open', category: 'women', groupExternalId: 'draw-women-902' },
    { externalId: 'competition-31', slateKey: 'mlb', sport: 'baseball', name: 'MLB', shortName: 'MLB' },
    { externalId: 'competition-41', slateKey: 'nfl', sport: 'football', name: 'NFL', shortName: 'NFL' },
  ],
  seasons: [
    { externalId: 'season-11', slateKey: 'europa-league-2026-27', competitionExternalId: 'competition-11', name: '2026–27' },
    { externalId: 'season-21', slateKey: 'us-open-atp-2026', competitionExternalId: 'competition-21', name: '2026' },
    { externalId: 'season-22', slateKey: 'us-open-wta-2026', competitionExternalId: 'competition-22', name: '2026' },
    { externalId: 'season-31', slateKey: 'mlb-2026', competitionExternalId: 'competition-31', name: '2026' },
    { externalId: 'season-41', slateKey: 'nfl-2026', competitionExternalId: 'competition-41', name: '2026' },
  ],
  events: [
    {
      externalId: 'event-1001', slateKey: 'tottenham-roma-europa-2026', sport: 'soccer', competitionExternalId: 'competition-11', seasonExternalId: 'season-11',
      startsAt: '2026-09-17T19:00:00Z', status: 'not_started', venue: 'Tottenham Hotspur Stadium',
      participants: [{ externalId: 'club-101' }, { externalId: 'club-202' }], state: { goals: [] },
    },
    {
      externalId: 'event-2001', slateKey: 'alcaraz-sinner-us-open-2026', sport: 'tennis', competitionExternalId: 'competition-21', seasonExternalId: 'season-21',
      startsAt: '2026-09-06T19:00:00Z', status: 'in_progress', venue: 'Arthur Ashe Stadium',
      participants: [{ externalId: 'player-301', seed: 2 }, { externalId: 'player-302', seed: 1 }],
      state: { round: 'Quarterfinal', court: 'Arthur Ashe Stadium', bestOf: 5, sets: [{ games: [6, 4], status: 'done' }, { games: [3, 4], status: 'playing' }], points: ['40', '30'], serverExternalId: 'player-302', durationSeconds: 6120 },
    },
    {
      externalId: 'event-2002', slateKey: 'gauff-osaka-us-open-2026', sport: 'tennis', competitionExternalId: 'competition-22', seasonExternalId: 'season-22',
      startsAt: '2026-09-06T16:00:00Z', status: 'complete', venue: 'Arthur Ashe Stadium',
      participants: [{ externalId: 'player-303', seed: 3 }, { externalId: 'player-304' }],
      state: { round: 'Quarterfinal', court: 'Arthur Ashe Stadium', bestOf: 3, sets: [{ games: [6, 3], status: 'done' }, { games: [7, 5], status: 'done' }], durationSeconds: 5280 },
    },
    {
      externalId: 'event-3001', slateKey: 'yankees-red-sox-2026-09-06', sport: 'baseball', competitionExternalId: 'competition-31', seasonExternalId: 'season-31',
      startsAt: '2026-09-06T17:35:00Z', status: 'in_progress', venue: 'Fenway Park',
      participants: [{ externalId: 'club-401' }, { externalId: 'club-402' }],
      state: { score: [3, 5], innings: [[0, 1, 0, 2, 0, 0, 0], [2, 0, 1, 0, 2, 0, null]], inning: 7, half: 'lower', outs: 1, balls: 1, strikes: 2, bases: [true, false, true], batterExternalId: 'player-403', pitcherExternalId: 'player-404', hits: [7, 9], errors: [0, 1] },
    },
    {
      externalId: 'event-4001', slateKey: 'patriots-bills-2026-09-06', sport: 'football', competitionExternalId: 'competition-41', seasonExternalId: 'season-41',
      startsAt: '2026-09-06T17:00:00Z', status: 'in_progress', venue: 'Highmark Stadium',
      participants: [{ externalId: 'club-501' }, { externalId: 'club-502' }],
      state: { score: [17, 20], quarters: [[0, 10, 7, 0], [7, 3, 7, 3]], quarter: 4, clock: '6:32', possessionExternalId: 'club-502', down: 2, distance: 7, fieldPosition: { territoryExternalId: 'club-501', yardLine: 42 } },
    },
  ],
} as const satisfies MockProviderPayload;
