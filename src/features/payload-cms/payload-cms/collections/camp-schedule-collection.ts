import { AdminPanelDashboardGroups } from '@/features/payload-cms/payload-cms/admin-panel-dashboard-groups';
import { mapAnnotationDescriptionLexicalEditorSettings } from '@/features/payload-cms/payload-cms/collections/camp-map-collection';
import type { CollectionConfig } from 'payload';

export const CampScheduleEntryCollection: CollectionConfig = {
  slug: 'camp-schedule-entry',
  trash: true,

  labels: {
    singular: {
      en: 'Camp Schedule Entry',
      de: 'Lager-Programmblock',
      fr: '',
    },
    plural: {
      en: 'Camp Schedule Entries',
      de: 'Lager-Programmblöcke',
      fr: '',
    },
  },
  admin: {
    useAsTitle: 'title',
    group: AdminPanelDashboardGroups.AppContent,
    groupBy: false,
    disableCopyToLocale: true,
  },
  access: {
    read: () => true,
  },
  fields: [
    {
      name: 'title',
      label: 'Title',
      type: 'text',
      required: true,
      localized: true,
      admin: {
        description: 'The title of the entry.',
      },
    },
    {
      name: 'description',
      label: 'Description',
      type: 'richText',
      required: true,
      localized: true,
      admin: {
        description: 'The description of the entry',
      },
      editor: mapAnnotationDescriptionLexicalEditorSettings,
    },
    {
      name: 'timeslots',
      label: 'Time Slots',
      type: 'array',
      admin: { description: 'Time slots' },
      required: true,
      fields: [
        {
          name: 'date',
          label: 'Date',
          type: 'date',
          required: false,
          admin: {
            date: {
              pickerAppearance: 'dayOnly',
              displayFormat: 'YYYY-MM-dd',
            },
          },
        },
        {
          name: 'time',
          label: 'Time',
          type: 'text',
          required: true,
          admin: {
            description: 'Time slots in HH:mm format (e.g., 08:00 - 18:00)',
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
      label: 'Location',
      type: 'relationship',
      relationTo: 'camp-map-annotations',
      hasMany: false,
      required: true,
      admin: {
        description: 'Location of the Schedule Entry',
        position: 'sidebar',
      },
    },
    {
      name: 'organiser',
      label: 'Organiser',
      type: 'relationship',
      relationTo: 'users',
      hasMany: false,
      required: false,
      admin: { description: 'Organiser', position: 'sidebar' },
    },
    {
      name: 'participants_min',
      label: 'Minimum Participants',
      required: false,
      type: 'number',
    },
    {
      name: 'participants_max',
      label: 'Maximum Participants',
      required: false,
      type: 'number',
    },
  ],
};
