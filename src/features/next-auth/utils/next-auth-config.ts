import { environmentVariables } from '@/config/environment-variables';
import type { HitobitoProfile } from '@/features/next-auth/types/hitobito-profile';
import type { User } from '@/features/payload-cms/payload-types';
import type { NextAuthConfig } from 'next-auth';
import type { JWT } from 'next-auth/jwt';
import type { BasePayload } from 'payload';
import { getPayload } from 'payload';

// Extend the JWT type to include our custom fields
declare module 'next-auth/jwt' {
  interface JWT {
    access_token?: string | undefined;
    refresh_token?: string | undefined;
    expires_at?: number | undefined;
    uuid?: string;
    group_ids?: number[];
    nickname?: string;
    email?: string;
    name?: string;
    error?: string;
  }
}

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
  // Ensure the id is a number - Hitobito may return it as a string in some cases
  const ceviDatabaseUuid =
    typeof userProfile.id === 'string' ? Number.parseInt(userProfile.id, 10) : userProfile.id;

  if (Number.isNaN(ceviDatabaseUuid)) {
    throw new TypeError(`Invalid user ID from Hitobito: ${userProfile.id}`);
  }

  const matchedUsers = await payload.find({
    collection: 'users',
    where: { cevi_db_uuid: { equals: ceviDatabaseUuid } },
  });

  if (matchedUsers.totalDocs > 1) {
    throw new Error('Multiple users found with the same UUID');
  }

  // abort if the user already exists but still update user data
  const payloadUserId = matchedUsers.docs[0]?.id;
  if (matchedUsers.totalDocs === 1 && payloadUserId !== undefined) {
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

  // save the new user to the database
  return await payload.create({
    collection: 'users',
    data: {
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
    },
  });
}

/**
 * Refreshes the access token using the refresh token.
 * returns the new token with updated expiration and access token
 */
async function refreshAccessToken(token: JWT): Promise<JWT> {
  try {
    const url = `${HITOBITO_BASE_URL}/oauth/token`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        // @ts-ignore
        client_id: CEVI_DB_CLIENT_ID,
        // @ts-ignore
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

    // After refreshing the token, we re-fetch the user profile to get updated groups
    const profileUrl = `${HITOBITO_BASE_URL}/oauth/profile`;
    const profileResponse = await fetch(profileUrl, {
      headers: {
        Authorization: `Bearer ${refreshedTokens.access_token}`,
        'X-Scope': 'with_roles',
      },
    });

    if (profileResponse.ok) {
      const profile = (await profileResponse.json()) as HitobitoProfile;

      // Update the user in Payload CMS with the new groups
      // async loading of payload configuration (to avoid circular dependency)
      const config = await import('@payload-config');
      // @ts-ignore
      const payload = await getPayload({ config });
      const payloadCMSUser = await saveAndFetchUserFromPayload(payload, profile);

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
    } else {
      console.error('Failed to refetch user profile after token refresh');
      // If profile fetch fails, we still return the refreshed token but keep old user data (or maybe we should error?)
      // For now, let's just update the tokens
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
          const response = await fetch(url, {
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
      session.user = {
        ...session.user,
        // @ts-ignore
        uuid: token.uuid,
        // @ts-ignore
        group_ids: token.group_ids,
        // @ts-ignore
        nickname: token.nickname,
      };
      return session;
    },

    // This callback is called whenever a JSON Web Token is created (i.e. at sign in) or updated (i.e whenever a session is accessed in the client).
    async jwt({ token, account, profile: _profile }): Promise<JWT> {
      // Initial sign in
      if (account && _profile) {
        const profile = _profile as unknown as HitobitoProfile;

        // async loading of payload configuration (to avoid circular dependency)
        const config = await import('@payload-config');
        // @ts-ignore
        const payload = await getPayload({ config });
        const payloadCMSUser = await saveAndFetchUserFromPayload(payload, profile);

        return {
          ...token,
          // @ts-ignore
          access_token: account.access_token,
          // @ts-ignore
          refresh_token: account.refresh_token,
          // @ts-ignore
          expires_at: account.expires_at ?? Math.floor(Date.now() / 1000) + 3600,
          uuid: payloadCMSUser.id, // the id of the user in the CeviDB
          group_ids: profile.roles.map((role) => role.group_id),
          email: profile.email,
          name: profile.first_name + ' ' + profile.last_name,
          nickname: profile.nickname,
        };
      }

      // Return previous token if the access token has not expired yet
      // buffer time of 10s
      const expiresAt = token.expires_at as number;
      if (Date.now() < expiresAt * 1000 - 10_000) {
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
