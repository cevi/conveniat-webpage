import { AdminPanelDashboardGroups } from '@/features/payload-cms/payload-cms/admin-panel-dashboard-groups';
import {
  bannerImage,
  blogArticleTitleField,
  blogTeaserText,
} from '@/features/payload-cms/payload-cms/collections/blog-article/fields';
import { internalAuthorsField } from '@/features/payload-cms/payload-cms/shared-fields/internal-authors-field';
import { internalPageNameField } from '@/features/payload-cms/payload-cms/shared-fields/internal-page-name-field';
import { internalStatusField } from '@/features/payload-cms/payload-cms/shared-fields/internal-status-field';
import { LastEditedByUserField } from '@/features/payload-cms/payload-cms/shared-fields/last-edited-by-user-field';
import { mainContentField } from '@/features/payload-cms/payload-cms/shared-fields/main-content-field';
import { permissionsField } from '@/features/payload-cms/payload-cms/shared-fields/permissions-field';
import { releaseDate } from '@/features/payload-cms/payload-cms/shared-fields/release-date-field';
import { seoTab } from '@/features/payload-cms/payload-cms/shared-tabs/seo-tab';
import { flushPageCacheOnChange } from '@/features/payload-cms/payload-cms/utils/flush-page-cache-on-change';
import { asLocalizedCollection } from '@/features/payload-cms/payload-cms/utils/localized-collection';
import type { CollectionConfig } from 'payload';

export const BlogArticleCollection: CollectionConfig = asLocalizedCollection({
  // Unique, URL-friendly string that will act as an identifier for this Collection.
  slug: 'blog',
  trash: true,
  ...flushPageCacheOnChange,

  labels: {
    singular: {
      en: 'Blog Article',
      de: 'Blog Artikel',
      fr: 'Article de Blog',
    },
    plural: {
      en: 'Blog Articles',
      de: 'Blog Artikel',
      fr: 'Articles de Blog',
    },
  },

  admin: {
    group: AdminPanelDashboardGroups.PagesAndContent,
    groupBy: true,
    /** this is broken with our localized versions */
    disableCopyToLocale: true,
    description: {
      en: 'Represents a block article that can be published on the website.',
      de: 'Stellt einen Blog-Artikel dar, der auf der Website veröffentlicht werden kann.',
      fr: 'Représente un article de blog qui peut être publié sur le site Web.',
    },
    useAsTitle: 'internalPageName',
    defaultColumns: [
      'internalPageName',
      'internalStatus',
      'authors',
      'releaseDate',
      'publishingStatus',
      'updatedAt',
      'seo-urlSlug',
    ],
    listSearchableFields: ['internalPageName', 'seo.metaTitle', 'seo.urlSlug'],
    pagination: {
      defaultLimit: 10,
      limits: [10, 20, 50],
    },
  },
  defaultSort: 'releaseDate',

  fields: [
    internalPageNameField,
    internalAuthorsField,
    internalStatusField,
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
            releaseDate,
            permissionsField,
            blogTeaserText,
            mainContentField,
          ],
        },
        seoTab({ collectionSlugDE: 'blog', collectionSlugEN: 'blog', collectionSlugFR: 'blog' }),
      ],
    },
    LastEditedByUserField,
  ],
});
