import { competitionGroupId, competitionId, type CompetitionGroupId, type CompetitionId } from '../../domain/ids.ts';
import type { CompetitionCategory } from '../../domain/model.ts';

/**
 * Reviewed provider IDs are the only way the ingestion path may associate
 * separate provider tournaments with a Slate competition group. Names and
 * provider filter echoes are presentation data, not identity.
 */
export interface LiveTennisTournamentRegistryEntry {
  readonly providerTournamentId: string;
  readonly competitionId: CompetitionId;
  readonly competitionGroupId: CompetitionGroupId;
  readonly category: CompetitionCategory;
  readonly competitionName: string;
  readonly competitionShortName: string;
  readonly competitionSlug: string;
  readonly groupName: string;
  readonly groupShortName: string;
  readonly groupSlug: string;
}

const usOpenGroup = {
  competitionGroupId: competitionGroupId('us-open'),
  groupName: 'US Open',
  groupShortName: 'US Open',
  groupSlug: 'us-open',
} as const;

/**
 * IDs verified in the authenticated feasibility spike. Add future events only
 * after a review of their stable provider IDs; never infer an entry by name.
 */
export const liveTennisTournamentRegistry: readonly LiveTennisTournamentRegistryEntry[] = [
  {
    providerTournamentId: '1217',
    competitionId: competitionId('us-open-atp'),
    category: 'men',
    competitionName: 'US Open Men',
    competitionShortName: 'US Open',
    competitionSlug: 'us-open-men',
    ...usOpenGroup,
  },
  {
    providerTournamentId: '1218',
    competitionId: competitionId('us-open-wta'),
    category: 'women',
    competitionName: 'US Open Women',
    competitionShortName: 'US Open',
    competitionSlug: 'us-open-women',
    ...usOpenGroup,
  },
];

const byProviderTournamentId = new Map(liveTennisTournamentRegistry.map(entry => [entry.providerTournamentId, entry]));

export function findLiveTennisTournament(providerTournamentId: string): LiveTennisTournamentRegistryEntry | undefined {
  return byProviderTournamentId.get(providerTournamentId);
}
