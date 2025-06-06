import { getPublishingStatus } from '@/features/payload-cms/payload-cms/hooks/publishing-status';
import { localizedStatusSchema } from '@/features/payload-cms/payload-cms/utils/localized-status-schema';
import type { CollectionConfig } from 'payload';

/**
 * This is a utility function that adds the necessary fields to a collection to make it localized.
 *
 * It adds a field called `_localized_status` to the collection, which is a JSON field that contains
 * the publishing status of the document in each locale. It also modifies the `admin` configuration
 * of the collection to use custom components for the Publish button and the publishing status field.
 *
 * @param config The collection configuration to localize
 */
export const asLocalizedCollection = (config: CollectionConfig): CollectionConfig => {
  return {
    ...config, // we keep most of the original collection configuration
    defaultPopulate: {
      ...config.defaultPopulate,
      versions: false,
    },
    admin: {
      defaultColumns: ['id', 'publishingStatus', 'title'],
      ...config.admin,
      components: {
        ...config.admin?.components,
        beforeList: [
          // disable publishing and unpublishing action for list view
          // and remove the Edit Many action
          '@/features/payload-cms/payload-cms/components/disable-actions/disable-many-actions',
        ],
        edit: {
          ...config.admin?.components?.edit,
          beforeDocumentControls: [
            {
              path: '@/features/payload-cms/payload-cms/components/multi-lang-publishing/publishing-status-client',
            },
            {
              path: '@/features/payload-cms/payload-cms/components/qr-code/qr-code',
            },
          ],
          // modify the Publish button to publish only the current locale
          PublishButton:
            '@/features/payload-cms/payload-cms/components/multi-lang-publishing/publish-localized',
        },
      },
    },
    fields: [
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
          create: () => false,
          update: () => false,
        },
        virtual: true,
        hooks: {
          afterRead: [getPublishingStatus(config)],
        },
      },

      /*

      TODO: re-enable auto-translate

      {
        name: 'Autotranslate',
        type: 'ui',
        admin: {
          components: {
            // adds the publishing status to the top of the edit page
            Field: '@/payload-cms/components/auto-translate/auto-translate',
          },
        },
      },
      */

      // add the localized publishing status field
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

      // add the existing fields from the original collection
      ...config.fields,
    ],

    // versioning must be enabled for localized collections
    versions: {
      maxPerDoc: 100,
      drafts: {
        autosave: {
          interval: 300,
        },
      },
    },
  };
};
