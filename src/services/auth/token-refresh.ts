import { environmentVariables as env } from '@/config/environment-variables';
import { fetchWithRetry } from '@/lib/http-client';
import { fetchHitobitoProfile } from '@/services/auth/hitobito-client';
import { syncUserWithCeviDB } from '@/services/auth/user-sync';
import type { JWT } from 'next-auth/jwt';

interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  scope?: string;
  error?: string;
}

/**
 * Parses the token response as JSON, with error handling for non-JSON responses.
 *
 * @param response - The response from the token endpoint.
 * @returns The parsed token response.
 * @throws Error if the response is not a valid JSON response, i.e. 500 Internal Server Error
 *
 */
async function parseTokenResponse(response: Response): Promise<TokenResponse> {
  const responseText = await response.text();
  try {
    return JSON.parse(responseText) as TokenResponse;
  } catch {
    console.error('Failed to parse token response as JSON:', responseText);
    throw new Error(`Invalid JSON response from token endpoint: ${responseText.slice(0, 100)}...`);
  }
}

/**
 * Refreshes the access token using the refresh token.
 * returns the new token with updated expiration and access token
 */
export async function refreshAccessToken(token: JWT): Promise<JWT> {
  try {
    console.log('Refreshing access token for user', token.uuid);

    const url = `${env.HITOBITO_BASE_URL}/oauth/token`;
    const response = await fetchWithRetry(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: env.CEVI_DB_CLIENT_ID,
        client_secret: env.CEVI_DB_CLIENT_SECRET,
        grant_type: 'refresh_token',
        refresh_token: token.refresh_token ?? '',
      }),
    });

    const refreshedTokens = await parseTokenResponse(response);

    if (!response.ok) {
      throw new Error(JSON.stringify(refreshedTokens));
    }

    // After refreshing the token, we re-fetch the user profile to get updated groups
    try {
      const profile = await fetchHitobitoProfile(refreshedTokens.access_token);
      const payloadCMSUser = await syncUserWithCeviDB(profile);

      return {
        ...token,
        access_token: refreshedTokens.access_token,
        // Fall back to old refresh token if new one is not returned
        refresh_token: refreshedTokens.refresh_token ?? token.refresh_token,
        expires_at: Math.floor(Date.now() / 1000) + refreshedTokens.expires_in,
        // Update persisted user data
        uuid: payloadCMSUser.id,
        group_ids: profile.roles.map((role) => role.group_id),
        email: profile.email,
        name: profile.first_name + ' ' + profile.last_name,
        nickname: profile.nickname,
      };
    } catch (profileError) {
      console.error('Failed to refetch user profile after token refresh', profileError);
      // If profile fetch fails, we still return the refreshed token but keep old user data
      return {
        ...token,
        access_token: refreshedTokens.access_token,
        refresh_token: refreshedTokens.refresh_token ?? token.refresh_token,
        expires_at: Math.floor(Date.now() / 1000) + refreshedTokens.expires_in,
      };
    }
  } catch (error) {
    console.error('Error refreshing access token', error);
    return {
      ...token,
      error: 'RefreshAccessTokenError',
    };
  }
}
