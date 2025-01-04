import { JSONSchema4 } from '@typescript-eslint/utils/json-schema';

/**
 * defines the type for the JSON schema of a field of type `json` in Payload
 */
type PayloadJSONSchema = {
  fileMatch: string[];
  schema: JSONSchema4;
  uri: string;
};
export const localizedStatusSchema: PayloadJSONSchema = {
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
  uri: 'https://conveniat27.ch/localized_status.schema.json',
  fileMatch: ['https://conveniat27.ch/localized_status.schema.json'],
};
