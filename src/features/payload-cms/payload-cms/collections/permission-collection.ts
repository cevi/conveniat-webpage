import type { CollectionConfig } from 'payload';
import { AdminPanelDashboardGroups } from '@/features/payload-cms/payload-cms/admin-panel-dashboard-groups';

export const PermissionsCollection: CollectionConfig = {
  slug: 'permissions',
  labels: {
    singular: 'Permission',
    plural: 'Permissions',
  },
  admin: {
    group: AdminPanelDashboardGroups.InternalCollections,
    defaultColumns: ['permissionName', 'permissions'],
    useAsTitle: 'permissionName',
  },
  access: {
    read: () => true,
  },
  fields: [
    {
      name: 'permissionName',
      label: {
        en: 'Permission Name',
        de: 'Berechtigungsname',
        fr: 'Nom de la permission',
      },
      type: 'text',
      required: true,
      localized: true,
      admin: {
        description: {
          en: 'The name of the permission.',
          de: 'Der Name der Berechtigung.',
          fr: 'Le nom de la permission.',
        },
      },
    },
    {
      // a list of {id, role} pairs where id is the id in CeviDB and the role is a string
      name: 'permissions',
      label: {
        en: 'Permissions',
        de: 'Berechtigungen',
        fr: 'Autorisations',
      },
      type: 'array',
      required: false,
      localized: false,
      admin: {
        description: {
          en: 'List of Groups in the CeviDB for this permission.',
          de: 'Liste der Gruppen in der CeviDB für diese Berechtigung.',
          fr: 'Liste des groupes dans la CeviDB pour cette autorisation.',
        },
      },
      fields: [
        {
          name: 'group_id',
          label: {
            en: 'GroupID',
            de: 'GroupID',
            fr: 'GroupID',
          },
          type: 'number',
          required: true,
          localized: false,
        },
        {
          name: 'note',
          label: {
            en: 'Note',
            de: 'Hinweis',
            fr: 'Remarque',
          },
          type: 'text',
          required: false,
          localized: false,
        },
      ],
    },
    {
      name: 'public',
      label: {
        en: 'Always Public',
        de: 'Immer öffentlich',
        fr: 'Toujours public',
      },
      type: 'checkbox',
      required: false,
      localized: false,
    },
    {
      name: 'logged_in',
      label: {
        en: 'Always Logged In',
        de: 'Immer eingeloggt',
        fr: 'Toujours connecté',
      },
      type: 'checkbox',
      required: false,
      localized: false,
    },
  ],
};
