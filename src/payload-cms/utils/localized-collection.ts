import { CollectionConfig } from 'payload';
import { localizedStatusSchema } from '@/payload-cms/utils/localized-status-schema';

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
    admin: {
      ...config.admin,
      components: {
        ...config.admin?.components,
        beforeList: [
          // disable publishing and unpublishing action for list view
          // and remove the Edit Many action
          '@/payload-cms/components/disable-many-actions/index',
        ],
        edit: {
          ...config.admin?.components?.edit,
          // modify the Publish button to publish only the current locale
          PublishButton: '@/payload-cms/components/multi-lang-publishing/publish-localized',
        },
      },
    },
    fields: [
      {
        name: 'Versions',
        type: 'ui',
        admin: {
          components: {
            // adds the publishing status to the top of the edit page
            Field: '@/payload-cms/components/multi-lang-publishing/publishing-status',
          },
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
        name: '_locale',
        type: 'text',
        required: true,
        localized: true,
        admin: {
          disabled: true,
        },
      },

      {
        name: '_qr_code',
        type: 'ui',
        admin: {
          components: {
            Field: '@/payload-cms/components/qr-code/qr-code',
          },
        },
      },

      // add the existing fields from the original collection
      ...config.fields,
    ],

    // versioning must be enabled for localized collections
    versions: {
      maxPerDoc: 100,
      drafts: true,
    },
  };
};
