import {
  hasAdminOrWebAccess,
  shouldHideInAdminPanel,
} from '@/features/payload-cms/payload-cms/access-rules/roles';
import { AdminPanelDashboardGroups } from '@/features/payload-cms/payload-cms/admin-panel-dashboard-groups';
import { flushPageCacheOnDelete } from '@/features/payload-cms/payload-cms/utils/flush-page-cache-on-change';
import type { CollectionConfig } from 'payload';

export const TimelineEntryCategory: CollectionConfig = {
  slug: 'timelineCategory',
  // No afterChange: a page shows the entries of a category, never its name or description.
  hooks: { afterDelete: [flushPageCacheOnDelete] },

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
    group: AdminPanelDashboardGroups.WebpageContent.label,
    useAsTitle: 'name',
    hidden: shouldHideInAdminPanel,
  },

  access: {
    read: () => true,
    update: hasAdminOrWebAccess,
    create: hasAdminOrWebAccess,
    delete: hasAdminOrWebAccess,
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
