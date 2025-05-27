import { AdminPanelDashboardGroups } from '@/features/payload-cms/payload-cms/admin-panel-dashboard-groups';
import { instagramEmbedBlock } from '@/features/payload-cms/payload-cms/shared-blocks/instagram-embed-block';
import { richTextArticleBlock } from '@/features/payload-cms/payload-cms/shared-blocks/rich-text-article-block';
import { singlePictureBlock } from '@/features/payload-cms/payload-cms/shared-blocks/single-picture-block';
import { internalAuthorsField } from '@/features/payload-cms/payload-cms/shared-fields/internal-authors-field';
import { internalPageNameField } from '@/features/payload-cms/payload-cms/shared-fields/internal-page-name-field';
import { internalStatusField } from '@/features/payload-cms/payload-cms/shared-fields/internal-status-field';
import { asLocalizedCollection } from '@/features/payload-cms/payload-cms/utils/localized-collection';
import type { CollectionConfig } from 'payload';

export const TimelineCollection: CollectionConfig = asLocalizedCollection({
  slug: 'timeline',

  admin: {
    group: AdminPanelDashboardGroups.Pages,
    description: {
      en: 'Represents a timeline that can be published on the website.',
      de: 'Stellt eine Timeline dar, die auf der Website veröffentlicht werden kann.',
      fr: 'Représente une chronologie qui peut être publiée sur le site Web.',
    },
    defaultColumns: [
      'internalPageName',
      'internalStatus',
      'authors',
      'publishingStatus',
      'releaseDate',
      'updatedAt',
    ],
  },

  labels: {
    singular: 'Timeline Item',
    plural: 'Timeline Items',
  },

  fields: [
    internalPageNameField,
    internalAuthorsField,
    internalStatusField,

    {
      label: {
        en: 'Release Date',
        de: 'Veröffentlichungsdatum',
        fr: 'Date de publication',
      },
      type: 'group',
      fields: [
        {
          name: 'date',
          type: 'date',
          label: {
            en: 'Date',
            de: 'Datum',
            fr: 'Date',
          },
          admin: {
            date: {
              pickerAppearance: 'dayAndTime',
              displayFormat: 'YYYY-MM-dd HH:mm',
              timeIntervals: 15,
            },
          },
          required: true,
        },
        {
          name: 'dateFormat',
          type: 'select',
          label: {
            en: 'Date Format',
            de: 'Datumsformat',
            fr: 'Format de la date',
          },
          defaultValue: 'fullDateAndTime',
          options: [
            {
              label: {
                en: 'Full Date including Time',
                de: 'Vollständiges Datum inkl. Zeit',
                fr: "Date complète y compris l'heure",
              },
              value: 'fullDateAndTime',
            },
            {
              label: {
                en: 'Full Date (Without Time)',
                de: 'Vollständiges Datum (ohne Zeit)',
                fr: 'Date complète (sans heure)',
              },
              value: 'fullDate',
            },
            {
              label: {
                en: 'Year and Month',
                de: 'Jahr und Monat',
                fr: 'Année et mois',
              },
              value: 'yearAndMonth',
            },
          ],
        },
      ],
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
      blocks: [richTextArticleBlock, singlePictureBlock, instagramEmbedBlock],
    },
    {
      name: 'categories',
      relationTo: 'timelineCategory',
      label: {
        de: 'News Kategorien',
        en: 'News Category',
        fr: 'Catégorie de Nouvelles',
      },
      admin: {
        appearance: 'select',
      },
      type: 'relationship',
      hasMany: true,
    },
  ],
});
