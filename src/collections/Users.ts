import { AuthStrategyFunction, BasePayload, CollectionConfig } from 'payload';
import { canAccessAdminPanel } from '@/acces/canAccessAdminPanel';

type HitobitoNextAuthUser = {
  cevi_db_uuid: number;
  groups: { id: number; name: string }[];
  email: string;
  name: string;
};

async function saveUserToDB(payload: BasePayload, nextAuthUser: HitobitoNextAuthUser) {
  const userExists = await payload
    .count({
      collection: 'users',
      where: { cevi_db_uuid: { equals: nextAuthUser.cevi_db_uuid } },
    })
    .then((res) => res.totalDocs == 1);

  // abort if the user already exists
  if (userExists) return;

  // save the new user to the database
  await payload.create({
    collection: 'users',
    data: {
      cevi_db_uuid: nextAuthUser.cevi_db_uuid,
      groups: nextAuthUser.groups,
      email: nextAuthUser.email,
      fullName: nextAuthUser.name,
    },
  });
}

/**
 * Fetches the session from the CeviDB API
 * @param cookie the cookie to use for the request
 */
const fetchSessionFromCeviDB = async (cookie: string) => {
  return (await fetch('http://localhost:3000/api/auth/session', {
    headers: {
      cookie,
    },
  }).then((res) => res.json())) as { user?: HitobitoNextAuthUser } | null;
};

/**
 * Fetches the Payload user from the database given a NextAuth user
 * @param payload
 * @param nextAuthUser
 */
async function getPayloadUserFromNextAuthUser(
  payload: BasePayload,
  nextAuthUser: HitobitoNextAuthUser,
) {
  return await payload
    .find({
      collection: 'users',
      where: { cevi_db_uuid: { equals: nextAuthUser.cevi_db_uuid } },
    })
    .then((res) => res.docs[0]);
}

/**
 * Checks if a user is a valid NextAuth user, i.e. has all required fields
 * @param user
 */
const isValidNextAuthUser = (user: HitobitoNextAuthUser) => {
  return user.name && user.email && user.cevi_db_uuid;
};

// @ts-ignore
const getAuthenticateUsingCeviDB: AuthStrategyFunction = async ({ headers, payload }) => {
  const cookie = headers.get('cookie');
  if (!cookie) return { user: null };

  const session = await fetchSessionFromCeviDB(cookie);
  if (!session?.user || !isValidNextAuthUser(session.user)) {
    return { user: null };
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

export const Users: CollectionConfig = {
  slug: 'users',
  labels: {
    singular: 'User',
    plural: 'Users',
  },

  access: {
    admin: canAccessAdminPanel,
    create: () => false,
    delete: () => false,
    update: () => false,
  },

  admin: {
    description:
      'Represents a Hitobito user. These information get automatically synced whenever the user logs in.',
    useAsTitle: 'email',
    defaultColumns: ['email', 'fullName', 'cevi_db_uuid'],
  },
  auth: {
    disableLocalStrategy: true,
    loginWithUsername: false,
    strategies: [
      {
        name: 'CeviDB',
        authenticate: getAuthenticateUsingCeviDB,
      },
    ],
  },
  fields: [
    {
      name: 'groups',
      label: 'Groups of the User',
      type: 'json',
      required: true,
      admin: {
        readOnly: true,
        description: 'The groups the user is in.',
      },
      jsonSchema: {
        schema: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: {
                type: 'integer',
                title: 'The ID of the group',
                description: 'The ID of the group as used in the CeviDB.',
              },
              name: {
                title: 'The name of the group',
                description: 'The name of the group as used in the CeviDB.',
                type: 'string',
              },
            },
            required: ['id', 'name'],
          },
          title: 'Groups of the User',
          description: 'The groups the user is in as extracted from the CeviDB profile.',
        },
        // the following are random but unique identifiers for the schema
        uri: 'https://conveniat.ch/hitobito-groups.schema.json',
        fileMatch: ['https://conveniat.ch/hitobito-groups.schema.json'],
      },
    },
    {
      name: 'cevi_db_uuid',
      label: 'UserID inside CeviDB',
      type: 'number',
      required: true,
      admin: {
        readOnly: true,
        description: 'The ID of the user in the CeviDB.',
      },
      unique: true,
    },
    {
      name: 'email',
      label: 'Email',
      type: 'email',
      required: true,
      admin: {
        readOnly: true,
      },
      unique: true,
    },
    {
      name: 'fullName',
      label: 'Full Name',
      type: 'text',
      required: true,
      admin: {
        readOnly: true,
        description: 'The full name of the user, as it will be displayed publicly.',
      },
    },
  ],
};
