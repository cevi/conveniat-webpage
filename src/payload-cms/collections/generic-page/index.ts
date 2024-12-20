import { CollectionConfig } from 'payload';
import { asLocalizedCollection } from '@/payload-cms/utils/localized-collection';
import { AdminPanelDashboardGroups } from '@/payload-cms/admin-panel-dashboard-groups';

export const GenericPage: CollectionConfig = asLocalizedCollection({
  slug: 'generic-page',
  labels: {
    singular: 'Page',
    plural: 'Pages',
  },
  admin: {
    group: AdminPanelDashboardGroups.Pages,
  },
  fields: [],
});
