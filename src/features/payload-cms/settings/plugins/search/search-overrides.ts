import type { FieldsOverride } from 'node_modules/@payloadcms/plugin-search/dist/types';
import type { CollectionConfig } from 'payload';

export const searchOverrides: { fields?: FieldsOverride } & Partial<
  Omit<CollectionConfig, 'fields'>
> = {
  slug: 'search-collection',
  admin: {
    useAsTitle: 'id',
  },
  fields: ({ defaultFields }) => [
    ...defaultFields,
    {
      name: 'content',
      type: 'group',
      index: true,
      admin: {
        readOnly: true,
      },
      fields: [
        {
          name: 'blogH1',
          type: 'text',
          localized: true,
        },
        {
          name: 'blogShortTitle',
          type: 'text',
          localized: true,
        },
        {
          name: 'blogSearchKeywords',
          type: 'text',
          localized: true,
        },
      ],
    },
    {
      name: 'seo',
      type: 'group',
      index: true,
      admin: {
        readOnly: true,
      },
      fields: [
        {
          name: 'urlSlug',
          type: 'text',
          localized: true,
        },
      ],
    },
  ],
};
