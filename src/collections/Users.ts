import type { CollectionConfig, Field } from 'payload'

export const userFields: Field[] = [
  {
    name: 'groups',
    label: 'Groups of the User',
    type: 'array',
    admin: {
      readOnly: true,
      description: 'The groups the user is in.',
    },
    fields: [
      {
        name: 'id',
        type: 'number',
        admin: {
          readOnly: true,
          description: 'The ID of a group.',
        },
      },
      {
        name: 'name',
        type: 'text',
        admin: {
          readOnly: true,
          description: 'The name of a group.',
        },
      },
    ],
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
