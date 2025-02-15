import { HitobitoNextAuthUser } from '@/auth/hitobito-next-auth-user';
import { AuthStrategyFunction, BasePayload } from 'payload';
import { User } from '@/payload-types';

/**
 * Checks if a user is a valid NextAuth user, i.e. has all required fields
 * @param user
 */
export const isValidNextAuthUser = (user: HitobitoNextAuthUser): boolean => {
  return user.name !== '' && user.email !== '' && user.cevi_db_uuid > 0;
};

async function saveUserToDB(
  payload: BasePayload,
  nextAuthUser: HitobitoNextAuthUser,
): Promise<void> {
  const userExists = await payload
    .count({
      collection: 'users',
      where: { cevi_db_uuid: { equals: nextAuthUser.cevi_db_uuid } },
    })
    .then((response) => response.totalDocs == 1);

  // abort if the user already exists but still update user data
  if (userExists) {
    await payload.update({
      collection: 'users',
      where: { cevi_db_uuid: { equals: nextAuthUser.cevi_db_uuid } },
      data: {
        groups: nextAuthUser.groups,
        email: nextAuthUser.email,
        fullName: nextAuthUser.name,
        nickname: nextAuthUser.nickname,
      },
    });
    return; // bail out and do not create user
  }

  // save the new user to the database
  try {
    await payload.create({
      collection: 'users',
      data: {
        cevi_db_uuid: nextAuthUser.cevi_db_uuid,
        groups: nextAuthUser.groups,
        email: nextAuthUser.email,
        fullName: nextAuthUser.name,
        nickname: nextAuthUser.nickname,
      },
    });
  } catch {
    // Catch Race Condition
  }
}

/**
 * Fetches the session from the CeviDB API
 * @param cookie the cookie to use for the request
 */
const fetchSessionFromCeviDB = async (cookie: string) => {
  const APP_HOST_URL = process.env['APP_HOST_URL'] ?? '';
  return (await fetch(APP_HOST_URL + '/api/auth/session', {
    headers: {
      cookie,
    },
  }).then((response) => response.json())) as { user?: HitobitoNextAuthUser } | null;
};

/**
 * Fetches the Payload user from the database given a NextAuth user
 * @param payload
 * @param nextAuthUser
 */
async function getPayloadUserFromNextAuthUser(
  payload: BasePayload,
  nextAuthUser: HitobitoNextAuthUser,
): Promise<User | undefined> {
  return await payload
    .find({
      collection: 'users',
      where: { cevi_db_uuid: { equals: nextAuthUser.cevi_db_uuid } },
    })
    .then((response) => response.docs[0]);
}

// @ts-ignore
export const getAuthenticateUsingCeviDB: AuthStrategyFunction = async ({ headers, payload }) => {
  const cookie = headers.get('cookie');
  if (!cookie) return { user: undefined };

  const session = await fetchSessionFromCeviDB(cookie);
  if (!session?.user || !isValidNextAuthUser(session.user)) {
    return { user: undefined };
  }

  const nextAuthUser = session.user;
  await saveUserToDB(payload, nextAuthUser);

  const user = await getPayloadUserFromNextAuthUser(payload, nextAuthUser);

  return {
    user: {
      collection: 'users',
      ...user,
    },
  };
};
