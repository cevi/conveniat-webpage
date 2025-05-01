import { AdminPanelDashboardGroups } from '@/features/payload-cms/payload-cms/admin-panel-dashboard-groups';
import { internalPageNameField } from '@/features/payload-cms/payload-cms/shared-fields/internal-page-name-field';
import { mainContentField } from '@/features/payload-cms/payload-cms/shared-fields/main-content-field';
import { pageTitleField } from '@/features/payload-cms/payload-cms/shared-fields/page-title-field';
import { permissionsField } from '@/features/payload-cms/payload-cms/shared-fields/permissions-field';
import { seoTab } from '@/features/payload-cms/payload-cms/shared-tabs/seo-tab';
import { asLocalizedCollection } from '@/features/payload-cms/payload-cms/utils/localized-collection';
import type { CollectionConfig } from 'payload';

export const GenericPage: CollectionConfig = asLocalizedCollection({
  slug: 'generic-page',
  labels: {
    singular: 'Page',
    plural: 'Pages',
  },
  defaultSort: 'internalPageName',
  admin: {
    group: AdminPanelDashboardGroups.Pages,
    useAsTitle: 'internalPageName',
    defaultColumns: ['internalPageName', 'id', 'publishingStatus'],
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
          fields: [pageTitleField, permissionsField, mainContentField],
        },
        seoTab({ collectionSlugDE: '', collectionSlugEN: '', collectionSlugFR: '' }),
      ],
    },
  ],
});
