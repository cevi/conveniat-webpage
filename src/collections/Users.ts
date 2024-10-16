import type { CollectionConfig } from 'payload'

export const Users: CollectionConfig = {
  slug: 'users',
  admin: {
    useAsTitle: 'email',
  },
  auth: true,
  fields: [
    {
      name: 'fullName',
      label: 'Full Name',
      type: 'text',
      required: true,
      admin: {
        description: 'The full name of the user, as it will be displayed publicly.',
      },
    },
    {
      name: 'function',
      label: 'Function',
      type: 'text',
      required: true,
      admin: {
        description: 'The function of the user, as it will be displayed publicly.',
      },
    },
  ],
}
