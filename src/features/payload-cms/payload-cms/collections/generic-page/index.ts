import { AdminPanelDashboardGroups } from '@/features/payload-cms/payload-cms/admin-panel-dashboard-groups';
import { internalAuthorsField } from '@/features/payload-cms/payload-cms/shared-fields/internal-authors-field';
import { internalPageNameField } from '@/features/payload-cms/payload-cms/shared-fields/internal-page-name-field';
import { internalStatusField } from '@/features/payload-cms/payload-cms/shared-fields/internal-status-field';
import { mainContentField } from '@/features/payload-cms/payload-cms/shared-fields/main-content-field';
import { pageTitleField } from '@/features/payload-cms/payload-cms/shared-fields/page-title-field';
import { permissionsField } from '@/features/payload-cms/payload-cms/shared-fields/permissions-field';
import { releaseDate } from '@/features/payload-cms/payload-cms/shared-fields/release-date-field';
import { seoTab } from '@/features/payload-cms/payload-cms/shared-tabs/seo-tab';
import { asLocalizedCollection } from '@/features/payload-cms/payload-cms/utils/localized-collection';
import type { CollectionConfig } from 'payload';

export const GenericPage: CollectionConfig = asLocalizedCollection({
  slug: 'generic-page',
  labels: {
    singular: {
      en: 'Page',
      de: 'Seite',
      fr: 'Page',
    },
    plural: {
      en: 'Pages',
      de: 'Seiten',
      fr: 'Pages',
    },
  },
  defaultSort: 'internalPageName',
  admin: {
    group: AdminPanelDashboardGroups.PagesAndContent,
    useAsTitle: 'internalPageName',
    defaultColumns: [
      'internalPageName',
      'internalStatus',
      'authors',
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
          fields: [pageTitleField, permissionsField, releaseDate, mainContentField],
        },
        seoTab({ collectionSlugDE: '', collectionSlugEN: '', collectionSlugFR: '' }),
      ],
    },
  ],
});
