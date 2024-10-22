import { NextAuthOptions } from 'next-auth'
import { OAuthConfig } from 'next-auth/providers/oauth'
import { JWT } from 'next-auth/jwt'

interface HitobitoProfile {
  id: string
  email: string
  first_name: string
  last_name: string
  nickname: string
  roles: {
    group_id: number
    group_name: string
  }[]
}

const HITOBITO_BASE_URL = process.env.HITOBITO_BASE_URL

export const CeviDBProvider: OAuthConfig<HitobitoProfile> = {
  id: 'cevi-db',
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

  // This custom is used as soon as we would like to use a scope different from 'email'.
  // As Hitobito uses the 'X-Scopes' header to pass the scopes, and not the 'scope' parameter,
  userinfo: {
    async request({ tokens }) {
      const url = `${HITOBITO_BASE_URL}/oauth/profile`
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${tokens.access_token}`,
          'X-Scope': 'with_roles',
        },
      })
      return (await response.json()) as HitobitoProfile
    },
  },

  type: 'oauth',
  version: '2.0',
  httpOptions: { timeout: 10_000 },
  profile: (profile: HitobitoProfile) => profile,
  clientId: process.env.CEVI_DB_CLIENT_ID,
  clientSecret: process.env.CEVI_DB_CLIENT_SECRET,
}

export const authOptions: NextAuthOptions = {
  providers: [CeviDBProvider],
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
        // @ts-expect-error TODO: fix typing
        cevi_db_uuid: token.cevi_db_uuid,
        groups: token.groups,
      }
      return session
    },

    // we inject additional info about the user to the JWT token
    jwt({ token, profile: _profile }): JWT {
      const profile = _profile as HitobitoProfile
      token.cevi_db_uuid = profile.id // the ide of the user in the CeviDB

      token.groups = profile.roles.map((role) => ({
        id: role.group_id,
        name: role.group_name,
      }))

      token.email = profile.email
      token.name = profile.first_name + ' ' + profile.last_name
      return token
    },
  },

  pages: {
    signIn: '/admin/login',
    error: '/admin/login',
  },
}
