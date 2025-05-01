import { AdminPanelDashboardGroups } from '@/features/payload-cms/payload-cms/admin-panel-dashboard-groups';
import {
  bannerImage,
  blogArticleTitleField,
  blogReleaseDate,
  blogSearchKeywords,
  blogTeaserText,
} from '@/features/payload-cms/payload-cms/collections/blog-article/fields';
import { internalPageNameField } from '@/features/payload-cms/payload-cms/shared-fields/internal-page-name-field';
import { mainContentField } from '@/features/payload-cms/payload-cms/shared-fields/main-content-field';
import { permissionsField } from '@/features/payload-cms/payload-cms/shared-fields/permissions-field';
import { seoTab } from '@/features/payload-cms/payload-cms/shared-tabs/seo-tab';
import { asLocalizedCollection } from '@/features/payload-cms/payload-cms/utils/localized-collection';
import type { CollectionConfig } from 'payload';

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
    useAsTitle: 'internalPageName',
    defaultColumns: ['internalPageName', 'id', 'blogShortTitle', 'releaseDate'],
  },
  defaultSort: 'releaseDate',
  labels: {
    singular: 'Blog Article',
    plural: 'Blog Articles',
  },

  fields: [
    internalPageNameField,
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
          fields: [
            blogArticleTitleField,
            bannerImage,
            blogReleaseDate,
            permissionsField,
            blogTeaserText,
            mainContentField,
            blogSearchKeywords,
          ],
        },
        seoTab({ collectionSlugDE: 'blog', collectionSlugEN: 'blog', collectionSlugFR: 'blog' }),
      ],
    },
  ],
});
