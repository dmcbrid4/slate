import type { Entity, Participant } from './types.ts';

export const entities: Entity[] = [
  { id: 'atp-wta', name: 'ATP/WTA', shortName: 'ATP/WTA', kind: 'Collection', subtitle: 'Tennis · Main tours', mark: 'T', color: 'tennis', sport: 'tennis' },
  { id: 'tottenham', name: 'Tottenham Hotspur', shortName: 'Tottenham', kind: 'Team', subtitle: 'Soccer · Premier League', mark: 'TH', color: 'navy', sport: 'soccer' },
  { id: 'red-sox', name: 'Boston Red Sox', shortName: 'Red Sox', kind: 'Team', subtitle: 'Baseball · MLB', mark: 'B', color: 'red', sport: 'baseball' },
  { id: 'diamondbacks', name: 'Arizona Diamondbacks', shortName: 'Diamondbacks', kind: 'Team', subtitle: 'Baseball · MLB', mark: 'A', color: 'brick', sport: 'baseball' },
  { id: 'premier-league', name: 'Premier League', shortName: 'Premier League', kind: 'Competition', subtitle: 'Soccer · England', mark: 'PL', color: 'purple', sport: 'soccer' },
  { id: 'nfl', name: 'NFL', shortName: 'NFL', kind: 'Competition', subtitle: 'Football · United States', mark: 'NFL', color: 'blue', sport: 'football' },
  { id: 'us-open', name: 'US Open', shortName: 'US Open', kind: 'Tournament', subtitle: 'Tennis · Grand Slam', mark: 'US', color: 'blue', sport: 'tennis' },
  { id: 'alcaraz', name: 'Carlos Alcaraz', shortName: 'Alcaraz', kind: 'Player', subtitle: 'Tennis · ATP · Spain', mark: 'ES', color: 'gold', sport: 'tennis' },
  { id: 'gauff', name: 'Coco Gauff', shortName: 'Gauff', kind: 'Player', subtitle: 'Tennis · WTA · United States', mark: 'US', color: 'blue', sport: 'tennis' },
  { id: 'liverpool', name: 'Liverpool', shortName: 'Liverpool', kind: 'Team', subtitle: 'Soccer · Premier League', mark: 'L', color: 'red', sport: 'soccer' },
  { id: 'sinner', name: 'Jannik Sinner', shortName: 'Sinner', kind: 'Player', subtitle: 'Tennis · ATP · Italy', mark: 'IT', color: 'green', sport: 'tennis' },
  { id: 'bills', name: 'Buffalo Bills', shortName: 'Bills', kind: 'Team', subtitle: 'Football · NFL', mark: 'BUF', color: 'blue', sport: 'football' },
];

export const defaultFollowing = ['atp-wta', 'tottenham', 'red-sox', 'diamondbacks', 'premier-league', 'nfl'];
export const entityById = Object.fromEntries(entities.map(entity => [entity.id, entity]));

export const participants = {
  spurs: { name: 'Tottenham', short: 'TOT', mark: 'TH', color: 'navy' },
  liverpool: { name: 'Liverpool', short: 'LIV', mark: 'L', color: 'red' },
  arsenal: { name: 'Arsenal', short: 'ARS', mark: 'A', color: 'red' },
  villa: { name: 'Aston Villa', short: 'AVL', mark: 'AV', color: 'claret' },
  chelsea: { name: 'Chelsea', short: 'CHE', mark: 'C', color: 'blue' },
  brighton: { name: 'Brighton', short: 'BHA', mark: 'B', color: 'blue' },
  forest: { name: 'Nott’m Forest', short: 'NFO', mark: 'NF', color: 'red' },
  westham: { name: 'West Ham', short: 'WHU', mark: 'WH', color: 'claret' },
  alcaraz: { name: 'Carlos Alcaraz', short: 'Alcaraz', mark: 'ES', color: 'gold', seed: 2 },
  sinner: { name: 'Jannik Sinner', short: 'Sinner', mark: 'IT', color: 'green', seed: 1 },
  gauff: { name: 'Coco Gauff', short: 'Gauff', mark: 'US', color: 'blue', seed: 3 },
  osaka: { name: 'Naomi Osaka', short: 'Osaka', mark: 'JP', color: 'red' },
  sabalenka: { name: 'Aryna Sabalenka', short: 'Sabalenka', mark: 'BY', color: 'green', seed: 1 },
  zheng: { name: 'Qinwen Zheng', short: 'Zheng', mark: 'CN', color: 'red', seed: 7 },
  fritz: { name: 'Taylor Fritz', short: 'Fritz', mark: 'US', color: 'blue', seed: 4 },
  draper: { name: 'Jack Draper', short: 'Draper', mark: 'GB', color: 'blue', seed: 5 },
  pegula: { name: 'Jessica Pegula', short: 'Pegula', mark: 'US', color: 'blue', seed: 4 },
  paolini: { name: 'Jasmine Paolini', short: 'Paolini', mark: 'IT', color: 'green', seed: 6 },
  yankees: { name: 'Yankees', short: 'NYY', mark: 'NY', color: 'navy' },
  boston: { name: 'Red Sox', short: 'BOS', mark: 'B', color: 'red' },
  arizona: { name: 'Diamondbacks', short: 'AZ', mark: 'A', color: 'brick' },
  dodgers: { name: 'Dodgers', short: 'LAD', mark: 'LA', color: 'blue' },
  padres: { name: 'Padres', short: 'SD', mark: 'SD', color: 'gold' },
  orioles: { name: 'Orioles', short: 'BAL', mark: 'O', color: 'orange' },
  patriots: { name: 'Patriots', short: 'NE', mark: 'NE', color: 'navy' },
  bills: { name: 'Bills', short: 'BUF', mark: 'BUF', color: 'blue' },
  eagles: { name: 'Eagles', short: 'PHI', mark: 'PHI', color: 'green' },
  cowboys: { name: 'Cowboys', short: 'DAL', mark: 'DAL', color: 'navy' },
  chiefs: { name: 'Chiefs', short: 'KC', mark: 'KC', color: 'red' },
  ravens: { name: 'Ravens', short: 'BAL', mark: 'BAL', color: 'purple' },
} satisfies Record<string, Participant>;
