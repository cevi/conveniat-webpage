import { environmentVariables } from '@/config/environment-variables';
import {
  hasAccessToThisHelper,
  Roles,
} from '@/features/payload-cms/payload-cms/access-rules/roles';
import { AdminPanelDashboardGroups } from '@/features/payload-cms/payload-cms/admin-panel-dashboard-groups';
import type { CollectionConfig } from 'payload';

export const PresenceLogCollection: CollectionConfig = {
  slug: 'presence-logs',
  labels: {
    singular: {
      en: 'Presence Log',
      de: 'Anwesenheitslog',
      fr: 'Log de présence',
    },
    plural: {
      en: 'Presence Logs',
      de: 'Anwesenheitslogs',
      fr: 'Logs de présence',
    },
  },
  access: {
    // Only Admin and WebCoreTeam can view the logs
    read: hasAccessToThisHelper({
      requiredRoles: [Roles.FullAdmin, Roles.WebCoreTeam],
    }),
    create: () => false,
    update: () => false,
    delete: () => false,
  },
  admin: {
    useAsTitle: 'id',
    hidden: (): boolean => !environmentVariables.FEATURE_ENABLE_PRESENCE_TRACKING,
    group: AdminPanelDashboardGroups.InternalCollections,
    defaultColumns: ['user', 'isPresent', 'timestamp'],
  },
  fields: [
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      index: true,
    },
    {
      name: 'isPresent',
      type: 'checkbox',
      required: true,
    },
    {
      name: 'timestamp',
      type: 'date',
      required: true,
      admin: {
        date: {
          pickerAppearance: 'dayAndTime',
        },
      },
    },
  ],
};
