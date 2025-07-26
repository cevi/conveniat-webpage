import { AdminPanelDashboardGroups } from '@/features/payload-cms/payload-cms/admin-panel-dashboard-groups';
import { SlugField } from '@/features/payload-cms/payload-cms/shared-fields/slug-field';
import { redirectsPlugin } from '@payloadcms/plugin-redirects';
import type { TextField } from 'payload';

export const redirectsPluginConfiguration = redirectsPlugin({
  overrides: {
    slug: 'go',
    admin: {
      useAsTitle: 'urlSlug',
      defaultColumns: ['urlSlug'],
      group: AdminPanelDashboardGroups.InternalCollections,
      components: {
        edit: {
          beforeDocumentControls: [
            {
              path: '@/features/payload-cms/payload-cms/components/qr-code/qr-code',
            },
          ],
        },
      },
    },
    labels: {
      singular: 'Redirect',
      plural: 'Redirects',
    },
    fields: ({ defaultFields }) => {
      return [
        // replace FROM field
        SlugField({
          collectionSlugDE: 'go',
          collectionSlugEN: 'go',
          collectionSlugFR: 'go',
        }),
        // skip "from" field
        ...defaultFields.filter((field) => (field as TextField).name !== 'from'),
      ];
    },
  },
  collections: ['blog', 'generic-page'],
});
