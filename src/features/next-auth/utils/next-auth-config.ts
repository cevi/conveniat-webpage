import { environmentVariables } from '@/config/environment-variables';
import type { HitobitoProfile } from '@/features/next-auth/types/hitobito-profile';
import type { NextAuthConfig } from 'next-auth';
import type { JWT } from 'next-auth/jwt';

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

      profile: (
        profile: HitobitoProfile,
      ): {
        roles: { group_id: number; group_name: string; role_name: string; role_class: string }[];
        name: string;
        nickname: string;
        id: string;
        email: string;
      } => {
        return {
          id: profile.id,
          name: profile.first_name + ' ' + profile.last_name,
          nickname: profile.nickname,
          email: profile.email,
          roles: profile.roles,
        };
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
    session({ session, token }) {
      session.user = {
        ...session.user,
        // @ts-ignore
        cevi_db_uuid: token.cevi_db_uuid,
        // @ts-ignore
        groups: token.groups,
        // @ts-ignore
        nickname: token.nickname,
      };
      return session;
    },

    // we inject additional info about the user to the JWT token
    jwt({ token, profile: _profile }): JWT {
      if (!_profile) return token;

      const profile = _profile as unknown as HitobitoProfile;
      // @ts-ignore
      token.cevi_db_uuid = profile.id; // the id of the user in the CeviDB

      // @ts-ignore
      token.groups = profile.roles.map((role) => ({
        id: role.group_id,
        name: role.group_name,
        role_name: role.role_name,
        role_class: role.role_class,
      }));

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
