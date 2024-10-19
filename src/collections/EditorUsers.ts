import { BasePayload, CollectionConfig } from 'payload'
import { userFields } from '@/collections/Users'

const GROUPS_WITH_API_ACCESS = [1]

type HitobitoNextAuthUser = {
  cevi_db_uuid: number
  groups: { id: number; name: string }[]
  email: string
  name: string
}

async function saveUserToDB(payload: BasePayload, nextAuthUser: HitobitoNextAuthUser) {
  const userExists = await payload
    .count({
      collection: 'users',
      where: { cevi_db_uuid: { equals: nextAuthUser.cevi_db_uuid } },
    })
    .then((res) => res.totalDocs == 1)

  if (!userExists)
    // save the new user to the database
    await payload.create({
      collection: 'users',
      data: {
        cevi_db_uuid: nextAuthUser.cevi_db_uuid,
        groups: nextAuthUser.groups,
        email: nextAuthUser.email,
        fullName: nextAuthUser.name,
      },
    })
}

export const EditorUsers: CollectionConfig = {
  slug: 'editor_users',
  labels: {
    singular: 'User',
    plural: 'Users',
  },
  admin: {
    description: 'Users that can access the editor.',
    useAsTitle: 'email',
  },
  auth: {
    disableLocalStrategy: true,
    loginWithUsername: false,
    strategies: [
      {
        name: 'CeviDB',
        authenticate: async ({ headers, payload }) => {
          const cookie = headers.get('cookie')
          if (!cookie) return { user: null }

          const session = await fetch('http://localhost:3000/api/auth/session', {
            headers: {
              cookie,
            },
          }).then((res) => res.json())
          if (!session) return { user: null }

          const nextAuthUser: HitobitoNextAuthUser = session.user

          // validate nextAuthUser object
          if (
            !nextAuthUser ||
            !nextAuthUser.name ||
            !nextAuthUser.email ||
            !nextAuthUser.cevi_db_uuid
          ) {
            return { user: null }
          }

          /*
           *
           * !!! IMPORTANT !!!
           *
           * We only allow users that are in a specific hitobito group to access the API.
           *
           * This is done by checking the groups of the user. If we don't do such a check,
           * every user with a CeviDB account could access the API and thus the backend.
           *
           * Nevertheless, we still add all users to the DB. Even the ones that are not in the
           * able to access the API. This is done to have a complete list of all users in the
           * that have accessed restricted content.
           *
           * To restrict certain content / routes to authenticated users (without the need
           * to perform authorization checks), we can use the NextAuth useSession hook.
           *
           * More info can be found here:
           * https://payloadcms.com/docs/beta/access-control/overview
           *
           * !!! IMPORTANT !!!
           *
           */
          await saveUserToDB(payload, nextAuthUser) // save the user to the database

          // check if user is in the allowed group
          if (
            !nextAuthUser.groups?.some(
              (group) => group.id && GROUPS_WITH_API_ACCESS.includes(group.id),
            )
          ) {
            // deny access to the API
            return { user: null }
          }

          // check if user is already in the database
          const users = await payload.find({
            collection: 'editor_users',
            where: { cevi_db_uuid: { equals: nextAuthUser.cevi_db_uuid } },
          })

          if (users.docs.length > 1) {
            throw new Error('Multiple users with the same ID found in the database.')
          }

          // if user is not in the database, create it
          if (users.docs.length === 0) {
            await payload.create({
              collection: 'editor_users',
              data: {
                cevi_db_uuid: nextAuthUser.cevi_db_uuid,
                groups: nextAuthUser.groups,
                email: nextAuthUser.email,
                function: 'Unknown Function',
                fullName: nextAuthUser.name,
              },
            })
          }

          const user = await payload
            .find({
              collection: 'editor_users',
              where: { cevi_db_uuid: { equals: nextAuthUser.cevi_db_uuid } },
            })
            .then((res) => res.docs[0])

          return {
            user: {
              collection: 'editor_users',
              ...user,
            },
          }
        },
      },
    ],
  },
  fields: [
    ...userFields,
    {
      name: 'function',
      label: 'Funktion',
      type: 'text',
      required: true,
      admin: {
        description: 'The function of the user, as it will be displayed publicly.',
      },
    },
  ],
}
