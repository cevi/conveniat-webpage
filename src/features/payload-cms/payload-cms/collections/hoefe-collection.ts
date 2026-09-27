import { decodeStoredEventName } from '@/features/billing/collections/decode-stored-event-name';
import {
  canAccessBillingField,
  hasBillingOrAdminOrWebAccess,
} from '@/features/payload-cms/payload-cms/access-rules/can-access-billing';
import {
  hasAdminOrWebAccess,
  isFullAdmin,
} from '@/features/payload-cms/payload-cms/access-rules/roles';
import { AdminPanelDashboardGroups } from '@/features/payload-cms/payload-cms/admin-panel-dashboard-groups';
import { getValidationMessage } from '@/features/payload-cms/payload-cms/utils/validation-messages';
import type { CollectionConfig, FieldAccess, TextFieldSingleValidation } from 'payload';

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
 * Everything but the reminder override comes from Cevi.DB through the sync, which writes over
 * the local API: in the admin panel it can be read, not changed, so it cannot drift from
 * Cevi.DB.
 */
const syncedFromCeviDatabase = { create: (): boolean => false, update: (): boolean => false };

/** Who may place a Hof in its Quartier: the same people who may open a Hof at all. */
const canPlaceHofInQuartier: FieldAccess = (args) =>
  hasAdminOrWebAccess({ req: args.req }) || canAccessBillingField(args);

/**
 * The Höfe of the camp, one document per Cevi.DB group.
 *
 * Filled by the subgroup sync of the billing ("Anlässe automatisch aus Cevi.DB laden"), which
 * adds the conveniat27 events a group runs to its Hof. Read-only in the admin panel but for
 * its Quartier and the reminder override: a change is made in Cevi.DB and then synced. The billing reads the events to know
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
    defaultColumns: ['name', 'quartier', 'groupId', 'events'],
    description: {
      en: 'One entry per Cevi.DB group that runs a conveniat27 camp. Synced from Cevi.DB and read-only here: change a Hof in Cevi.DB, then run "Load events from Cevi.DB" again.',
      de: 'Ein Eintrag pro Cevi.DB-Gruppe, die ein conveniat27-Lager durchführt. Aus der Cevi.DB abgeglichen und hier schreibgeschützt: Einen Hof in der Cevi.DB ändern und dann "Anlässe automatisch aus Cevi.DB laden" erneut ausführen.',
      fr: 'Une entrée par groupe Cevi.DB qui organise un camp conveniat27. Synchronisé depuis Cevi.DB et en lecture seule ici : modifier un Hof dans Cevi.DB, puis relancer le chargement des événements depuis Cevi.DB.',
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
    // only the sync creates a Hof. What stays writable is narrowed on the field: the reminder
    // override to the billing team, the Quartier to admin and web as well.
    create: (): boolean => false,
    update: hasBillingOrAdminOrWebAccess,
    // Other collections point at a Hof, so removing one is left to the admins.
    delete: isFullAdmin,
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      label: { en: 'Name', de: 'Name', fr: 'Nom' },
      access: syncedFromCeviDatabase,
      admin: {
        readOnly: true,
        description: {
          en: 'Display name, e.g. "Hof Süd", taken from the names of its events in Cevi.DB by every sync.',
          de: 'Anzeigename, z.B. "Hof Süd", bei jedem Abgleich aus den Namen seiner Anlässe in der Cevi.DB übernommen.',
          fr: "Nom d'affichage, par ex. « Hof Süd », repris à chaque synchronisation des noms de ses événements dans Cevi.DB.",
        },
      },
    },
    {
      name: 'quartier',
      type: 'relationship',
      relationTo: 'quartiere',
      label: { en: 'Quartier', de: 'Quartier', fr: 'Quartier' },
      // not from Cevi.DB: the camp assigns it, and the sync leaves it alone
      access: { update: canPlaceHofInQuartier },
      admin: {
        position: 'sidebar',
        description: {
          en: 'The Quartier of the campsite this Hof lies in.',
          de: 'Das Quartier des Lagerplatzes, in dem dieser Hof liegt.',
          fr: 'Le quartier du terrain de camp dans lequel se trouve ce Hof.',
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
      access: syncedFromCeviDatabase,
      admin: {
        readOnly: true,
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
      access: syncedFromCeviDatabase,
      admin: {
        readOnly: true,
        components: {
          RowLabel: {
            path: '@/features/billing/components/event-row-label#EventRowLabel',
          },
        },
        description: {
          en: 'The conveniat27 events of this group in Cevi.DB, whose participations the billing syncs.',
          de: 'Die conveniat27-Anlässe dieser Gruppe in der Cevi.DB, deren Teilnahmen die Rechnungsstellung abgleicht.',
          fr: 'Les événements conveniat27 de ce groupe dans Cevi.DB, dont la facturation synchronise les participations.',
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
      access: { read: canAccessBillingField, ...syncedFromCeviDatabase },
      label: {
        en: 'Address managers (from Cevi.DB)',
        de: 'Adressverwalter/-innen (aus Cevi.DB)',
        fr: "Gestionnaires d'adresses (Cevi.DB)",
      },
      admin: {
        readOnly: true,
        description: {
          en: 'Comma-separated. Written by the subgroup sync button; these are the recipients of the mandatory-fields reminder email.',
          de: 'Kommagetrennt. Wird vom Subgruppen-Abgleich geschrieben; an diese Adressen geht die Erinnerung zu den Pflichtangaben.',
          fr: 'Séparées par des virgules. Écrites par la synchronisation des sous-groupes ; ce sont les destinataires du rappel sur les données obligatoires.',
        },
      },
    },
    {
      // the same people with their names, which the Hof dashboard shows as the Hof's contacts
      name: 'addressManagers',
      type: 'array',
      access: { read: canAccessBillingField, ...syncedFromCeviDatabase },
      label: {
        en: 'Address managers with names (from Cevi.DB)',
        de: 'Adressverwalter/-innen mit Namen (aus Cevi.DB)',
        fr: "Gestionnaires d'adresses avec noms (Cevi.DB)",
      },
      admin: {
        readOnly: true,
        description: {
          en: 'Written by the subgroup sync button; the Hof dashboard lists them as the responsible people of the Hof.',
          de: 'Wird vom Subgruppen-Abgleich geschrieben; das Hof-Dashboard zeigt sie als Verantwortliche des Hofs.',
          fr: 'Écrits par la synchronisation des sous-groupes ; le tableau de bord du Hof les affiche comme responsables du Hof.',
        },
      },
      fields: [
        {
          name: 'name',
          type: 'text',
          label: { en: 'Name', de: 'Name', fr: 'Nom' },
        },
        {
          name: 'email',
          type: 'text',
          required: true,
          label: { en: 'Email', de: 'E-Mail', fr: 'E-mail' },
        },
      ],
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
