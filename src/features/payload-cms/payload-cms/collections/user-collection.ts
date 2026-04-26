import { environmentVariables } from '@/config/environment-variables';
import {
  hasAccessToThisHelper,
  hasAdminOrWebAccess,
  Roles,
} from '@/features/payload-cms/payload-cms/access-rules/roles';
import { AdminPanelDashboardGroups } from '@/features/payload-cms/payload-cms/admin-panel-dashboard-groups';
import { LastEditedByUserField } from '@/features/payload-cms/payload-cms/shared-fields/last-edited-by-user-field';
import type { User } from '@/features/payload-cms/payload-types';
import prisma from '@/lib/db/prisma';
import { getAuthenticateUsingCeviDB } from '@/utils/auth-helpers';
import type { CollectionConfig } from 'payload';

const GROUPS_WITH_API_ACCESS = new Set(environmentVariables.GROUPS_WITH_API_ACCESS);

const syncUserToPostgres: NonNullable<
  NonNullable<CollectionConfig['hooks']>['afterChange']
>[number] = async ({ doc }): Promise<void> => {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  const uuid = doc.id as string | undefined | null;
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  const name = doc.fullName as string;

  if (uuid === undefined || uuid === null || uuid === '') {
    throw new Error('UUID is required to update the user in the database.');
  }

  await prisma.user.upsert({
    where: { uuid },
    update: {
      name: name,
    },
    create: {
      uuid: uuid,
      name: name,
      // set date to 1970-01-01 to avoid null values
      lastSeen: new Date('1970-01-01T00:00:00Z'),
    },
  });
};

export const UserCollection: CollectionConfig = {
  slug: 'users',
  trash: true,
  labels: {
    singular: {
      en: 'User',
      de: 'Benutzer',
      fr: 'Utilisateur',
    },
    plural: {
      en: 'Users',
      de: 'Benutzer',
      fr: 'Utilisateurs',
    },
  },

  hooks: {
    afterChange: [syncUserToPostgres],
  },

  access: {
    // All roles must be able to log into the admin dashboard
    admin: hasAccessToThisHelper({
      requiredRoles: [Roles.FullAdmin, Roles.WebCoreTeam, Roles.ProgramTeam, Roles.TranslationTeam],
    }),
    read: hasAdminOrWebAccess,
    create: () => false,
    delete: () => false,
    update: () => false,
  },
  admin: {
    description:
      'Represents a user. Data gets automatically synced from Hitobito whenever the user logs in. Users can also be created manually or imported via CSV.',
    useAsTitle: 'email',
    group: AdminPanelDashboardGroups.InternalCollections,
    groupBy: true,
    /** this is broken with our localized versions */
    disableCopyToLocale: true,
    defaultColumns: ['nickname', 'fullName', 'email', 'adminPanelAccess'],
    listSearchableFields: ['nickname', 'fullName', 'email'],
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
      required: false,
      admin: {
        description:
          'The ID of the user in the CeviDB. Set automatically when the user logs in via Hitobito. Leave empty for manually created users.',
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
          ({ data }): boolean => {
            if (!data) return false;
            const groups = (data as User).groups;
            if (!Array.isArray(groups)) return false;
            return groups.some((group) => GROUPS_WITH_API_ACCESS.has(group.id));
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
        description:
          'The email address of the user. Used for matching when the user logs in via Hitobito.',
      },
      unique: true,
    },
    {
      name: 'fullName',
      label: 'Full Name',
      type: 'text',
      required: true,
      admin: {
        description: 'The full name of the user, as it will be displayed publicly.',
      },
    },
    {
      name: 'nickname',
      label: 'Ceviname',
      type: 'text',
      required: false,
      admin: {
        description: 'The Ceviname of the user.',
      },
    },
    {
      name: 'groups',
      label: 'Groups of the User',
      type: 'json',
      required: false,
      defaultValue: [],
      admin: {
        description: 'The groups the user is in. Updated automatically from Hitobito on login.',
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
    {
      name: 'hof',
      label: 'Hof of the user',
      type: 'number',
      required: false,
      admin: {
        description: 'The Hof of the user.',
      },
    },
    {
      name: 'quartier',
      label: 'Quartier of the user',
      type: 'number',
      required: false,
      admin: {
        description: 'The Quartier of the user.',
      },
    },
    LastEditedByUserField,
  ],
};
