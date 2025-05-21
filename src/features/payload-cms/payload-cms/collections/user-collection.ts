import { environmentVariables } from '@/config/environment-variables';
import { canAccessAdminPanel } from '@/features/payload-cms/payload-cms/access-rules/can-access-admin-panel';
import { AdminPanelDashboardGroups } from '@/features/payload-cms/payload-cms/admin-panel-dashboard-groups';
import type { User } from '@/features/payload-cms/payload-types';
import { getAuthenticateUsingCeviDB } from '@/utils/auth-helpers';
import type { BaseListFilter, CollectionConfig } from 'payload';

const GROUPS_WITH_API_ACCESS = new Set(environmentVariables.GROUPS_WITH_API_ACCESS);

const baseListFilter: BaseListFilter = () => ({
  'groups.id': {
    in: [...GROUPS_WITH_API_ACCESS],
  },
});

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
    group: AdminPanelDashboardGroups.InternalCollections,
    defaultColumns: ['nickname', 'fullName', 'adminPanelAccess'],
    listSearchableFields: ['nickname', 'fullName', 'email'],
    baseListFilter,
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
      name: 'adminPanelAccess',
      label: 'Admin Panel Access',
      type: 'checkbox',
      virtual: true,
      defaultValue: false,
      admin: {
        readOnly: true,
        description:
          'Whether the user has access to the admin panel. This is set automatically based on the user groups.',
      },
      hooks: {
        afterRead: [
          async ({ data }): Promise<boolean> => {
            if (!data) return false;
            return (data as User).groups.some((group) => GROUPS_WITH_API_ACCESS.has(group.id));
          },
        ],
      },
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
              role_name: {
                title: 'The name of the role',
                description: 'The name of the role the user has in the group.',
                type: 'string',
              },
              role_class: {
                title: 'The class of the role',
                description: 'The class of the role the user has in the group.',
                type: 'string',
              },
            },
            required: ['id', 'name', 'role_class', 'role_name'],
          },
          title: 'Groups of the User',
          description: 'The groups the user is in as extracted from the CeviDB profile.',
        },
        // the following are random but unique identifiers for the schema
        uri: 'https://conveniat27.ch/hitobito-groups.schema.json',
        fileMatch: ['https://conveniat27.ch/hitobito-groups.schema.json'],
      },
    },
  ],
};
