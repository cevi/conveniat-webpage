import { CollectionConfig } from 'payload'
import { JSONSchema4 } from '@typescript-eslint/utils/json-schema'

/**
 * defines the type for the JSON schema of a field of type `json` in Payload
 */
type PayloadJSONSchema = {
  fileMatch: string[]
  schema: JSONSchema4
  uri: string
}

const localizedStatusSchema: PayloadJSONSchema = {
  schema: {
    type: 'object',
    properties: {
      published: {
        type: 'boolean',
        title: 'Is Published in corresponding locale',
        description:
          'This field indicates whether the document is published in the corresponding locale',
      },
    },
    title: 'Localized Publishing Status',
    description: 'Holds the publishing status of the document in each locale',
    required: ['published'],
  },
  // the following are random but unique identifiers for the schema
  uri: 'https://conveniat.ch/localized_status.schema.json',
  fileMatch: ['https://conveniat.ch/localized_status.schema.json'],
}

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
        edit: {
          ...config.admin?.components?.edit,
          // modify the Publish button to publish only the current locale
          PublishButton: '@/utils/localizedCollection/components/publishLocalized',
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
            Field: '@/utils/localizedCollection/components/publishingStatus',
          },
        },
      },

      {
        name: 'Autotranslate',
        type: 'ui',
        admin: {
          components: {
            // adds the publishing status to the top of the edit page
            Field: '@/utils/localizedCollection/components/autoTranslate',
          },
        },
      },

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

      // add the existing fields from the original collection
      ...config.fields,
    ],

    // versioning must be enabled for localized collections
    versions: {
      maxPerDoc: 100,
      drafts: true,
    },
  }
}
