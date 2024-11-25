import { CollectionConfig } from 'payload';
import { canAccessAdminPanel } from '@/payload-cms/access-rules/can-access-admin-panel';
import { getAuthenticateUsingCeviDB } from '@/auth/auth-helpers';

export const UserCollection: CollectionConfig = {
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
    defaultColumns: ['email', 'fullName', 'nickname', 'cevi_db_uuid'],
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
    {
      name: 'nickname',
      label: 'Ceviname',
      type: 'text',
      required: false,
      admin: {
        readOnly: true,
        description: 'The Ceviname of the user.',
      },
    },
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
  ],
};
