import { environmentVariables as env } from '@/config/environment-variables';
import type { HitobitoProfile } from '@/features/next-auth/types/hitobito-profile';
import { fetchWithRetry } from '@/lib/http-client';

/**
 * Fetches the Hitobito profile for the given access token.
 */
export async function fetchHitobitoProfile(accessToken: string): Promise<HitobitoProfile> {
  const url = `${env.HITOBITO_BASE_URL}/oauth/profile`;
  const response = await fetchWithRetry(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'X-Scope': 'with_roles',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch user profile: ${response.statusText}`);
  }

  return (await response.json()) as HitobitoProfile;
}
