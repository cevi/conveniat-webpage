import { environmentVariables } from '@/config/environment-variables';
import type { HitobitoProfile } from '@/features/next-auth/types/hitobito-profile';
import type { User } from '@/features/payload-cms/payload-types';
import type { NextAuthConfig } from 'next-auth';
import type { JWT } from 'next-auth/jwt';
import type { BasePayload } from 'payload';
import { getPayload } from 'payload';

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
  const matchedUsers = await payload.find({
    collection: 'users',
    where: { cevi_db_uuid: { equals: userProfile.id } },
  });

  if (matchedUsers.totalDocs > 1) {
    throw new Error('Multiple users found with the same UUID');
  }

  // abort if the user already exists but still update user data
  const payloadUserId = matchedUsers.docs[0]?.id;
  if (matchedUsers.totalDocs === 1 && payloadUserId !== undefined) {
    await payload.update({
      collection: 'users',
      where: { cevi_db_uuid: { equals: userProfile.id } },
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
      cevi_db_uuid: userProfile.id,
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

          console.log('userinfo response', response);
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
    async jwt({ token, profile: _profile }): Promise<JWT> {
      if (!_profile) return token;
      const profile = _profile as unknown as HitobitoProfile;

      // async loading of payload configuration (to avoid circular dependency)
      const config = await import('@payload-config');
      // @ts-ignore
      const payload = await getPayload({ config });
      const payloadCMSUser = await saveAndFetchUserFromPayload(payload, profile);

      // @ts-ignore
      token.uuid = payloadCMSUser.id; // the id of the user in the CeviDB

      // @ts-ignore
      token.group_ids = profile.roles.map((role) => role.group_id);

      token.email = profile.email;
      token.name = profile.first_name + ' ' + profile.last_name;
      token['nickname'] = profile.nickname;
      return token;
    },
  },

  pages: {
    signIn: '/admin/login',
    error: '/admin/login',
  },
};
