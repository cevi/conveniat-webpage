import { decodeStoredEventName } from '@/features/billing/collections/decode-stored-event-name';
import {
  canAccessBilling,
  canAccessBillingField,
  hasBillingOrAdminOrWebAccess,
} from '@/features/payload-cms/payload-cms/access-rules/can-access-billing';
import { isFullAdmin } from '@/features/payload-cms/payload-cms/access-rules/roles';
import { AdminPanelDashboardGroups } from '@/features/payload-cms/payload-cms/admin-panel-dashboard-groups';
import { getValidationMessage } from '@/features/payload-cms/payload-cms/utils/validation-messages';
import type { CollectionConfig, TextFieldSingleValidation } from 'payload';

/** Cevi.DB group and event ids are plain numbers of up to six digits. */
const HITOBITO_ID = /^\d{1,6}$/;

/**
 * Replaces Payload's own text validation, so it has to reject an empty value itself — a
 * custom `validate` drops the built-in `required` check.
 */
const validateHitobitoId: TextFieldSingleValidation = (value, { req }) => {
  if (typeof value === 'string' && HITOBITO_ID.test(value.trim())) return true;
  return getValidationMessage(req.i18n.language, {
    en: 'Must be a number of up to 6 digits.',
    de: 'Muss eine Zahl mit höchstens 6 Stellen sein.',
    fr: "Doit être un nombre d'au plus 6 chiffres.",
  });
};

/**
 * The Höfe of the camp, one document per Cevi.DB group.
 *
 * Filled by the subgroup sync of the billing ("Anlässe automatisch aus Cevi.DB laden"), which
 * adds the conveniat27 events a group runs to its Hof. The billing reads the events to know
 * which participations to sync and whom to remind; other areas reference a Hof by its
 * document id.
 */
export const HoefeCollection: CollectionConfig = {
  slug: 'hoefe',
  typescript: { interface: 'Hof' },
  labels: {
    singular: { en: 'Hof', de: 'Hof', fr: 'Hof' },
    plural: { en: 'Hofs', de: 'Höfe', fr: 'Hofs' },
  },
  admin: {
    useAsTitle: 'name',
    group: AdminPanelDashboardGroups.BackofficeBilling.label,
    defaultColumns: ['name', 'groupId', 'events'],
    description: {
      en: 'One entry per Cevi.DB group that runs a conveniat27 camp, with the events synced for billing.',
      de: 'Ein Eintrag pro Cevi.DB-Gruppe, die ein conveniat27-Lager durchführt, mit den für die Rechnungsstellung abgeglichenen Anlässen.',
      fr: 'Une entrée par groupe Cevi.DB qui organise un camp conveniat27, avec les événements synchronisés pour la facturation.',
    },
    components: {
      beforeListTable: [
        '@/features/billing/components/populate-subevents-button#PopulateSubeventsButton',
      ],
    },
  },
  access: {
    // Name, group and events are not confidential, and other areas build on them. The two
    // address fields below are narrowed to the billing team on the field.
    read: hasBillingOrAdminOrWebAccess,
    create: canAccessBilling,
    update: canAccessBilling,
    // Other collections point at a Hof, so removing one is left to the admins.
    delete: isFullAdmin,
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      label: { en: 'Name', de: 'Name', fr: 'Nom' },
      admin: {
        description: {
          en: 'Display name, e.g. "Hof Süd". Suggested by the sync when the Hof is first found, never changed by it afterwards.',
          de: 'Anzeigename, z.B. "Hof Süd". Wird beim ersten Abgleich vorgeschlagen und danach vom Abgleich nicht mehr verändert.',
          fr: 'Nom d\'affichage, par ex. "Hof Süd". Proposé par la synchronisation lorsque le Hof est trouvé pour la première fois, puis jamais modifié par celle-ci.',
        },
      },
    },
    {
      name: 'groupId',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      label: { en: 'Group ID', de: 'Gruppen-ID', fr: 'ID du groupe' },
      admin: {
        description: {
          en: 'Hitobito group ID of this Hof (up to 6 digits)',
          de: 'Hitobito Gruppen-ID dieses Hofs (bis zu 6 Stellen)',
          fr: "ID du groupe Hitobito de ce Hof (jusqu'à 6 chiffres)",
        },
      },
      validate: validateHitobitoId,
    },
    {
      name: 'events',
      type: 'array',
      label: {
        en: 'Hitobito Events to Sync',
        de: 'Hitobito Anlässe zum Synchronisieren',
        fr: 'Événements Hitobito à synchroniser',
      },
      admin: {
        components: {
          RowLabel: {
            path: '@/features/billing/components/event-row-label#EventRowLabel',
          },
        },
        description: {
          en: 'Configure which Hitobito events should be synced for billing.',
          de: 'Konfigurieren Sie, welche Hitobito-Anlässe für die Rechnungsstellung synchronisiert werden.',
          fr: 'Configurez les événements Hitobito à synchroniser pour la facturation.',
        },
      },
      fields: [
        {
          name: 'eventId',
          type: 'text',
          required: true,
          label: { en: 'Event ID', de: 'Anlass-ID', fr: "ID de l'événement" },
          admin: {
            description: {
              en: 'Hitobito event ID to sync (up to 6 digits)',
              de: 'Hitobito Anlass-ID zum Synchronisieren (bis zu 6 Stellen)',
              fr: "ID de l'événement Hitobito à synchroniser (jusqu'à 6 chiffres)",
            },
          },
          validate: validateHitobitoId,
        },
        {
          name: 'eventName',
          type: 'text',
          required: true,
          hooks: { afterRead: [decodeStoredEventName] },
          label: { en: 'Event Name', de: 'Anlass-Name', fr: "Nom de l'événement" },
          admin: {
            description: {
              en: 'Name of the event in Cevi.DB, refreshed by every sync',
              de: 'Name des Anlasses in der Cevi.DB, wird bei jedem Abgleich aktualisiert',
              fr: "Nom de l'événement dans Cevi.DB, actualisé à chaque synchronisation",
            },
          },
        },
      ],
    },
    {
      name: 'addressManagerEmails',
      type: 'text',
      access: { read: canAccessBillingField, update: canAccessBillingField },
      label: {
        en: 'Address managers (from Cevi.DB)',
        de: 'Adressverwalter/-innen (aus Cevi.DB)',
        fr: "Gestionnaires d'adresses (Cevi.DB)",
      },
      admin: {
        description: {
          en: 'Comma-separated. Written by the subgroup sync button; these are the recipients of the mandatory-fields reminder email.',
          de: 'Kommagetrennt. Wird vom Subgruppen-Abgleich geschrieben; an diese Adressen geht die Erinnerung zu den Pflichtangaben.',
          fr: 'Séparées par des virgules. Écrites par la synchronisation des sous-groupes ; ce sont les destinataires du rappel sur les données obligatoires.',
        },
      },
    },
    {
      name: 'reminderRecipientsOverride',
      type: 'text',
      access: { read: canAccessBillingField, update: canAccessBillingField },
      label: {
        en: 'Override reminder recipients',
        de: 'Empfänger der Erinnerung überschreiben',
        fr: 'Remplacer les destinataires du rappel',
      },
      admin: {
        description: {
          en: 'Comma-separated. When filled, these addresses are used instead of the synced address managers for this Hof.',
          de: 'Kommagetrennt. Wenn ausgefüllt, gehen die Erinnerungen für diesen Hof an diese Adressen statt an die abgeglichenen Adressverwalter/-innen.',
          fr: "Séparées par des virgules. Si rempli, ces adresses sont utilisées à la place des gestionnaires d'adresses synchronisés pour ce Hof.",
        },
      },
    },
  ],
};
