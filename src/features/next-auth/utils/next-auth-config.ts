import { environmentVariables } from '@/config/environment-variables';
import type { HitobitoProfile } from '@/features/next-auth/types/hitobito-profile';
import { fetchHitobitoProfile } from '@/services/auth/hitobito-client';
import { refreshAccessToken } from '@/services/auth/token-refresh';
import { syncUserWithCeviDB } from '@/services/auth/user-sync';
import type { NextAuthConfig } from 'next-auth';
import type { JWT } from 'next-auth/jwt';
import { Agent, setGlobalDispatcher } from 'undici';

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

// Extend the JWT type to include our custom fields
declare module 'next-auth/jwt' {
  interface JWT {
    access_token?: string | undefined;
    refresh_token?: string | undefined;
    expires_at?: number | undefined;
    uuid?: string;
    cevi_db_uuid?: number;
    group_ids?: number[];
    nickname?: string | null;
    email?: string;
    name?: string;
    error?: string;
  }
}

const HITOBITO_BASE_URL = environmentVariables.HITOBITO_BASE_URL;
const HITOBITO_FORWARD_URL = environmentVariables.HITOBITO_FORWARD_URL;
const CEVI_DB_CLIENT_ID = environmentVariables.CEVI_DB_CLIENT_ID;
const CEVI_DB_CLIENT_SECRET = environmentVariables.CEVI_DB_CLIENT_SECRET;

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
          return await fetchHitobitoProfile(tokens.access_token);
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
        uuid: token.uuid,
        cevi_db_uuid: token.cevi_db_uuid,
        group_ids: token.group_ids,
        nickname: token.nickname,
      };
      return session;
    },

    // This callback is called whenever a JSON Web Token is created (i.e. at sign in) or updated (i.e whenever a session is accessed in the client).
    async jwt({ token, account, profile: _profile, trigger }): Promise<JWT> {
      // Initial sign in
      if (account && _profile) {
        const profile = _profile as unknown as HitobitoProfile;

        const payloadCMSUser = await syncUserWithCeviDB(profile);

        console.log('[JWT Callback] Initial sign in for user', payloadCMSUser.id);
        return {
          ...token,
          // @ts-ignore
          access_token: account.access_token,
          // @ts-ignore
          refresh_token: account.refresh_token,
          // @ts-ignore
          expires_at: account.expires_at ?? Math.floor(Date.now() / 1000) + 3600,
          uuid: payloadCMSUser.id,
          cevi_db_uuid: payloadCMSUser.cevi_db_uuid, // the id of the user in the CeviDB as number
          group_ids: profile.roles.map((role) => role.group_id),
          email: profile.email,
          name: profile.first_name + ' ' + profile.last_name,
          nickname: profile.nickname,
        };
      }

      // Return previous token if the access token has not expired yet
      // buffer time of 10s
      const expiresAt = token.expires_at as number;
      const now = Date.now();
      const expiryTimeMs = expiresAt * 1000;
      const bufferMs = 10_000;
      const timeUntilExpiry = expiryTimeMs - now;
      
      console.log('[JWT Callback] Token check for user', token.uuid, {
        now: now,
        expiresAt: expiresAt,
        expiryTimeMs: expiryTimeMs,
        timeUntilExpiry: timeUntilExpiry,
        bufferMs: bufferMs,
        isExpired: !expiresAt || timeUntilExpiry < bufferMs,
      });
      
      if (expiresAt && now < expiryTimeMs - bufferMs) {
        console.log('[JWT Callback] Token is still valid, returning existing token');
        return token;
      }

      // Access token has expired, try to update it
      if (!token.refresh_token) {
        console.error('[JWT Callback] No refresh token available for user', token.uuid);
        return {
          ...token,
          error: 'RefreshAccessTokenError',
        };
      }

      console.log('[JWT Callback] Token expired, refreshing for user', token.uuid, 'trigger:', trigger);
      const refreshedToken = await refreshAccessToken(token);
      console.log('[JWT Callback] Token refreshed for user', refreshedToken.uuid, 'new expires_at:', refreshedToken.expires_at);
      return refreshedToken;
    },
  },

  pages: {
    signIn: '/admin/login',
    error: '/admin/login',
  },
};
