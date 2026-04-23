import { environmentVariables } from '@/config/environment-variables';
import type { HitobitoProfile } from '@/features/next-auth/types/hitobito-profile';
import type { User } from '@/features/payload-cms/payload-types';
import { withSpan } from '@/utils/tracing-helpers';
import type { NextAuthConfig } from 'next-auth';
import type { JWT } from 'next-auth/jwt';
import { after } from 'next/server';
import type { BasePayload } from 'payload';
import { getPayload } from 'payload';
import { Agent, setGlobalDispatcher } from 'undici';
import { z } from 'zod';

const TokenIdentitySchema = z.object({
  uuid: z.string({ required_error: 'uuid missing from token' }),
  cevi_db_uuid: z.number({ required_error: 'cevi_db_uuid missing from token' }),
});

/**
 * Custom Undici Agent to manage HTTP connections efficiently.
 *
 * This agent is configured to handle keep-alive connections with
 * specific timeouts to prevent ECONNRESET errors when the remote
 * server closes idle connections.
 *
 */
const customAgent = new Agent({
  keepAliveTimeout: 4000,
  keepAliveMaxTimeout: 4000,
  headersTimeout: 5000,
  bodyTimeout: 10_000,
  connect: {
    timeout: 5000,
    keepAlive: true, // TCP level keep-alive
  },
  pipelining: 0,
  connections: 50,
});
setGlobalDispatcher(customAgent);

interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  scope?: string;
  error?: string;
}

const HITOBITO_BASE_URL = environmentVariables.HITOBITO_BASE_URL;
const HITOBITO_FORWARD_URL = environmentVariables.HITOBITO_FORWARD_URL;
const CEVI_DB_CLIENT_ID = environmentVariables.CEVI_DB_CLIENT_ID;
const CEVI_DB_CLIENT_SECRET = environmentVariables.CEVI_DB_CLIENT_SECRET;

/**
 * Fetches the user from the Payload CMS and saves it if it does not exist.
 * @param payload
 * @param userProfile
 */
async function saveAndFetchUserFromPayload(
  payload: BasePayload,
  userProfile: HitobitoProfile,
): Promise<User> {
  return await withSpan('saveAndFetchUserFromPayload', async () => {
    // Ensure the id is a number - Hitobito may return it as a string in some cases
    const ceviDatabaseUuid =
      typeof userProfile.id === 'string' ? Number.parseInt(userProfile.id, 10) : userProfile.id;

    if (Number.isNaN(ceviDatabaseUuid)) {
      throw new TypeError(`Invalid user ID from Hitobito: ${userProfile.id}`);
    }

    const userData = {
      cevi_db_uuid: ceviDatabaseUuid,
      groups: userProfile.roles.map((role) => ({
        id: role.group_id,
        name: role.group_name,
        role_name: role.role_name,
        role_class: role.role_class,
      })),
      email: userProfile.email,
      fullName: userProfile.first_name + ' ' + userProfile.last_name,
      nickname: userProfile.nickname,
    };

    // Phase 1: Try to find an existing user by cevi_db_uuid
    const matchedByUuid = await payload.find({
      collection: 'users',
      where: { cevi_db_uuid: { equals: ceviDatabaseUuid } },
    });

    if (matchedByUuid.totalDocs > 1) {
      throw new Error('Multiple users found with the same UUID');
    }

    // User already exists by UUID — update and return
    const payloadUserId = matchedByUuid.docs[0]?.id;
    if (matchedByUuid.totalDocs === 1 && payloadUserId !== undefined) {
      await payload.update({
        collection: 'users',
        where: { cevi_db_uuid: { equals: ceviDatabaseUuid } },
        data: {
          groups: userProfile.roles,
          email: userProfile.email,
          fullName: userProfile.first_name + ' ' + userProfile.last_name,
          nickname: userProfile.nickname,
        },
      });

      return await payload.findByID({
        collection: 'users',
        id: payloadUserId,
      });
    }

    // Phase 2: No UUID match — try to find by email (for manually created / CSV-imported users)
    const matchedByEmail = await payload.find({
      collection: 'users',
      where: { email: { equals: userProfile.email } },
    });

    if (matchedByEmail.totalDocs === 1 && matchedByEmail.docs[0]?.id !== undefined) {
      // Link the existing user by setting their cevi_db_uuid
      return await payload.update({
        collection: 'users',
        id: matchedByEmail.docs[0].id,
        data: userData,
      });
    }

    // Phase 3: No match at all — create a new user
    return await payload.create({
      collection: 'users',
      data: userData,
    });
  });
}

/**
 * Helper function to perform fetch with retries for network errors.
 */
async function fetchWithRetry(url: string, options: RequestInit, retries = 3): Promise<Response> {
  let attempt = 0;
  while (attempt < retries) {
    try {
      // Undici Agent is handled globally via setGlobalDispatcher,
      // but we can also pass specific dispatcher options if needed.
      // For now, the global agent should suffice.
      return await fetch(url, { ...options, cache: 'no-store' });
    } catch (error) {
      attempt++;
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.warn(`[NextAuth] Fetch attempt ${attempt} failed for ${url}: ${errorMessage}`);
      if (attempt >= retries) throw error;
      // Exponential backoff: 500ms, 1000ms, 2000ms
      await new Promise((resolve) => setTimeout(resolve, 500 * Math.pow(2, attempt)));
    }
  }
  throw new Error('Unreachable code in fetchWithRetry');
}

/**
 * Background helper to sync a Hitobito profile into the local Payload CMS Database.
 * Placed in an isolated function to keep NextAuth token refresh workflow cleanly decoupled.
 */
async function syncProfileToPayloadAsync(profile: HitobitoProfile): Promise<void> {
  try {
    const config = await import('@payload-config');
    const payload = await getPayload({ config: config.default });
    await saveAndFetchUserFromPayload(payload, profile);
  } catch (error) {
    console.error('Failed to background sync user with Payload DB during token refresh:', error);
  }
}

const inflightRefreshes = new Map<string, Promise<JWT>>();

async function refreshAccessToken(token: JWT): Promise<JWT> {
  const userId = token.uuid ?? 'unknown';

  // If a refresh is already in-flight for this user, wait for it
  const existing = inflightRefreshes.get(userId);
  if (existing) {
    return existing;
  }

  // Start the actual refresh and store the promise
  const refreshPromise = doRefreshAccessToken(token).finally(() => {
    // Clean up after a short delay to handle near-simultaneous arrivals
    setTimeout(() => inflightRefreshes.delete(userId), 1000);
  });

  inflightRefreshes.set(userId, refreshPromise);
  return refreshPromise;
}

/**
 * Refreshes the access token using the refresh token.
 * returns the new token with updated expiration and access token
 */
async function doRefreshAccessToken(token: JWT): Promise<JWT> {
  try {
    console.log('Refreshing access token for user', token.uuid);

    const url = `${HITOBITO_BASE_URL}/oauth/token`;
    const response = await fetchWithRetry(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: CEVI_DB_CLIENT_ID,
        client_secret: CEVI_DB_CLIENT_SECRET,
        grant_type: 'refresh_token',
        refresh_token: token.refresh_token ?? '',
      }),
    });

    let refreshedTokens: TokenResponse | undefined;
    const responseText = await response.text();

    try {
      refreshedTokens = JSON.parse(responseText) as TokenResponse;
    } catch {
      console.error('Failed to parse refresh token response as JSON:', responseText);
      throw new Error(
        `Invalid JSON response from token refresh endpoint: ${responseText.slice(0, 100)}...`,
      );
    }

    if (!response.ok) {
      throw new Error(JSON.stringify(refreshedTokens));
    }

    const expiresIn =
      typeof refreshedTokens.expires_in === 'number' ? refreshedTokens.expires_in : 3600;
    const expiresAt = Math.floor(Date.now() / 1000) + expiresIn;

    // After refreshing the token, we re-fetch the user profile to get updated groups
    const profileUrl = `${HITOBITO_BASE_URL}/oauth/profile`;
    const profileResponse = await fetchWithRetry(profileUrl, {
      headers: {
        Authorization: `Bearer ${refreshedTokens.access_token}`,
        'X-Scope': 'with_roles',
      },
    });

    if (profileResponse.ok) {
      const profile = (await profileResponse.json()) as HitobitoProfile;

      // Update the user in Payload CMS with the new groups in the background
      // Fire-and-forget: we use Next.js `after()` to ensure serverless functions don't freeze
      // before this background database syncing completes.
      after(() => syncProfileToPayloadAsync(profile));

      const identity = TokenIdentitySchema.parse(token);

      return {
        ...token,
        access_token: refreshedTokens.access_token,
        // Fall back to old refresh token if new one is not returned
        refresh_token: refreshedTokens.refresh_token ?? token.refresh_token,
        expires_at: expiresAt,
        // Update persisted user data synchronously from the token/profile data
        uuid: identity.uuid,
        cevi_db_uuid: identity.cevi_db_uuid,
        group_ids: profile.roles.map((role) => role.group_id),
        email: profile.email,
        name: profile.first_name + ' ' + profile.last_name,
        nickname: profile.nickname,
        firstName: profile.first_name,
        lastName: profile.last_name,
      };
    } else {
      console.error('Failed to refetch user profile after token refresh');
      // If profile fetch fails, we still return the refreshed token but keep old user data (or maybe we should error?)
      // For now, let's just update the tokens
      return {
        ...token,
        access_token: refreshedTokens.access_token,
        refresh_token: refreshedTokens.refresh_token ?? token.refresh_token,
        expires_at: expiresAt,
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

export const authOptions: NextAuthConfig = {
  providers: [
    {
      id: 'cevi-db',
      type: 'oauth',
      name: 'CeviDB',
      authorization: {
        url: `${HITOBITO_FORWARD_URL}/oauth/authorize`,
        params: {
          response_type: 'code',
          scope: 'with_roles',
        },
      },
      token: {
        url: `${HITOBITO_BASE_URL}/oauth/token`,
        params: {
          grant_type: 'authorization_code',
          scope: 'name',
        },
      },

      issuer: 'cevi-db',

      // This custom is used as soon as we would like to use a scope different from 'email'.
      // As Hitobito uses the 'X-Scopes' header to pass the scopes, and not the 'scope' parameter,
      userinfo: {
        async request({ tokens }: { tokens: { access_token: string } }): Promise<HitobitoProfile> {
          const url = `${HITOBITO_BASE_URL}/oauth/profile`;
          const response = await fetchWithRetry(url, {
            headers: {
              Authorization: `Bearer ${tokens.access_token}`,
              'X-Scope': 'with_roles',
            },
          });

          return (await response.json()) as HitobitoProfile;
        },
      },

      clientId: CEVI_DB_CLIENT_ID,
      clientSecret: CEVI_DB_CLIENT_SECRET,
    },
  ],
  debug: false,
  session: {
    strategy: 'jwt',
  },

  callbacks: {
    // we need to expose the additional fields from the token
    // for the Payload CMS to be able to use them
    // warning: these fields are also exposed to the client
    // The session callback is called whenever a session is checked.
    // By default, only a subset of the token is returned for increased security.
    session({ session, token }) {
      const identity = TokenIdentitySchema.parse(token);

      session.user = {
        ...session.user,
        uuid: identity.uuid,
        cevi_db_uuid: identity.cevi_db_uuid,
        group_ids: token.group_ids ?? [],
        nickname: token.nickname,
        firstName: token.firstName,
        lastName: token.lastName,
      };

      return session;
    },

    // This callback is called whenever a JSON Web Token is created (i.e. at sign in) or updated (i.e whenever a session is accessed in the client).
    async jwt({ token, account, profile: _profile }): Promise<JWT> {
      // Initial sign in
      if (account && _profile) {
        const profile = _profile as unknown as HitobitoProfile;

        const config = await import('@payload-config');
        const payload = await getPayload({ config: config.default });
        const payloadCMSUser = await saveAndFetchUserFromPayload(payload, profile);

        return {
          ...token,
          access_token: account.access_token,
          refresh_token: account.refresh_token,
          expires_at: account.expires_at ?? Math.floor(Date.now() / 1000) + 3600,
          uuid: payloadCMSUser.id,
          cevi_db_uuid: payloadCMSUser.cevi_db_uuid ?? undefined, // the id of the user in the CeviDB as number
          group_ids: profile.roles.map((role) => role.group_id),
          email: profile.email,
          name: profile.first_name + ' ' + profile.last_name,
          nickname: profile.nickname,
          firstName: profile.first_name,
          lastName: profile.last_name,
        };
      }

      // Return previous token if the access token has not expired yet
      // buffer time of 10s
      const expiresAt =
        typeof token.expires_at === 'number' && !Number.isNaN(token.expires_at)
          ? token.expires_at
          : 0; // force refresh if invalid

      if (expiresAt > 0 && Date.now() < expiresAt * 1000 - 10 * 1000) {
        return token;
      }

      // Access token has expired, try to update it
      if (!token.refresh_token) {
        return {
          ...token,
          error: 'RefreshAccessTokenError',
        };
      }

      return refreshAccessToken(token);
    },
  },

  pages: {
    signIn: '/admin/login',
    error: '/admin/login',
  },
};
