import type { CollectionConfig } from 'payload';
import { asLocalizedCollection } from '@/features/payload-cms/settings/utils/localized-collection';
import {
  bannerImage,
  blogArticleTitleField,
  blogReleaseDate,
  blogSearchKeywords,
  blogTeaserText,
} from '@/features/payload-cms/settings/collections/blog-article/fields';
import { AdminPanelDashboardGroups } from '@/features/payload-cms/settings/admin-panel-dashboard-groups';
import { mainContentField } from '@/features/payload-cms/settings/shared-fields/main-content-field';
import { permissionsField } from '@/features/payload-cms/settings/shared-fields/permissions-field';
import { internalPageNameField } from '@/features/payload-cms/settings/shared-fields/internal-page-name-field';
import { seoTab } from '@/features/payload-cms/settings/shared-tabs/seo-tab';

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
        seoTab,
      ],
    },
  ],
});
