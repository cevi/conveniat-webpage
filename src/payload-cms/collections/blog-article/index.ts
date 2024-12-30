import { CollectionConfig } from 'payload';
import { asLocalizedCollection } from '@/payload-cms/utils/localized-collection';
import {
  bannerImage,
  blogArticleTitleField,
  blogTeaserText,
} from '@/payload-cms/collections/blog-article/fields';
import { AdminPanelDashboardGroups } from '@/payload-cms/admin-panel-dashboard-groups';
import { MetaTitle } from '@/payload-cms/shared-fields/meta-title';
import { MetaDescription } from '@/payload-cms/shared-fields/meta-description';
import { MetaKeywords } from '@/payload-cms/shared-fields/meta-keywords';
import { slugValidation } from '@/payload-cms/collections/blog-article/validation';
import { MainContentField } from '@/payload-cms/shared-fields/main-content-field';

export const BlogArticleCollection: CollectionConfig = asLocalizedCollection({
  // Unique, URL-friendly string that will act as an identifier for this Collection.
  slug: 'blog',

  admin: {
    group: AdminPanelDashboardGroups.Pages,
    description: {
      en: 'Represents a block article that can be published on the website.',
      de: 'Stellt einen Blog-Artikel dar, der auf der Website veröffentlicht werden kann.',
      fr: 'Représente un article de blog qui peut être publié sur le site Web.',
    },
    defaultColumns: ['id', 'blogShortTitle', 'releaseDate'],
  },

  labels: {
    singular: 'Blog Article',
    plural: 'Blog Articles',
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
          fields: [blogArticleTitleField, bannerImage, blogTeaserText, MainContentField],
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
