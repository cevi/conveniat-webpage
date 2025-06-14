import { AdminPanelDashboardGroups } from '@/features/payload-cms/payload-cms/admin-panel-dashboard-groups';
import type { CollectionConfig } from 'payload';

interface ConditionType<> {
  permissions:
    | {
        group_id: number;
        note: string;
      }[]
    | undefined;
  special_permissions: {
    public: boolean;
    logged_in: boolean;
  };
}

export const PermissionsCollection: CollectionConfig = {
  slug: 'permissions',
  labels: {
    singular: {
      en: 'Permission',
      de: 'Berechtigung',
      fr: 'Permission',
    },
    plural: {
      en: 'Permissions',
      de: 'Berechtigungen',
      fr: 'Permissions',
    },
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
          en: 'List of Groups in the CeviDB for this permission. Disables the special permissions section.',
          de: 'Liste der Gruppen in der CeviDB für diese Berechtigung. Deaktiviert den Abschnitt für spezielle Berechtigungen.',
          fr: 'Liste des groupes dans la CeviDB pour cette autorisation. Désactive la section des autorisations spéciales.',
        },
        condition: (data): boolean => {
          const typedData = data as ConditionType;
          return !typedData.special_permissions.public && !typedData.special_permissions.logged_in;
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
      name: 'special_permissions',
      label: {
        en: 'Special Permissions',
        de: 'Sonderberechtigungen',
        fr: 'Autorisations spéciales',
      },
      type: 'group',
      localized: false,
      admin: {
        description: {
          en: 'These permissions are special and disable group checking for CeviDB groups.',
          de: 'Diese Berechtigungen sind speziell und deaktivieren die Gruppenüberprüfung für CeviDB-Gruppen.',
          fr: 'Ces autorisations sont spéciales et désactivent la vérification des groupes pour les groupes CeviDB.',
        },
      },
      fields: [
        {
          name: 'public',
          label: {
            en: 'Without Login (Public)',
            de: 'Ohne Login (Öffentlich)',
            fr: 'Sans connexion (public)',
          },
          type: 'checkbox',
          required: false,
          localized: false,
          admin: {
            condition: (data): boolean => {
              const typedData = data as ConditionType;
              return typedData.permissions && typedData.permissions.length > 0
                ? false
                : !typedData.special_permissions.logged_in;
            },
          },
        },
        {
          name: 'logged_in',
          label: {
            en: 'Must be logged in (any CeviDB account)',
            de: 'Muss eingeloggt sein (jedes CeviDB-Konto)',
            fr: "Doit être connecté (n'importe quel compte CeviDB)",
          },
          type: 'checkbox',
          required: false,
          localized: false,
          admin: {
            condition: (data): boolean => {
              const typedData = data as ConditionType;
              return typedData.permissions && typedData.permissions.length > 0
                ? false
                : !typedData.special_permissions.public;
            },
          },
        },
      ],
    },
  ],
};
