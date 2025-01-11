import { AdminPanelDashboardGroups } from '@/payload-cms/admin-panel-dashboard-groups';
import { asLocalizedCollection } from '@/payload-cms/utils/localized-collection';
import { CollectionConfig } from 'payload';
import { MainContentField } from '@/payload-cms/shared-fields/main-content-field';
import { blogArticleTitleField } from '../blog-article/fields';

export const TimelineCollection: CollectionConfig = asLocalizedCollection({
  slug: 'timeline',

  admin: {
    group: AdminPanelDashboardGroups.Pages,
    description: {
      en: 'Represents a timeline that can be published on the website.',
      de: 'Stellt eine Timeline dar, die auf der Website veröffentlicht werden kann.',
      fr: 'Représente une chronologie qui peut être publiée sur le site Web.',
    },
    defaultColumns: ['id', 'title', 'releaseDate'],
  },

  labels: {
    singular: 'Timeline',
    plural: 'Timelines',
  },

  fields: [
    {
      name: 'date',
      type: 'date',
      label: {
        en: 'Date',
        de: 'Datum',
        fr: 'Date',
      },
      required: true,
    },
    blogArticleTitleField,
    MainContentField,
  ],
});
