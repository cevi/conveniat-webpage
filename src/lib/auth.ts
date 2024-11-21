import { NextAuthConfig } from 'next-auth';
import { JWT } from 'next-auth/jwt';

interface HitobitoProfile {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  nickname: string;
  roles: {
    group_id: number;
    group_name: string;
  }[];
}

const HITOBITO_BASE_URL = process.env['HITOBITO_BASE_URL'] ?? undefined;
const CEVI_DB_CLIENT_ID = process.env['CEVI_DB_CLIENT_ID'] ?? undefined;
const CEVI_DB_CLIENT_SECRET = process.env['CEVI_DB_CLIENT_SECRET'] ?? undefined;

if (HITOBITO_BASE_URL === undefined) throw new Error('HITOBITO_BASE_URL is not set');
if (CEVI_DB_CLIENT_ID === undefined) throw new Error('CEVI_DB_CLIENT_ID is not set');
if (CEVI_DB_CLIENT_SECRET === undefined) throw new Error('CEVI_DB_CLIENT_SECRET is not set');

export const authOptions: NextAuthConfig = {
  providers: [
    {
      id: 'cevi-db',
      type: 'oauth',
      name: 'CeviDB',
      authorization: {
        url: `${HITOBITO_BASE_URL}/oauth/authorize`,
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
        async request({ tokens }: { tokens: { access_token: string } }) {
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

      profile: (profile: HitobitoProfile) => {
        return {
          id: profile.id,
          name: profile.first_name + ' ' + profile.last_name,
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
        groups: token.groups,
      };
      return session;
    },

    // we inject additional info about the user to the JWT token
    jwt({ token, profile: _profile }): JWT {
      if (!_profile) return token;

      const profile = _profile as unknown as HitobitoProfile;
      token.cevi_db_uuid = profile.id; // the ide of the user in the CeviDB

      token.groups = profile.roles.map((role) => ({
        id: role.group_id,
        name: role.group_name,
      }));

      token.email = profile.email;
      token.name = profile.first_name + ' ' + profile.last_name;
      return token;
    },
  },

  pages: {
    signIn: '/admin/login',
    error: '/admin/login',
  },
};
