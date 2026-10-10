import { isFullAdmin } from '@/features/payload-cms/payload-cms/access-rules/roles';
import { AdminPanelDashboardGroups } from '@/features/payload-cms/payload-cms/admin-panel-dashboard-groups';
import type { CollectionConfig } from 'payload';

/**
 * The addresses no mail goes to any more, because one bounced from them for good.
 *
 * Written by `fetchSmtpBounces` and read before every send, see `email-suppression`.
 * Deleting an entry is how an address is written to again.
 */
export const EmailSuppressions: CollectionConfig = {
  slug: 'email-suppressions',
  labels: {
    singular: {
      en: 'Suppressed Email Address',
      de: 'Gesperrte E-Mail-Adresse',
      fr: 'Adresse e-mail bloquée',
    },
    plural: {
      en: 'Suppressed Email Addresses',
      de: 'Gesperrte E-Mail-Adressen',
      fr: 'Adresses e-mail bloquées',
    },
  },
  admin: {
    useAsTitle: 'email',
    group: AdminPanelDashboardGroups.BackofficeSystem.label,
    defaultColumns: ['email', 'status', 'outgoingEmail', 'createdAt'],
    description: {
      en: 'Mail to these addresses came back because the address does not exist, or kept coming back for two weeks or more. Nothing is sent to them until the entry is deleted.',
      de: 'E-Mails an diese Adressen kamen zurück, weil es die Adresse nicht gibt oder weil sie über zwei Wochen oder länger nicht zugestellt werden konnten. An sie wird nichts mehr versendet, bis der Eintrag gelöscht wird.',
      fr: "Les e-mails envoyés à ces adresses sont revenus parce que l'adresse n'existe pas, ou n'ont pas pu être remis pendant deux semaines ou plus. Plus rien ne leur est envoyé tant que l'entrée n'est pas supprimée.",
    },
  },
  access: {
    read: isFullAdmin,
    create: () => false,
    update: () => false,
    delete: isFullAdmin,
  },
  fields: [
    {
      name: 'email',
      type: 'text',
      label: { en: 'Address', de: 'Adresse', fr: 'Adresse' },
      required: true,
      unique: true,
      index: true,
      admin: { readOnly: true },
    },
    {
      name: 'status',
      type: 'text',
      label: { en: 'Bounce status', de: 'Fehlercode', fr: "Code d'erreur" },
      admin: { readOnly: true },
    },
    {
      name: 'outgoingEmail',
      type: 'relationship',
      relationTo: 'outgoing-emails',
      hasMany: false,
      label: { en: 'Bounced email', de: 'Zurückgekommene E-Mail', fr: 'E-mail revenu' },
      admin: { readOnly: true },
    },
  ],
};
