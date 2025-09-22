import { AdminPanelDashboardGroups } from '@/features/payload-cms/payload-cms/admin-panel-dashboard-groups';
import { mapAnnotationDescriptionLexicalEditorSettings } from '@/features/payload-cms/payload-cms/collections/camp-map-collection';
import { LastEditedByUserField } from '@/features/payload-cms/payload-cms/shared-fields/last-edited-by-user-field';
import { flushPageCacheOnChange } from '@/features/payload-cms/payload-cms/utils/flush-page-cache-on-change';
import { patchRichTextLinkHook } from '@/features/payload-cms/payload-cms/utils/link-field-logic';
import type { CollectionConfig } from 'payload';

export const CampScheduleEntryCollection: CollectionConfig = {
  slug: 'camp-schedule-entry',
  trash: true,
  ...flushPageCacheOnChange,

  labels: {
    singular: {
      en: 'Camp Schedule Entry',
      de: 'Lager-Programmblock',
      fr: 'Entrée du programme du camp',
    },
    plural: {
      en: 'Camp Schedule Entries',
      de: 'Lager-Programmblöcke',
      fr: 'Entrées du programme du camp',
    },
  },
  admin: {
    useAsTitle: 'title',
    group: AdminPanelDashboardGroups.AppContent,
    groupBy: true,
    disableCopyToLocale: true,
  },
  access: {
    read: () => true,
  },
  fields: [
    {
      name: 'title',
      label: {
        en: 'Title',
        de: 'Titel',
        fr: 'Titre',
      },
      type: 'text',
      required: true,
      localized: true,
      admin: {
        description: {
          en: 'The title of the entry.',
          de: 'Der Titel des Eintrags.',
          fr: "Le titre de l'entrée.",
        },
      },
    },
    {
      name: 'description',
      label: {
        en: 'Description',
        de: 'Beschreibung',
        fr: 'Description',
      },
      type: 'richText',
      required: true,
      localized: true,
      admin: {
        description: {
          en: 'The description of the entry',
          de: 'Die Beschreibung des Eintrags',
          fr: "La description de l'entrée",
        },
      },
      editor: mapAnnotationDescriptionLexicalEditorSettings,
      hooks: patchRichTextLinkHook,
    },
    {
      name: 'timeslot',
      label: {
        en: 'Time Slot',
        de: 'Zeitfenster',
        fr: 'Créneau horaire',
      },
      type: 'group',
      admin: {
        description: {
          en: 'Time slots for the schedule entry',
          de: 'Zeitfenster für den Programmeintrag',
          fr: 'Créneaux horaires pour l’entrée du programme',
        },
      },
      required: true,
      fields: [
        {
          name: 'date',
          label: {
            en: 'Date',
            de: 'Datum',
            fr: 'Date',
          },
          type: 'date',
          required: true,
          admin: {
            date: {
              pickerAppearance: 'dayOnly',
              displayFormat: 'yyyy-MM-dd',
            },
          },
        },
        {
          name: 'time',
          label: {
            en: 'Time',
            de: 'Zeit',
            fr: 'Heure',
          },
          type: 'text',
          required: true,
          admin: {
            description: {
              en: 'Time slots in HH:mm format (e.g., 08:00 - 18:00)',
              de: 'Zeitfenster im HH:mm-Format (z.B. 08:00 - 18:00)',
              fr: 'Créneaux horaires au format HH:mm (ex : 08:00 - 18:00)',
            },
          },
          validate: (value: string | string[] | undefined | null): true | string => {
            if (typeof value !== 'string') {
              return 'Invalid time format. Use HH:mm - HH:mm.';
            }
            const timePattern = /^([01]\d|2[0-3]):([0-5]\d) - ([01]\d|2[0-3]):([0-5]\d)$/;
            return timePattern.test(value) || 'Invalid time format. Use HH:mm - HH:mm.';
          },
        },
      ],
    },
    {
      name: 'location',
      label: {
        en: 'Location',
        de: 'Ort',
        fr: 'Emplacement',
      },
      type: 'relationship',
      relationTo: 'camp-map-annotations',
      hasMany: false,
      required: true,
      admin: {
        description: {
          en: 'Location of the Schedule Entry',
          de: 'Ort des Programmeintrags',
          fr: "Emplacement de l'entrée du programme",
        },
        position: 'sidebar',
      },
    },
    {
      name: 'organiser',
      label: {
        en: 'Organiser',
        de: 'Organisator',
        fr: 'Organisateur',
      },
      type: 'relationship',
      relationTo: 'users',
      hasMany: false,
      required: false,
      admin: {
        description: {
          en: 'Organiser',
          de: 'Organisator',
          fr: 'Organisateur',
        },
        position: 'sidebar',
      },
    },
    {
      name: 'participants_min',
      label: {
        en: 'Minimum Participants',
        de: 'Minimale Teilnehmer',
        fr: 'Participants minimum',
      },
      required: false,
      type: 'number',
    },
    {
      name: 'participants_max',
      label: {
        en: 'Maximum Participants',
        de: 'Maximale Teilnehmer',
        fr: 'Participants maximum',
      },
      required: false,
      type: 'number',
    },
    LastEditedByUserField,
  ],
};
