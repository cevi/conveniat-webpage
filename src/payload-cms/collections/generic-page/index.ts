import { CollectionConfig } from 'payload';
import { asLocalizedCollection } from '@/payload-cms/utils/localized-collection';
import { AdminPanelDashboardGroups } from '@/payload-cms/admin-panel-dashboard-groups';
import { MainContentField } from '@/payload-cms/shared-fields/main-content-field';
import { MetaTitle } from '@/payload-cms/shared-fields/meta-title';
import { MetaDescription } from '@/payload-cms/shared-fields/meta-description';
import { MetaKeywords } from '@/payload-cms/shared-fields/meta-keywords';
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
      type: 'tabs',
      tabs: [
        {
          name: 'content',
          label: {
            en: 'Content',
            de: 'Seiteninhalt',
            fr: 'Contenu',
          },
          fields: [MainContentField],
        },
        {
          name: 'seo',
          label: {
            en: 'SEO',
            de: 'SEO',
            fr: 'SEO',
          },
          fields: [
            {
              name: 'urlSlug',
              label: 'URL Slug',
              type: 'text',
              localized: true,
              required: true,
              validate: slugValidation,
            },

            MetaTitle,
            MetaDescription,
            MetaKeywords,
          ],
        },
      ],
    },
  ],
});
