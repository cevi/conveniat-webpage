import type { CollectionConfig, Field } from 'payload'

export const userFields: Field[] = [
  {
    name: 'groups',
    label: 'Groups of the User',
    type: 'json',
    required: true,
    admin: {
      readOnly: true,
      description: 'The groups the user is in.',
    },
    jsonSchema: {
      schema: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: {
              id: 'The ID of the group',
              description: 'The ID of the group as used in the CeviDB.',
              type: 'number',
              required: true,
            },
            name: {
              id: 'The name of the group',
              description: 'The name of the group as used in the CeviDB.',
              type: 'string',
              required: true,
            },
          },
        },
        title: 'Groups of the User',
        description: 'The groups the user is in as extracted from the CeviDB profile.',
      },
      // the following are random but unique identifiers for the schema
      uri: 'https://conveniat.ch/hitobito-groups.schema.json',
      fileMatch: ['https://conveniat.ch/hitobito-groups.schema.json'],
    },
  },
  {
    name: 'cevi_db_uuid',
    label: 'UserID inside CeviDB',
    type: 'number',
    required: true,
    admin: {
      readOnly: true,
      description: 'The ID of the user in the CeviDB.',
    },
    unique: true,
  },
  {
    name: 'email',
    label: 'Email',
    type: 'email',
    required: true,
    admin: {
      readOnly: true,
    },
    unique: true,
  },
  {
    name: 'fullName',
    label: 'Full Name',
    type: 'text',
    required: true,
    admin: {
      readOnly: true,
      description: 'The full name of the user, as it will be displayed publicly.',
    },
  },
]

export const Users: CollectionConfig = {
  slug: 'users',
  admin: {
    hidden: true,
    description: 'A list of all users that have signed in to the website.',
  },
  fields: userFields,
}
