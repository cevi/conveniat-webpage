import { environmentVariables } from '@/config/environment-variables';
import {
  hasAdminOrWebAccess,
  shouldHideInAdminPanel,
} from '@/features/payload-cms/payload-cms/access-rules/roles';
import { AdminPanelDashboardGroups } from '@/features/payload-cms/payload-cms/admin-panel-dashboard-groups';
import type { CollectionConfig } from 'payload';

/**
 * The helpers an AVP names to hand out the bands of their Hof at a station, until the AVP takes
 * them off again. One entry per Hof and person. The app writes the entries through tRPC, which
 * checks the AVP; in the admin panel admin and web see and fix them.
 *
 * A helper is a person of the Hof's list, kept by their Cevi.DB id, which their registration
 * and their login share; so a helper who never opened the app yet has the rights at the first
 * login.
 */
export const WristbandHelpersCollection: CollectionConfig = {
  slug: 'wristband-helpers',
  labels: {
    singular: { en: 'Wristband helper', de: 'Armband-Helfer/in', fr: 'Aide bracelets' },
    plural: { en: 'Wristband helpers', de: 'Armband-Helfende', fr: 'Aides bracelets' },
  },
  admin: {
    useAsTitle: 'personId',
    group: AdminPanelDashboardGroups.BackofficeHoefeAndMaterial.label,
    hidden: ({ user }): boolean =>
      !environmentVariables.FEATURE_ENABLE_NFC_WRISTBANDS || shouldHideInAdminPanel({ user }),
    defaultColumns: ['personId', 'hof', 'addedBy', 'createdAt'],
    description: {
      en: 'Who may hand out the wristbands of a Hof besides its AVP. The AVP adds and removes helpers in the app.',
      de: 'Wer neben der AVP die Armbänder eines Hofs vergeben darf. Die AVP fügt Helfende in der App hinzu und entfernt sie wieder.',
      fr: "Qui peut remettre les bracelets d'un Hof en plus de son AVP. L'AVP ajoute et retire les aides dans l'app.",
    },
  },
  access: {
    read: hasAdminOrWebAccess,
    create: hasAdminOrWebAccess,
    update: hasAdminOrWebAccess,
    delete: hasAdminOrWebAccess,
  },
  fields: [
    {
      name: 'hof',
      type: 'relationship',
      relationTo: 'hoefe',
      required: true,
      index: true,
      label: { en: 'Hof', de: 'Hof', fr: 'Hof' },
    },
    {
      name: 'personId',
      type: 'text',
      required: true,
      index: true,
      label: { en: 'Cevi.DB person', de: 'Cevi.DB-Person', fr: 'Personne Cevi.DB' },
      admin: {
        description: {
          en: 'The Cevi.DB id of the helper, the same as on their registration.',
          de: 'Die Cevi.DB-ID der helfenden Person, dieselbe wie auf ihrer Anmeldung.',
          fr: "L'identifiant Cevi.DB de la personne qui aide, le même que sur son inscription.",
        },
      },
    },
    {
      name: 'addedBy',
      type: 'relationship',
      relationTo: 'users',
      label: { en: 'Added by', de: 'Hinzugefügt von', fr: 'Ajouté par' },
      admin: { readOnly: true, position: 'sidebar' },
    },
  ],
};
