import type { CollectionConfig } from 'payload';
import { AdminPanelDashboardGroups } from '@/payload-cms/admin-panel-dashboard-groups';

export const DocumentsCollection: CollectionConfig = {
  slug: 'documents',
  labels: {
    singular: 'Dokument',
    plural: 'Dokumente',
  },
  admin: {
    group: AdminPanelDashboardGroups.InternalCollections,
  },
  access: {
    read: () => true,
  },
  fields: [],
  upload: true,
};
