import { canAccessAdminPanel } from '@/features/payload-cms/payload-cms/access-rules/can-access-admin-panel';
import { getPublishingStatus } from '@/features/payload-cms/payload-cms/hooks/publishing-status';
import { localizedStatusSchema } from '@/features/payload-cms/payload-cms/utils/localized-status-schema';
import { formBuilderPlugin } from '@payloadcms/plugin-form-builder';

export const formPluginConfiguration = formBuilderPlugin({
  fields: {
    state: false, // we do not use states in CH
  },
  formOverrides: {
    access: {
      read: canAccessAdminPanel,
    },
    defaultPopulate: {
      versions: false,
    },
    admin: {
      defaultColumns: ['id', 'publishingStatus', 'title'],
      components: {
        beforeList: [
          '@/features/payload-cms/payload-cms/components/disable-actions/disable-many-actions',
        ],
        edit: {
          beforeDocumentControls: [
            {
              path: '@/features/payload-cms/payload-cms/components/multi-lang-publishing/publishing-status-client',
            },
          ],
          PublishButton:
            '@/features/payload-cms/payload-cms/components/multi-lang-publishing/publish-localized',
        },
      },
    },
    // versioning must be enabled for localized collections
    versions: {
      maxPerDoc: 100,
      drafts: {
        autosave: {
          interval: 300,
        },
      },
    },
    fields: ({ defaultFields }) => {
      return [
        ...defaultFields,
        {
          name: 'publishingStatus',
          type: 'json',
          admin: {
            readOnly: true,
            hidden: true,
            components: {
              Cell: '@/features/payload-cms/payload-cms/components/multi-lang-publishing/publishing-status',
            },
          },
          access: {
            create: (): boolean => false,
            update: (): boolean => false,
          },
          virtual: true,
          hooks: {
            afterRead: [
              getPublishingStatus({
                slug: 'forms',
                fields: [...defaultFields],
              }),
            ],
          },
        },
        {
          name: '_localized_status',
          type: 'json', // required
          required: true,
          localized: true,
          defaultValue: {
            published: false,
          },
          // we use a custom JSON schema for the field
          // in order to generate the correct types
          jsonSchema: localizedStatusSchema,
          admin: {
            disabled: true,
          },
        },

        {
          name: '_disable_unpublishing',
          type: 'checkbox',
          admin: {
            disabled: true,
          },
          localized: false,
          defaultValue: false,
        },

        {
          name: '_locale',
          type: 'text',
          required: true,
          localized: true,
          admin: {
            disabled: true,
          },
        },
      ];
    },
  },
});
