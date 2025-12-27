import { environmentVariables } from '@/config/environment-variables';
import type { User } from '@/features/payload-cms/payload-types';
import type { HitobitoNextAuthUser } from '@/types/hitobito-next-auth-user';
import type { AuthStrategyFunction, BasePayload } from 'payload';

/**
 * Checks if the provided NextAuth user object is considered valid based on specific criteria.
 *
 * A user is considered valid if:
 * 1. The user object itself is not `undefined`.
 * 2. The `name` property is not an empty string.
 * 3. The `email` property is not an empty string.
 * 4. The `uuid` property is set (not an empty string).
 *
 * @param {HitobitoNextAuthUser} user - The NextAuth user object to validate. Might be `undefined`.
 * @returns {boolean} `true` if the user meets all validity criteria, `false` otherwise.
 */
export const isValidNextAuthUser = (user?: HitobitoNextAuthUser): boolean => {
  return user !== undefined && user.name !== '' && user.email !== '' && user.uuid !== '';
};

/**
 * Fetches the session from the CeviDB API
 * @param cookie the cookie to use for the request
 */
const fetchSessionFromCeviDB = async (
  cookie: string,
): Promise<{ user?: HitobitoNextAuthUser } | null> => {
  const APP_HOST_URL = environmentVariables.APP_HOST_URL;
  return (await fetch(APP_HOST_URL + '/api/auth/session', {
    headers: {
      cookie,
    },
  }).then((response) => response.json())) as { user?: HitobitoNextAuthUser } | null;
};

/**
 * Attempts to find a Payload user document corresponding to a given NextAuth user
 * based on the `cevi_db_uuid`.
 *
 * @param {BasePayload} payload - The Payload instance.
 * @param {HitobitoNextAuthUser} nextAuthUser - The NextAuth user object
 *
 * @returns {Promise<User | undefined>} A promise that resolves to the found Payload user document,
 *   or `undefined` if the NextAuth user is invalid or no corresponding user is found.
 */
export async function getPayloadUserFromNextAuthUser(
  payload: BasePayload,
  nextAuthUser: HitobitoNextAuthUser,
): Promise<User | undefined> {
  if (!isValidNextAuthUser(nextAuthUser)) return undefined;

  return await payload
    .find({
      collection: 'users',
      where: { id: { equals: nextAuthUser.uuid } },
    })
    .then((response) => response.docs[0]);
}

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
export const getAuthenticateUsingCeviDB: AuthStrategyFunction = async ({ headers, payload }) => {
  const cookie = headers.get('cookie');
  if (cookie === null) return { user: undefined };

  const session = await fetchSessionFromCeviDB(cookie);
  if (!session?.user || !isValidNextAuthUser(session.user)) {
    return { user: undefined };
  }

  const nextAuthUser = session.user;
  const user = await getPayloadUserFromNextAuthUser(payload, nextAuthUser);

  return {
    user: {
      collection: 'users',
      ...user,
    },
  };
};
