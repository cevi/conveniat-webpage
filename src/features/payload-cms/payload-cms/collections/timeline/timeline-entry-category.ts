import { AdminPanelDashboardGroups } from '@/features/payload-cms/payload-cms/admin-panel-dashboard-groups';
import type { CollectionConfig } from 'payload';

export const TimelineEntryCategory: CollectionConfig = {
  slug: 'timelineCategory',

  labels: {
    singular: {
      en: 'Timeline Entry Category',
      de: 'Timeline Kategorie',
      fr: "Catégorie d'entrée de chronologie",
    },
    plural: {
      en: 'Timeline Entry Categories',
      de: 'Timeline Kategorien',
      fr: "Catégories d'entrées de chronologie",
    },
  },

  admin: {
    group: AdminPanelDashboardGroups.GlobalSettings,
    useAsTitle: 'name',
  },

  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
    },
    {
      name: 'description',
      type: 'text',
    },
    {
      name: 'relatedTimelineEntries',
      type: 'join',
      collection: 'timeline',
      on: 'categories',
    },
  ],
};
