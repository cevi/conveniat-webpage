import type { User } from '@/features/payload-cms/payload-types';
import type { HitobitoNextAuthUser } from '@/types/hitobito-next-auth-user';
import { HitobitoNextAuthUserSchema } from '@/types/hitobito-next-auth-user';
import { auth } from '@/utils/auth';
import type { AuthStrategyFunction, BasePayload } from 'payload';

/**
 * Checks if the provided NextAuth user object is considered valid based on the Zod schema.
 *
 * @param {unknown} user - The NextAuth user object to validate.
 * @returns {user is HitobitoNextAuthUser} `true` if the user meets all validity criteria, `false` otherwise.
 */
export const isValidNextAuthUser = (user?: unknown): user is HitobitoNextAuthUser => {
  return HitobitoNextAuthUserSchema.safeParse(user).success;
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
export const getAuthenticateUsingCeviDB: AuthStrategyFunction = async ({ payload }) => {
  const session = await auth();
  const validationResult = HitobitoNextAuthUserSchema.safeParse(session?.user);

  if (!validationResult.success) {
    return { user: undefined };
  }

  const nextAuthUser = validationResult.data;
  const user = await getPayloadUserFromNextAuthUser(payload, nextAuthUser);

  return {
    user: {
      collection: 'users',
      ...user,
    },
  };
};
