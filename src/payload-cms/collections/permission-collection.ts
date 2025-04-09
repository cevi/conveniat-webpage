import { CollectionConfig } from 'payload';
import { AdminPanelDashboardGroups } from '@/payload-cms/admin-panel-dashboard-groups';

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
      required: true,
      localized: true,
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
          localized: true,
        },
      ],
    },
  ],
};
