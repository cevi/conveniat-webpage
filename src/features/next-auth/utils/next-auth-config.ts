import { environmentVariables } from '@/config/environment-variables';
import type { HitobitoProfile } from '@/features/next-auth/types/hitobito-profile';
import { createAuthJsLogger } from '@/features/next-auth/utils/auth-js-logger';
import { reportSessionTokenKept } from '@/features/next-auth/utils/session-token-change';
import type { User } from '@/features/payload-cms/payload-types';
import { withCeviDatabaseUserAgent } from '@/lib/hitobito/user-agent';
import { formatUserFullName } from '@/utils/format-user-name';
import { createLogger } from '@/utils/server-logger';
import { withSpan } from '@/utils/tracing-helpers';
import { trace } from '@opentelemetry/api';
import type { NextAuthConfig } from 'next-auth';
import { customFetch } from 'next-auth';
import type { JWT } from 'next-auth/jwt';
import type { BasePayload } from 'payload';
import { getPayload } from 'payload';
import { Agent, setGlobalDispatcher } from 'undici';
import { z } from 'zod';

/**
 * The token refresh is the one flow here whose *successes* have to be visible, not just its
 * failures. `console.log` is not bridged into Loki (see `@/utils/otel-console-bridge`), so the
 * terminal `invalid_grant` errors arrived without the attempts they came out of - no user, no
 * reason, and no denominator to tell a user whose Hitobito authorisation genuinely expired from
 * a refresh this app broke itself. Everything on that path goes through the structured logger.
 */
const logger = createLogger('next-auth');

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

type UserGroup = NonNullable<User['groups']>[number];

/**
 * Maps Hitobito profile roles to user groups structure.
 */
function mapProfileRolesToGroups(roles: HitobitoProfile['roles']): UserGroup[] {
  return roles.map((role) => ({
    id: role.group_id,
    name: role.group_name,
    role_name: role.role_name,
    role_class: role.role_class,
  }));
}

/**
 * Checks if the groups list of the user has changed compared to the incoming roles.
 */
function hasUserGroupsChanged(
  existingGroups: User['groups'],
  incomingRoles: HitobitoProfile['roles'],
): boolean {
  const currentGroups = Array.isArray(existingGroups) ? existingGroups : [];
  if (currentGroups.length !== incomingRoles.length) {
    return true;
  }
  return !incomingRoles.every((newG) =>
    currentGroups.some(
      (existingG) =>
        existingG.id === newG.group_id &&
        existingG.name === newG.group_name &&
        existingG.role_name === newG.role_name &&
        existingG.role_class === newG.role_class,
    ),
  );
}

/**
 * Checks if any critical profile attributes (email, name, groups) have changed.
 */
function hasUserProfileChanged(existingUser: User, incomingProfile: HitobitoProfile): boolean {
  const newFullName = incomingProfile.first_name + ' ' + incomingProfile.last_name;
  const existingNickname = existingUser.nickname ?? undefined;
  const incomingNickname = incomingProfile.nickname ?? undefined;

  return (
    hasUserGroupsChanged(existingUser.groups, incomingProfile.roles) ||
    existingUser.fullName !== newFullName ||
    existingNickname !== incomingNickname ||
    existingUser.email !== incomingProfile.email
  );
}

/**
 * Determines whether user changes require queueing a chat membership sync.
 */
function shouldSyncAnnouncementChats(
  existingUser: User,
  incomingProfile: HitobitoProfile,
): boolean {
  const newFullName = incomingProfile.first_name + ' ' + incomingProfile.last_name;
  const existingNickname = existingUser.nickname ?? undefined;
  const incomingNickname = incomingProfile.nickname ?? undefined;

  return (
    hasUserGroupsChanged(existingUser.groups, incomingProfile.roles) ||
    existingUser.fullName !== newFullName ||
    existingNickname !== incomingNickname
  );
}

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
      groups: mapProfileRolesToGroups(userProfile.roles),
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

    // User already exists by UUID — update and return if changed
    const existingUser = matchedByUuid.docs[0];
    if (matchedByUuid.totalDocs === 1 && existingUser !== undefined) {
      if (!hasUserProfileChanged(existingUser, userProfile)) {
        return existingUser;
      }

      const newFullName = userProfile.first_name + ' ' + userProfile.last_name;
      const updatedUser = await payload.update({
        collection: 'users',
        id: existingUser.id,
        data: {
          groups: mapProfileRolesToGroups(userProfile.roles),
          email: userProfile.email,
          fullName: newFullName,
          nickname: userProfile.nickname,
        },
      });

      // Queue background job to sync announcement channels if groups, nickname or name changed
      if (shouldSyncAnnouncementChats(existingUser, userProfile)) {
        await payload.jobs.queue({
          task: 'syncNewUserAnnouncementChats',
          input: { userId: existingUser.id },
        });
      }

      return updatedUser;
    }

    // Phase 2: No UUID match — try to find by email (for manually created / CSV-imported users)
    const matchedByEmail = await payload.find({
      collection: 'users',
      where: { email: { equals: userProfile.email } },
    });

    if (matchedByEmail.totalDocs === 1 && matchedByEmail.docs[0]?.id !== undefined) {
      // Link the existing user by setting their cevi_db_uuid
      const updatedUser = await payload.update({
        collection: 'users',
        id: matchedByEmail.docs[0].id,
        data: userData,
      });

      // Queue background job to sync announcement channels for first-time login
      await payload.jobs.queue({
        task: 'syncNewUserAnnouncementChats',
        input: { userId: updatedUser.id },
      });

      return updatedUser;
    }

    // Phase 3: No match at all — create a new user
    const newUser = await payload.create({
      collection: 'users',
      data: userData,
    });

    // Queue background job to sync announcement channels for first-time login
    await payload.jobs.queue({
      task: 'syncNewUserAnnouncementChats',
      input: { userId: newUser.id },
    });

    return newUser;
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
      return await fetch(url, { ...withCeviDatabaseUserAgent(options), cache: 'no-store' });
    } catch (error) {
      attempt++;
      logger.warn('Fetch attempt against Hitobito failed', {
        'http.url': url,
        'retry.attempt': attempt,
        'retry.max_attempts': retries,
        error,
      });
      if (attempt >= retries) throw error;
      // Exponential backoff: 500ms, 1000ms, 2000ms
      await new Promise((resolve) => setTimeout(resolve, 500 * Math.pow(2, attempt)));
    }
  }
  throw new Error('Unreachable code in fetchWithRetry');
}

/**
 * Stores a Hitobito profile on the Payload user, whose groups are what the admin panel checks.
 * Says whether that worked instead of throwing, because a refresh that could not store the
 * profile still has new tokens to hand out.
 */
async function syncProfileToPayload(profile: HitobitoProfile): Promise<boolean> {
  try {
    const config = await import('@payload-config');
    const payload = await getPayload({ config: config.default });
    await saveAndFetchUserFromPayload(payload, profile);
    return true;
  } catch (error) {
    logger.error('Failed to sync user with Payload DB during token refresh', {
      error,
    });
    return false;
  }
}

/**
 * How long a session waits before it asks Cevi.DB for its groups again on the user's request.
 * Anybody signed in can post a session update, so without it one client could turn every request
 * into a call to Cevi.DB.
 */
const SECONDS_BETWEEN_REQUESTED_SYNCS = 60;

const isWithinSyncInterval = (unixSeconds: number | undefined): boolean =>
  typeof unixSeconds === 'number' &&
  Date.now() / 1000 - unixSeconds < SECONDS_BETWEEN_REQUESTED_SYNCS;

/**
 * Whether the session has to wait before it may ask again. A failed attempt counts like a sync,
 * so that Cevi.DB being down does not turn every press of the button into another call to it.
 */
const mustWaitForRequestedSync = (token: JWT): boolean =>
  isWithinSyncInterval(token.groups_synced_at) || isWithinSyncInterval(token.sync_requested_at);

/**
 * What the `jwt` callback answers to end a session: Auth.js clears the session cookie instead of
 * re-signing it, and the user goes back through the Cevi.DB login.
 */
// eslint-disable-next-line unicorn/no-null -- Auth.js ends a session on null, not on undefined
const SESSION_ENDED = null;

/**
 * Refreshes in flight, by refresh token. Requests that carry the same session share one call to
 * Cevi.DB, because the second use of a refresh token is refused. Two devices of one user hold
 * different refresh tokens, so neither ever receives the other's result.
 */
const inflightRefreshes = new Map<string, Promise<JWT | null | undefined>>();

async function refreshAccessToken(
  token: JWT,
  refreshToken: string,
  reason: string,
): Promise<JWT | null | undefined> {
  // If a refresh is already in-flight for this session, wait for it
  const existing = inflightRefreshes.get(refreshToken);
  if (existing) {
    return existing;
  }

  // Start the actual refresh and store the promise
  const refreshPromise = doRefreshAccessToken(token, reason).finally(() => {
    // Clean up after a short delay to handle near-simultaneous arrivals
    setTimeout(() => inflightRefreshes.delete(refreshToken), 1000);
  });

  inflightRefreshes.set(refreshToken, refreshPromise);
  return refreshPromise;
}

class TerminalRefreshError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TerminalRefreshError';
  }
}

/**
 * Refreshes the access token using the refresh token.
 * returns the new token with updated expiration and access token, `null` when Cevi.DB refused
 * the refresh token for good, which ends the session, and `undefined` when it could not be
 * reached and the session goes on as it is.
 */
async function doRefreshAccessToken(token: JWT, reason: string): Promise<JWT | null | undefined> {
  try {
    logger.info('Refreshing access token', {
      'auth.user_uuid': token.uuid,
      'hitobito.refresh_reason': reason,
    });

    const activeSpan = trace.getActiveSpan();
    if (activeSpan !== undefined) {
      activeSpan.setAttribute('hitobito.refresh_reason', reason);
    }

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

    const responseText = await response.text();

    if (!response.ok) {
      const isTerminal =
        response.status >= 400 &&
        response.status < 500 &&
        response.status !== 429 &&
        response.status !== 408;

      if (isTerminal) {
        throw new TerminalRefreshError(responseText);
      }
      throw new Error(responseText);
    }

    let refreshedTokens: TokenResponse | undefined;
    try {
      refreshedTokens = JSON.parse(responseText) as TokenResponse;
    } catch {
      logger.error('The token refresh endpoint did not answer with JSON');
      throw new Error(
        `Invalid JSON response from token refresh endpoint: ${responseText.slice(0, 100)}...`,
      );
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

      // The Payload user is stored before the session answers with the new groups. The admin
      // panel reads its groups from there, so a session that is ahead of it would be refused
      // what it was just told it may do.
      const isStored = await syncProfileToPayload(profile);

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
        // Unchanged when the Payload user could not be stored, so the sync does not count as done.
        groups_synced_at: isStored ? Math.floor(Date.now() / 1000) : token.groups_synced_at,
        email: profile.email,
        name: formatUserFullName(profile.first_name + ' ' + profile.last_name, profile.nickname),
        nickname: profile.nickname,
        firstName: profile.first_name,
        lastName: profile.last_name,
      };
    } else {
      logger.error('Failed to refetch user profile after token refresh', {
        'auth.user_uuid': token.uuid,
        'http.status_code': profileResponse.status,
      });
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
    const activeSpan = trace.getActiveSpan();
    if (activeSpan !== undefined) {
      activeSpan.recordException(error as Error);
    }
    const isTerminal = error instanceof TerminalRefreshError;
    // Terminal means the refresh token is gone for good and the session ends here: worth an
    // error. A retryable failure is the network, and the next request tries again.
    logger[isTerminal ? 'error' : 'warn']('Error refreshing access token', {
      'auth.user_uuid': token.uuid,
      'hitobito.refresh_reason': reason,
      'hitobito.refresh_terminal': isTerminal,
      error,
    });
    // A session that can no longer be refreshed would otherwise keep the groups it was issued
    // with for as long as its cookie lives. Cevi.DB staying unreachable is not a reason to sign
    // anybody out, so only the terminal case ends it.
    return isTerminal ? SESSION_ENDED : undefined;
  }
}

export const authOptions: NextAuthConfig = {
  providers: [
    {
      id: 'cevi-db',
      type: 'oauth',
      name: 'Cevi.DB',
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

      // Auth.js exchanges the code for a token itself and would name its own library in
      // the User-Agent. Every other request to Cevi.DB carries ours.
      [customFetch]: (input: RequestInfo | URL, init?: RequestInit): Promise<Response> =>
        fetch(input, withCeviDatabaseUserAgent(init)),
    },
  ],
  debug: false,
  logger: createAuthJsLogger(logger),
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
        groups_synced_at: token.groups_synced_at,
        nickname: token.nickname,
        firstName: token.firstName,
        lastName: token.lastName,
      };

      return session;
    },

    // This callback is called whenever a JSON Web Token is created (i.e. at sign in) or updated (i.e whenever a session is accessed in the client).
    async jwt({ token, account, profile: _profile, trigger }): Promise<JWT | null> {
      // Initial sign in
      if (account && _profile) {
        const activeSpan = trace.getActiveSpan();
        if (activeSpan !== undefined) {
          activeSpan.setAttribute('hitobito.refresh_reason', 'authorization_code_exchange');
        }
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
          groups_synced_at: Math.floor(Date.now() / 1000),
          email: profile.email,
          name: formatUserFullName(profile.first_name + ' ' + profile.last_name, profile.nickname),
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

      const hasRefreshToken = token.refresh_token !== undefined && token.refresh_token !== '';
      const isStillValid = expiresAt > 0 && Date.now() < expiresAt * 1000 - 10 * 1000;

      // The user asked for their current groups, e.g. right after being added to one in
      // Cevi.DB. The client posts a session update for that, and the answer is a refresh ahead
      // of time, because the groups only ever arrive with one.
      const isRequestedSync =
        trigger === 'update' && isStillValid && hasRefreshToken && !mustWaitForRequestedSync(token);

      if (isStillValid && !isRequestedSync) {
        reportSessionTokenKept();
        return token;
      }

      // Access token has expired, try to update it. Without a refresh token there is no way to
      // learn the user's current groups again, so the session ends instead of living on the
      // groups it has.
      if (token.refresh_token === undefined || token.refresh_token === '') {
        logger.info('Ending a session that has no refresh token', {
          'auth.user_uuid': token.uuid,
        });
        return SESSION_ENDED;
      }

      let reason: string;
      if (isRequestedSync) {
        reason = 'user_requested';
      } else if (expiresAt === 0) {
        reason = 'missing_expires_at';
      } else if (Date.now() >= expiresAt * 1000) {
        reason = 'token_expired';
      } else {
        reason = 'token_approaching_expiry';
      }

      // Undefined when Cevi.DB could not be reached: every request waiting on this refresh
      // then goes on with the token it came with, not with the one of whoever started it.
      const outcome = await refreshAccessToken(token, token.refresh_token, reason);
      if (outcome === SESSION_ENDED) return SESSION_ENDED;
      const refreshed = outcome ?? token;
      if (isRequestedSync) {
        return { ...refreshed, sync_requested_at: Math.floor(Date.now() / 1000) };
      }
      if (refreshed === token) reportSessionTokenKept();
      return refreshed;
    },
  },

  pages: {
    signIn: '/admin/login',
    error: '/admin/login',
  },
};
