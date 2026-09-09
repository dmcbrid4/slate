import type { ProviderId } from '../domain/ids.ts';
import type { RefreshDecision, RefreshResource } from './refresh-policy.ts';

export type RefreshLeaseResult =
  | { readonly type: 'acquired'; readonly token: string; readonly expiresAt: string }
  | Exclude<RefreshDecision, { readonly type: 'acquire' }>;

export interface RefreshRepository {
  acquire(providerId: ProviderId, resource: RefreshResource, now: string, reserveCalls?: number): Promise<RefreshLeaseResult>;
  complete(input: { readonly providerId: ProviderId; readonly resource: RefreshResource; readonly token: string; readonly acceptedAt: string; readonly providerObservedAt?: string }): Promise<boolean>;
  fail(input: { readonly providerId: ProviderId; readonly resource: RefreshResource; readonly token: string; readonly failedAt: string; readonly code: string; readonly retryAt: string }): Promise<boolean>;
}
