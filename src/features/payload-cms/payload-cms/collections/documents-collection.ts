import { AdminPanelDashboardGroups } from '@/features/payload-cms/payload-cms/admin-panel-dashboard-groups';
import type { CollectionConfig } from 'payload';

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
