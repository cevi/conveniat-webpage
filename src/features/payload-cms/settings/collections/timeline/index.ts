import { AdminPanelDashboardGroups } from '@/features/payload-cms/settings/admin-panel-dashboard-groups';
import { asLocalizedCollection } from '@/features/payload-cms/settings/utils/localized-collection';
import type { CollectionConfig } from 'payload';
import { richTextArticleBlock } from '@/features/payload-cms/settings/shared-blocks/rich-text-article-block';
import { singlePictureBlock } from '@/features/payload-cms/settings/shared-blocks/single-picture-block';

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
    singular: 'Timeline Item',
    plural: 'Timeline Items',
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
    {
      name: 'title',
      label: {
        en: 'Title',
        de: 'Titel',
        fr: 'Titre',
      },
      type: 'text',
      localized: true,
      required: true,
      admin: {
        description: {
          en: 'This is the title that will be displayed on the page.',
          de: 'Dies ist der Titel, der auf der Seite angezeigt wird.',
          fr: "C'est le titre qui sera affiché sur la page.",
        },
      },
    },
    {
      name: 'mainContent',
      type: 'blocks',
      required: false,
      localized: true,
      admin: {
        description: {
          en: 'The main content of the page',
          de: 'Der Hauptinhalt der Seite',
          fr: 'Le contenu principal de la page',
        },
      },
      blocks: [richTextArticleBlock, singlePictureBlock],
    },
  ],
});
