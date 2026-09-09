// Temporary presentation fixtures for Phase 0, not a canonical domain model.
export type Day = 'five-days-ago' | 'four-days-ago' | 'three-days-ago' | 'two-days-ago' | 'yesterday' | 'today' | 'tomorrow' | 'two-days-ahead' | 'three-days-ahead' | 'four-days-ahead' | 'five-days-ahead';
export type Sport = 'soccer' | 'tennis' | 'baseball' | 'football';
export type Entity = {
  id: string;
  name: string;
  shortName: string;
  kind: 'Team' | 'Player' | 'Competition' | 'Tournament' | 'Collection';
  subtitle: string;
  mark: string;
  color: string;
  sport: Sport;
};
export type Participant = { name: string; short: string; mark: string; color: string; seed?: number };
type FixtureBase = {
  id: string;
  competition: string;
  competitionId: string;
  start: string;
  status: 'scheduled' | 'live' | 'final';
  participants: [Participant, Participant];
  follows: string[];
  venue: string;
  context?: string;
};
export type SoccerFixture = FixtureBase & {
  sport: 'soccer';
  score?: [number, number];
  minute?: string;
  goals: { minute: string; player: string; side: 0 | 1 }[];
};
export type TennisFixture = FixtureBase & {
  sport: 'tennis';
  category: 'Men' | 'Women';
  round: string;
  sets: [number[], number[]];
  points?: [string, string];
  server?: 0 | 1;
  duration?: string;
};
export type BaseballFixture = FixtureBase & {
  sport: 'baseball';
  score?: [number, number];
  inning?: number;
  half?: 'Top' | 'Bottom';
  outs?: number;
  bases?: [boolean, boolean, boolean];
  batter?: string;
  count?: string;
  pitchers: [string, string];
  decision?: string;
  innings?: [number[], number[]];
  hits?: [number, number];
  errors?: [number, number];
};
export type FootballFixture = FixtureBase & {
  sport: 'football';
  score?: [number, number];
  clock?: string;
  possession?: 0 | 1;
  situation?: string;
  quarters?: [number[], number[]];
};
export type Fixture = SoccerFixture | TennisFixture | BaseballFixture | FootballFixture;
