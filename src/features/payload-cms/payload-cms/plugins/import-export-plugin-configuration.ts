import { canAccessAdminPanel } from '@/features/payload-cms/payload-cms/access-rules/can-access-admin-panel';
import { AdminPanelDashboardGroups } from '@/features/payload-cms/payload-cms/admin-panel-dashboard-groups';
import { importExportPlugin } from '@payloadcms/plugin-import-export';
import type { CollectionConfig } from 'payload';

/**
 * Configuration for the Payload CMS Import/Export plugin.
 *
 * Enables CSV and JSON import/export for the users collection,
 * allowing admins to bulk-import users (e.g. from a participant list)
 * and export user data for reporting.
 */
export const importExportConfiguration = importExportPlugin({
  collections: [
    {
      slug: 'users',
      import: {
        // Run imports synchronously since user imports are typically small batches
        disableJobsQueue: true,
      },
      export: {
        format: 'csv',
        disableJobsQueue: true,
      },
    },
  ],
  overrideExportCollection: ({
    collection,
  }: {
    collection: CollectionConfig;
  }): CollectionConfig => ({
    ...collection,
    admin: {
      ...collection.admin,
      group: AdminPanelDashboardGroups.InternalCollections,
    },
    access: {
      ...collection.access,
      read: canAccessAdminPanel,
      create: canAccessAdminPanel,
    },
  }),
  overrideImportCollection: ({
    collection,
  }: {
    collection: CollectionConfig;
  }): CollectionConfig => ({
    ...collection,
    admin: {
      ...collection.admin,
      group: AdminPanelDashboardGroups.InternalCollections,
    },
    access: {
      ...collection.access,
      read: canAccessAdminPanel,
      create: canAccessAdminPanel,
    },
  }),
});
