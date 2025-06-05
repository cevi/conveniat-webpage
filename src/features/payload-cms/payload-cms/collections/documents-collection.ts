import { canAccessDocuments } from '@/features/payload-cms/payload-cms/access-rules/can-access-id-in-collection';
import { AdminPanelDashboardGroups } from '@/features/payload-cms/payload-cms/admin-panel-dashboard-groups';
import { permissionsField } from '@/features/payload-cms/payload-cms/shared-fields/permissions-field';
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
    read: canAccessDocuments,
  },
  fields: [permissionsField],
  upload: true,
};
