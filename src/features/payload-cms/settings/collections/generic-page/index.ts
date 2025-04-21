import type { CollectionConfig } from 'payload';
import { asLocalizedCollection } from '@/features/payload-cms/settings/utils/localized-collection';
import { AdminPanelDashboardGroups } from '@/features/payload-cms/settings/admin-panel-dashboard-groups';
import { mainContentField } from '@/features/payload-cms/settings/shared-fields/main-content-field';
import { permissionsField } from '@/features/payload-cms/settings/shared-fields/permissions-field';
import { internalPageNameField } from '@/features/payload-cms/settings/shared-fields/internal-page-name-field';
import { seoTab } from '@/features/payload-cms/settings/shared-tabs/seo-tab';
import { pageTitleField } from '@/features/payload-cms/settings/shared-fields/page-title-field';

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
        seoTab,
      ],
    },
  ],
});
