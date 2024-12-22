import { CollectionConfig } from 'payload';
import { asLocalizedCollection } from '@/payload-cms/utils/localized-collection';
import { AdminPanelDashboardGroups } from '@/payload-cms/admin-panel-dashboard-groups';
import { slugValidation } from '@/payload-cms/collections/blog-article/validation';

export const GenericPage: CollectionConfig = asLocalizedCollection({
  slug: 'generic-page',
  labels: {
    singular: 'Page',
    plural: 'Pages',
  },
  admin: {
    group: AdminPanelDashboardGroups.Pages,
  },
  fields: [
    {
      type: 'collapsible',
      label: 'SEO Settings',
      fields: [
        {
          name: 'urlSlug',
          label: 'URL Slug',
          type: 'text',
          required: true,
          localized: true,
          unique: true,
          validate: slugValidation,
          admin: {
            position: 'sidebar',
            description: {
              en: 'This is the URL that will be used to access the article. It should be unique and URL-friendly.',
              de: 'Dies ist die URL, die zum Zugriff auf den Artikel verwendet wird. Es sollte eindeutig und URL-freundlich sein.',
              fr: "C'est l'URL qui sera utilisée pour accéder à l'article. Il doit être unique et convivial pour les URL.",
            },
          },
        },
      ],
      admin: {
        position: 'sidebar',
        description: {
          en: 'These settings are used to improve the visibility of the article in search engines.',
          de: 'Diese Einstellungen dienen dazu, die Sichtbarkeit des Artikels in Suchmaschinen zu verbessern.',
          fr: "Ces paramètres sont utilisés pour améliorer la visibilité de l'article dans les moteurs de recherche.",
        },
      },
    },
  ],
});
