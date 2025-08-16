import { getPublishingStatusGlobal } from '@/features/payload-cms/payload-cms/hooks/publishing-status';
import { localizedStatusSchema } from '@/features/payload-cms/payload-cms/utils/localized-status-schema';
import type { GlobalConfig } from 'payload';

/**
 * This is a utility function that adds the necessary fields to a global to make it localized.
 *
 * It adds a field called `_localized_status` to the global, which is a JSON field that contains
 * the publishing status of the document in each locale. It also modifies the `admin` configuration
 * of the global to use custom components for the Publish button and the publishing status field.
 *
 * @param config The global configuration to localize
 */
export const asLocalizedGlobal = (config: GlobalConfig): GlobalConfig => {
  return {
    ...config, // we keep most of the original collection configuration
    admin: {
      ...config.admin,
      components: {
        ...config.admin?.components,
        elements: {
          ...config.admin?.components?.elements,
          // modify the Publish button to publish only the current locale
          PublishButton:
            '@/features/payload-cms/payload-cms/components/multi-lang-publishing/publish-localized',
          beforeDocumentControls: [
            {
              path: '@/features/payload-cms/payload-cms/components/multi-lang-publishing/publishing-status-client',
            },
          ],
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
          afterRead: [getPublishingStatusGlobal(config)],
        },
      },

      // add the localized publishing status field
      {
        name: '_localized_status',
        type: 'json', // required
        required: true,
        localized: true,
        defaultValue: {
          published: true, // globals cannot be unpublished
        },
        // we use a custom JSON schema for the field
        // in order to generate the correct types
        jsonSchema: localizedStatusSchema,
        admin: {
          disabled: true,
        },
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
      {
        name: '_disable_unpublishing',
        type: 'checkbox',
        admin: {
          disabled: true,
        },
        localized: false,
        defaultValue: false,
      },

      // add the existing fields from the original collection
      ...config.fields,
    ],

    // versioning must be enabled for localized collections
    versions: {
      max: 100,
      drafts: true,
    },
  };
};
