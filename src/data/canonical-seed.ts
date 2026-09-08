import {
  collectionId,
  competitionGroupId,
  competitionId,
  defineDomainGraph,
  eventId,
  followId,
  ownerId,
  participantId,
  seasonId,
} from '../domain/index.ts';
import type { CanonicalEvent, EventParticipant, Participant } from '../domain/model.ts';
import type { ScoreboardPresentation } from '../read-models/project-scoreboard.ts';

export const CANONICAL_DEMO_NOW = '2026-09-06T20:42:00Z';
export const LOCAL_PRIMARY_OWNER_ID = ownerId('local-primary');

function team(id: string, sportId: Participant['sportId'], name: string, shortName = name): Participant {
  return { id: participantId(id), sportId, type: 'team', name, shortName, slug: id };
}

function player(id: string, sportId: Participant['sportId'], name: string, shortName: string, countryCode?: string): Participant {
  return { id: participantId(id), sportId, type: 'player', name, shortName, slug: id, ...(countryCode ? { countryCode } : {}) };
}

const participants: readonly Participant[] = [
  team('tottenham', 'soccer', 'Tottenham Hotspur', 'Tottenham'),
  team('liverpool', 'soccer', 'Liverpool'),
  team('arsenal', 'soccer', 'Arsenal'),
  team('aston-villa', 'soccer', 'Aston Villa'),
  team('chelsea', 'soccer', 'Chelsea'),
  team('brighton', 'soccer', 'Brighton'),
  team('nottingham-forest', 'soccer', 'Nottingham Forest', 'Nott’m Forest'),
  team('west-ham', 'soccer', 'West Ham United', 'West Ham'),
  player('dominic-solanke', 'soccer', 'Dominic Solanke', 'Solanke'),
  player('mohamed-salah', 'soccer', 'Mohamed Salah', 'Salah'),
  player('dejan-kulusevski', 'soccer', 'Dejan Kulusevski', 'Kulusevski'),
  player('cole-palmer', 'soccer', 'Cole Palmer', 'Palmer'),
  player('kaoru-mitoma', 'soccer', 'Kaoru Mitoma', 'Mitoma'),
  player('bukayo-saka', 'soccer', 'Bukayo Saka', 'Saka'),
  player('kai-havertz', 'soccer', 'Kai Havertz', 'Havertz'),

  player('carlos-alcaraz', 'tennis', 'Carlos Alcaraz', 'Alcaraz', 'ES'),
  player('jannik-sinner', 'tennis', 'Jannik Sinner', 'Sinner', 'IT'),
  player('coco-gauff', 'tennis', 'Coco Gauff', 'Gauff', 'US'),
  player('naomi-osaka', 'tennis', 'Naomi Osaka', 'Osaka', 'JP'),
  player('aryna-sabalenka', 'tennis', 'Aryna Sabalenka', 'Sabalenka', 'BY'),
  player('qinwen-zheng', 'tennis', 'Qinwen Zheng', 'Zheng', 'CN'),
  player('taylor-fritz', 'tennis', 'Taylor Fritz', 'Fritz', 'US'),
  player('jack-draper', 'tennis', 'Jack Draper', 'Draper', 'GB'),
  player('jessica-pegula', 'tennis', 'Jessica Pegula', 'Pegula', 'US'),
  player('jasmine-paolini', 'tennis', 'Jasmine Paolini', 'Paolini', 'IT'),
  player('andrey-rublev', 'tennis', 'Andrey Rublev', 'Rublev', 'RU'),
  player('emma-navarro', 'tennis', 'Emma Navarro', 'Navarro', 'US'),

  team('new-york-yankees', 'baseball', 'New York Yankees', 'Yankees'),
  team('red-sox', 'baseball', 'Boston Red Sox', 'Red Sox'),
  team('diamondbacks', 'baseball', 'Arizona Diamondbacks', 'Diamondbacks'),
  team('los-angeles-dodgers', 'baseball', 'Los Angeles Dodgers', 'Dodgers'),
  team('san-diego-padres', 'baseball', 'San Diego Padres', 'Padres'),
  team('baltimore-orioles', 'baseball', 'Baltimore Orioles', 'Orioles'),
  player('jarren-duran', 'baseball', 'Jarren Duran', 'Duran'),
  player('gerrit-cole', 'baseball', 'Gerrit Cole', 'Cole'),
  player('garrett-crochet', 'baseball', 'Garrett Crochet', 'Crochet'),
  player('zac-gallen', 'baseball', 'Zac Gallen', 'Gallen'),
  player('yoshinobu-yamamoto', 'baseball', 'Yoshinobu Yamamoto', 'Yamamoto'),
  player('max-fried', 'baseball', 'Max Fried', 'Fried'),
  player('brayan-bello', 'baseball', 'Brayan Bello', 'Bello'),
  player('garrett-whitlock', 'baseball', 'Garrett Whitlock', 'Whitlock'),
  player('merrill-kelly', 'baseball', 'Merrill Kelly', 'Kelly'),
  player('tyler-glasnow', 'baseball', 'Tyler Glasnow', 'Glasnow'),
  player('justin-martinez', 'baseball', 'Justin Martinez', 'Martinez'),
  player('tanner-houck', 'baseball', 'Tanner Houck', 'Houck'),
  player('trevor-rogers', 'baseball', 'Trevor Rogers', 'Rogers'),
  player('michael-king', 'baseball', 'Michael King', 'King'),
  player('brandon-pfaadt', 'baseball', 'Brandon Pfaadt', 'Pfaadt'),

  team('new-england-patriots', 'football', 'New England Patriots', 'Patriots'),
  team('buffalo-bills', 'football', 'Buffalo Bills', 'Bills'),
  team('dallas-cowboys', 'football', 'Dallas Cowboys', 'Cowboys'),
  team('philadelphia-eagles', 'football', 'Philadelphia Eagles', 'Eagles'),
  team('baltimore-ravens', 'football', 'Baltimore Ravens', 'Ravens'),
  team('kansas-city-chiefs', 'football', 'Kansas City Chiefs', 'Chiefs'),
];

const events: readonly CanonicalEvent[] = [
  {
    id: eventId('tot-liv'), sportId: 'soccer', competitionId: competitionId('premier-league'), seasonId: seasonId('premier-league-2026-27'),
    startsAt: '2026-09-06T19:15:00Z', status: 'live', venueName: 'Tottenham Hotspur Stadium',
    state: { score: [2, 1], period: 'second_half', minute: 72, goals: [
      { side: 0, minute: 18, scorerId: participantId('dominic-solanke') },
      { side: 1, minute: 41, scorerId: participantId('mohamed-salah') },
      { side: 0, minute: 63, scorerId: participantId('dejan-kulusevski') },
    ] },
  },
  {
    id: eventId('che-bha'), sportId: 'soccer', competitionId: competitionId('premier-league'), seasonId: seasonId('premier-league-2026-27'),
    startsAt: '2026-09-06T15:00:00Z', status: 'final', venueName: 'Stamford Bridge',
    state: { score: [1, 1], goals: [
      { side: 0, minute: 26, scorerId: participantId('cole-palmer') },
      { side: 1, minute: 68, scorerId: participantId('kaoru-mitoma') },
    ] },
  },
  {
    id: eventId('ars-avl'), sportId: 'soccer', competitionId: competitionId('premier-league'), seasonId: seasonId('premier-league-2026-27'),
    startsAt: '2026-09-05T16:30:00Z', status: 'final', venueName: 'Emirates Stadium',
    state: { score: [2, 0], goals: [
      { side: 0, minute: 34, scorerId: participantId('bukayo-saka') },
      { side: 0, minute: 77, scorerId: participantId('kai-havertz') },
    ] },
  },
  {
    id: eventId('nfo-whu'), sportId: 'soccer', competitionId: competitionId('premier-league'), seasonId: seasonId('premier-league-2026-27'),
    startsAt: '2026-09-07T19:00:00Z', status: 'scheduled', venueName: 'The City Ground', state: { goals: [] },
  },

  {
    id: eventId('alcaraz-sinner'), sportId: 'tennis', competitionId: competitionId('us-open-atp'), seasonId: seasonId('us-open-atp-2026'),
    startsAt: '2026-09-06T19:00:00Z', status: 'live', venueName: 'Arthur Ashe Stadium',
    state: { round: 'Quarterfinal', court: 'Arthur Ashe Stadium', bestOf: 5, durationSeconds: 6120, sets: [
      { games: [6, 4], status: 'complete' }, { games: [3, 4], status: 'in_progress' },
    ], points: ['40', '30'], servingParticipantId: participantId('jannik-sinner') },
  },
  {
    id: eventId('gauff-osaka'), sportId: 'tennis', competitionId: competitionId('us-open-wta'), seasonId: seasonId('us-open-wta-2026'),
    startsAt: '2026-09-06T16:00:00Z', status: 'final', venueName: 'Arthur Ashe Stadium',
    state: { round: 'Quarterfinal', court: 'Arthur Ashe Stadium', bestOf: 3, durationSeconds: 5760, sets: [
      { games: [6, 3], status: 'complete' }, { games: [7, 5], status: 'complete' },
    ] },
  },
  {
    id: eventId('sabalenka-zheng'), sportId: 'tennis', competitionId: competitionId('us-open-wta'), seasonId: seasonId('us-open-wta-2026'),
    startsAt: '2026-09-06T23:00:00Z', status: 'scheduled', venueName: 'Arthur Ashe Stadium',
    state: { round: 'Quarterfinal', court: 'Arthur Ashe Stadium', bestOf: 3, sets: [] },
  },
  {
    id: eventId('fritz-draper'), sportId: 'tennis', competitionId: competitionId('us-open-atp'), seasonId: seasonId('us-open-atp-2026'),
    startsAt: '2026-09-07T18:00:00Z', status: 'scheduled', venueName: 'Arthur Ashe Stadium',
    state: { round: 'Quarterfinal', court: 'Arthur Ashe Stadium', bestOf: 5, sets: [] },
  },
  {
    id: eventId('pegula-paolini'), sportId: 'tennis', competitionId: competitionId('us-open-wta'), seasonId: seasonId('us-open-wta-2026'),
    startsAt: '2026-09-07T16:00:00Z', status: 'scheduled', venueName: 'Louis Armstrong Stadium',
    state: { round: 'Quarterfinal', court: 'Louis Armstrong Stadium', bestOf: 3, sets: [] },
  },
  {
    id: eventId('fritz-rublev-r16'), sportId: 'tennis', competitionId: competitionId('us-open-atp'), seasonId: seasonId('us-open-atp-2026'),
    startsAt: '2026-09-05T18:00:00Z', status: 'final', venueName: 'Louis Armstrong Stadium',
    state: { round: 'Round of 16', court: 'Louis Armstrong Stadium', bestOf: 5, durationSeconds: 10080, sets: [
      { games: [6, 3], status: 'complete' }, { games: [4, 6], status: 'complete' },
      { games: [6, 4], status: 'complete' }, { games: [6, 2], status: 'complete' },
    ] },
  },
  {
    id: eventId('pegula-r16'), sportId: 'tennis', competitionId: competitionId('us-open-wta'), seasonId: seasonId('us-open-wta-2026'),
    startsAt: '2026-09-05T16:00:00Z', status: 'final', venueName: 'Arthur Ashe Stadium',
    state: { round: 'Round of 16', court: 'Arthur Ashe Stadium', bestOf: 3, durationSeconds: 4920, sets: [
      { games: [6, 4], status: 'complete' }, { games: [6, 2], status: 'complete' },
    ] },
  },

  {
    id: eventId('nyy-bos'), sportId: 'baseball', competitionId: competitionId('mlb'), seasonId: seasonId('mlb-2026'),
    startsAt: '2026-09-06T18:10:00Z', status: 'live', venueName: 'Fenway Park',
    state: { score: [3, 5], innings: [[0, 0, 1, 0, 2, 0, 0], [2, 0, 0, 1, 0, 2]], inning: 7, half: 'bottom', outs: 1,
      balls: 1, strikes: 2, bases: [true, false, true], batterId: participantId('jarren-duran'), pitcherId: participantId('gerrit-cole'),
      probablePitcherIds: [participantId('gerrit-cole'), participantId('garrett-crochet')], hits: [7, 9], errors: [0, 0] },
  },
  {
    id: eventId('az-lad'), sportId: 'baseball', competitionId: competitionId('mlb'), seasonId: seasonId('mlb-2026'),
    startsAt: '2026-09-06T23:10:00Z', status: 'scheduled', venueName: 'Dodger Stadium',
    state: { innings: [[], []], probablePitcherIds: [participantId('zac-gallen'), participantId('yoshinobu-yamamoto')] },
  },
  {
    id: eventId('nyy-bos-yesterday'), sportId: 'baseball', competitionId: competitionId('mlb'), seasonId: seasonId('mlb-2026'),
    startsAt: '2026-09-05T17:10:00Z', status: 'final', venueName: 'Fenway Park',
    state: { score: [2, 4], innings: [[0, 0, 0, 1, 0, 1, 0, 0, 0], [0, 2, 0, 0, 1, 0, 1, 0]],
      probablePitcherIds: [participantId('max-fried'), participantId('brayan-bello')], hits: [6, 8], errors: [1, 0],
      decision: { winningPitcherId: participantId('brayan-bello'), losingPitcherId: participantId('max-fried'), savePitcherId: participantId('garrett-whitlock') } },
  },
  {
    id: eventId('az-lad-yesterday'), sportId: 'baseball', competitionId: competitionId('mlb'), seasonId: seasonId('mlb-2026'),
    startsAt: '2026-09-05T20:10:00Z', status: 'final', venueName: 'Dodger Stadium',
    state: { score: [6, 3], innings: [[0, 1, 0, 0, 3, 0, 0, 2, 0], [1, 0, 0, 0, 0, 2, 0, 0, 0]],
      probablePitcherIds: [participantId('merrill-kelly'), participantId('tyler-glasnow')], hits: [10, 7], errors: [0, 1],
      decision: { winningPitcherId: participantId('merrill-kelly'), losingPitcherId: participantId('tyler-glasnow'), savePitcherId: participantId('justin-martinez') } },
  },
  {
    id: eventId('bos-bal-tomorrow'), sportId: 'baseball', competitionId: competitionId('mlb'), seasonId: seasonId('mlb-2026'),
    startsAt: '2026-09-07T23:05:00Z', status: 'scheduled', venueName: 'Oriole Park at Camden Yards',
    state: { innings: [[], []], probablePitcherIds: [participantId('tanner-houck'), participantId('trevor-rogers')] },
  },
  {
    id: eventId('sd-az-tomorrow'), sportId: 'baseball', competitionId: competitionId('mlb'), seasonId: seasonId('mlb-2026'),
    startsAt: '2026-09-07T20:10:00Z', status: 'scheduled', venueName: 'Chase Field',
    state: { innings: [[], []], probablePitcherIds: [participantId('michael-king'), participantId('brandon-pfaadt')] },
  },

  {
    id: eventId('ne-buf'), sportId: 'football', competitionId: competitionId('nfl'), seasonId: seasonId('nfl-2026'),
    startsAt: '2026-09-06T17:00:00Z', status: 'live', venueName: 'Highmark Stadium',
    state: { score: [17, 20], quarters: [[0, 10, 7, 0], [7, 3, 7, 3]], quarter: 4, clock: '6:32',
      possessionParticipantId: participantId('buffalo-bills'), down: 2, distance: 7,
      fieldPosition: { territoryParticipantId: participantId('new-england-patriots'), yardLine: 42 } },
  },
  {
    id: eventId('dal-phi'), sportId: 'football', competitionId: competitionId('nfl'), seasonId: seasonId('nfl-2026'),
    startsAt: '2026-09-06T17:00:00Z', status: 'final', venueName: 'Lincoln Financial Field',
    state: { score: [21, 28], quarters: [[7, 7, 0, 7], [0, 14, 7, 7]] },
  },
  {
    id: eventId('bal-kc'), sportId: 'football', competitionId: competitionId('nfl'), seasonId: seasonId('nfl-2026'),
    startsAt: '2026-09-08T00:15:00Z', status: 'scheduled', venueName: 'Arrowhead Stadium', state: { quarters: [[], []] },
  },
];

function sides(event: string, first: string, second: string, seeds?: readonly [number | undefined, number | undefined]): readonly EventParticipant[] {
  return [
    { eventId: eventId(event), participantId: participantId(first), side: 0, order: 0, ...(seeds?.[0] ? { seed: seeds[0] } : {}) },
    { eventId: eventId(event), participantId: participantId(second), side: 1, order: 0, ...(seeds?.[1] ? { seed: seeds[1] } : {}) },
  ];
}

const eventParticipants: readonly EventParticipant[] = [
  ...sides('tot-liv', 'tottenham', 'liverpool'),
  ...sides('che-bha', 'chelsea', 'brighton'),
  ...sides('ars-avl', 'arsenal', 'aston-villa'),
  ...sides('nfo-whu', 'nottingham-forest', 'west-ham'),
  ...sides('alcaraz-sinner', 'carlos-alcaraz', 'jannik-sinner', [2, 1]),
  ...sides('gauff-osaka', 'coco-gauff', 'naomi-osaka', [3, undefined]),
  ...sides('sabalenka-zheng', 'aryna-sabalenka', 'qinwen-zheng', [1, 7]),
  ...sides('fritz-draper', 'taylor-fritz', 'jack-draper', [4, 5]),
  ...sides('pegula-paolini', 'jessica-pegula', 'jasmine-paolini', [4, 6]),
  ...sides('fritz-rublev-r16', 'taylor-fritz', 'andrey-rublev', [4, 8]),
  ...sides('pegula-r16', 'jessica-pegula', 'emma-navarro', [4, 10]),
  ...sides('nyy-bos', 'new-york-yankees', 'red-sox'),
  ...sides('az-lad', 'diamondbacks', 'los-angeles-dodgers'),
  ...sides('nyy-bos-yesterday', 'new-york-yankees', 'red-sox'),
  ...sides('az-lad-yesterday', 'diamondbacks', 'los-angeles-dodgers'),
  ...sides('bos-bal-tomorrow', 'red-sox', 'baltimore-orioles'),
  ...sides('sd-az-tomorrow', 'san-diego-padres', 'diamondbacks'),
  ...sides('ne-buf', 'new-england-patriots', 'buffalo-bills'),
  ...sides('dal-phi', 'dallas-cowboys', 'philadelphia-eagles'),
  ...sides('bal-kc', 'baltimore-ravens', 'kansas-city-chiefs'),
];

export const canonicalSeed = defineDomainGraph({
  sports: [
    { id: 'soccer', name: 'Soccer' },
    { id: 'tennis', name: 'Tennis' },
    { id: 'baseball', name: 'Baseball' },
    { id: 'football', name: 'Football' },
  ],
  participants,
  competitionGroups: [
    { id: competitionGroupId('us-open'), sportId: 'tennis', name: 'US Open', shortName: 'US Open', slug: 'us-open' },
  ],
  competitions: [
    { id: competitionId('premier-league'), sportId: 'soccer', name: 'Premier League', shortName: 'Premier League', slug: 'premier-league', category: 'men' },
    { id: competitionId('us-open-atp'), sportId: 'tennis', name: 'US Open Men', shortName: 'US Open', slug: 'us-open-men', category: 'men', competitionGroupId: competitionGroupId('us-open') },
    { id: competitionId('us-open-wta'), sportId: 'tennis', name: 'US Open Women', shortName: 'US Open', slug: 'us-open-women', category: 'women', competitionGroupId: competitionGroupId('us-open') },
    { id: competitionId('mlb'), sportId: 'baseball', name: 'MLB', shortName: 'MLB', slug: 'mlb' },
    { id: competitionId('nfl'), sportId: 'football', name: 'NFL', shortName: 'NFL', slug: 'nfl' },
  ],
  seasons: [
    { id: seasonId('premier-league-2026-27'), competitionId: competitionId('premier-league'), name: '2026–27', startsOn: '2026-08-08', endsOn: '2027-05-23' },
    { id: seasonId('us-open-atp-2026'), competitionId: competitionId('us-open-atp'), name: '2026', startsOn: '2026-08-24', endsOn: '2026-09-13' },
    { id: seasonId('us-open-wta-2026'), competitionId: competitionId('us-open-wta'), name: '2026', startsOn: '2026-08-24', endsOn: '2026-09-13' },
    { id: seasonId('mlb-2026'), competitionId: competitionId('mlb'), name: '2026', startsOn: '2026-03-25', endsOn: '2026-11-04' },
    { id: seasonId('nfl-2026'), competitionId: competitionId('nfl'), name: '2026', startsOn: '2026-09-03', endsOn: '2027-02-14' },
  ],
  events,
  eventParticipants,
  collections: [{ id: collectionId('atp-wta'), name: 'ATP/WTA', shortName: 'ATP/WTA', slug: 'atp-wta' }],
  collectionMembers: [{ collectionId: collectionId('atp-wta'), target: { type: 'competition_group', id: competitionGroupId('us-open') }, position: 0 }],
  follows: [
    { id: followId('follow-atp-wta'), ownerId: LOCAL_PRIMARY_OWNER_ID, target: { type: 'collection', id: collectionId('atp-wta') }, position: 0 },
    { id: followId('follow-tottenham'), ownerId: LOCAL_PRIMARY_OWNER_ID, target: { type: 'participant', id: participantId('tottenham') }, position: 1 },
    { id: followId('follow-red-sox'), ownerId: LOCAL_PRIMARY_OWNER_ID, target: { type: 'participant', id: participantId('red-sox') }, position: 2 },
    { id: followId('follow-diamondbacks'), ownerId: LOCAL_PRIMARY_OWNER_ID, target: { type: 'participant', id: participantId('diamondbacks') }, position: 3 },
    { id: followId('follow-premier-league'), ownerId: LOCAL_PRIMARY_OWNER_ID, target: { type: 'competition', id: competitionId('premier-league') }, position: 4 },
    { id: followId('follow-nfl'), ownerId: LOCAL_PRIMARY_OWNER_ID, target: { type: 'competition', id: competitionId('nfl') }, position: 5 },
  ],
  providers: [],
  providerMappings: [],
});

const presentationRows = [
  ['tottenham', 'Tottenham', 'TOT', 'TH', 'navy'], ['liverpool', 'Liverpool', 'LIV', 'L', 'red'],
  ['arsenal', 'Arsenal', 'ARS', 'A', 'red'], ['aston-villa', 'Aston Villa', 'AVL', 'AV', 'claret'],
  ['chelsea', 'Chelsea', 'CHE', 'C', 'blue'], ['brighton', 'Brighton', 'BHA', 'B', 'blue'],
  ['nottingham-forest', 'Nott’m Forest', 'NFO', 'NF', 'red'], ['west-ham', 'West Ham', 'WHU', 'WH', 'claret'],
  ['carlos-alcaraz', 'Carlos Alcaraz', 'Alcaraz', 'ES', 'gold'], ['jannik-sinner', 'Jannik Sinner', 'Sinner', 'IT', 'green'],
  ['coco-gauff', 'Coco Gauff', 'Gauff', 'US', 'blue'], ['naomi-osaka', 'Naomi Osaka', 'Osaka', 'JP', 'red'],
  ['aryna-sabalenka', 'Aryna Sabalenka', 'Sabalenka', 'BY', 'green'], ['qinwen-zheng', 'Qinwen Zheng', 'Zheng', 'CN', 'red'],
  ['taylor-fritz', 'Taylor Fritz', 'Fritz', 'US', 'blue'], ['jack-draper', 'Jack Draper', 'Draper', 'GB', 'blue'],
  ['jessica-pegula', 'Jessica Pegula', 'Pegula', 'US', 'blue'], ['jasmine-paolini', 'Jasmine Paolini', 'Paolini', 'IT', 'green'],
  ['andrey-rublev', 'Andrey Rublev', 'Rublev', 'RU', 'blue'], ['emma-navarro', 'Emma Navarro', 'Navarro', 'US', 'blue'],
  ['new-york-yankees', 'Yankees', 'NYY', 'NY', 'navy'], ['red-sox', 'Red Sox', 'BOS', 'B', 'red'],
  ['diamondbacks', 'Diamondbacks', 'AZ', 'A', 'brick'], ['los-angeles-dodgers', 'Dodgers', 'LAD', 'LA', 'blue'],
  ['san-diego-padres', 'Padres', 'SD', 'SD', 'gold'], ['baltimore-orioles', 'Orioles', 'BAL', 'O', 'orange'],
  ['new-england-patriots', 'Patriots', 'NE', 'NE', 'navy'], ['buffalo-bills', 'Bills', 'BUF', 'BUF', 'blue'],
  ['dallas-cowboys', 'Cowboys', 'DAL', 'DAL', 'navy'], ['philadelphia-eagles', 'Eagles', 'PHI', 'PHI', 'green'],
  ['baltimore-ravens', 'Ravens', 'BAL', 'BAL', 'purple'], ['kansas-city-chiefs', 'Chiefs', 'KC', 'KC', 'red'],
] as const;

export const canonicalScoreboardPresentation: ScoreboardPresentation = {
  participants: new Map(presentationRows.map(([id, name, short, mark, color]) => [participantId(id), { name, short, mark, color }])),
  context: new Map([
    [eventId('ars-avl'), 'Arsenal moves up to 2nd.'],
    [eventId('gauff-osaka'), 'Gauff advances to the semifinal.'],
    [eventId('fritz-rublev-r16'), 'Fritz reaches the quarterfinal.'],
    [eventId('pegula-r16'), 'Pegula reaches the quarterfinal.'],
    [eventId('nyy-bos-yesterday'), 'Boston moves 1.5 games ahead in the Wild Card race.'],
    [eventId('az-lad-yesterday'), 'Arizona evens the series, 1–1.'],
    [eventId('dal-phi'), 'Philadelphia opens the season with a division win.'],
  ]),
};

