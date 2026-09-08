declare const domainIdBrand: unique symbol;

export type DomainId<TName extends string> = string & { readonly [domainIdBrand]: TName };

export type ParticipantId = DomainId<'participant'>;
export type CompetitionId = DomainId<'competition'>;
export type CompetitionGroupId = DomainId<'competition-group'>;
export type SeasonId = DomainId<'season'>;
export type EventId = DomainId<'event'>;
export type CollectionId = DomainId<'collection'>;
export type FollowId = DomainId<'follow'>;
export type OwnerId = DomainId<'owner'>;
export type ProviderId = DomainId<'provider'>;

const canonicalIdPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function canonicalId<TName extends string>(value: string, label: string): DomainId<TName> {
  if (!canonicalIdPattern.test(value)) {
    throw new TypeError(`${label} must be a lowercase Slate ID separated by hyphens.`);
  }
  return value as DomainId<TName>;
}

export const participantId = (value: string) => canonicalId<'participant'>(value, 'Participant ID');
export const competitionId = (value: string) => canonicalId<'competition'>(value, 'Competition ID');
export const competitionGroupId = (value: string) => canonicalId<'competition-group'>(value, 'Competition group ID');
export const seasonId = (value: string) => canonicalId<'season'>(value, 'Season ID');
export const eventId = (value: string) => canonicalId<'event'>(value, 'Event ID');
export const collectionId = (value: string) => canonicalId<'collection'>(value, 'Collection ID');
export const followId = (value: string) => canonicalId<'follow'>(value, 'Follow ID');
export const ownerId = (value: string) => canonicalId<'owner'>(value, 'Owner ID');
export const providerId = (value: string) => canonicalId<'provider'>(value, 'Provider ID');

