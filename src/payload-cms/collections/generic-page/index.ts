import { CollectionConfig } from 'payload';
import { asLocalizedCollection } from '@/payload-cms/utils/localized-collection';
import { AdminPanelDashboardGroups } from '@/payload-cms/admin-panel-dashboard-groups';
import { mainContentField } from '@/payload-cms/shared-fields/main-content-field';
import { permissionsField } from '@/payload-cms/shared-fields/permissions-field';
import { internalPageNameField } from '@/payload-cms/shared-fields/internal-page-name-field';
import { seoTab } from '@/payload-cms/shared-tabs/seo-tab';
import { pageTitleField } from '@/payload-cms/shared-fields/page-title-field';

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
