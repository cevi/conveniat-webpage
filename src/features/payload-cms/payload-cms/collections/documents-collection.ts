import { canAccessDocuments } from '@/features/payload-cms/payload-cms/access-rules/can-access-id-in-collection';
import { AdminPanelDashboardGroups } from '@/features/payload-cms/payload-cms/admin-panel-dashboard-groups';
import { LastEditedByUserField } from '@/features/payload-cms/payload-cms/shared-fields/last-edited-by-user-field';
import { permissionsField } from '@/features/payload-cms/payload-cms/shared-fields/permissions-field';
import type { CollectionConfig } from 'payload';

export const DocumentsCollection: CollectionConfig = {
  slug: 'documents',
  labels: {
    singular: {
      en: 'Document',
      de: 'Dokument',
      fr: 'Document',
    },
    plural: {
      en: 'Documents',
      de: 'Dokumente',
      fr: 'Documents',
    },
  },
  admin: {
    group: AdminPanelDashboardGroups.InternalCollections,
    groupBy: true,
    /** this is broken with our localized versions */
    disableCopyToLocale: true,
  },
  access: {
    read: canAccessDocuments,
  },
  fields: [permissionsField, LastEditedByUserField],
  upload: true,
};
