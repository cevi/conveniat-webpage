import type { FieldsOverride } from 'node_modules/@payloadcms/plugin-search/dist/types';
import type { CollectionConfig } from 'payload';

export const searchOverrides: { fields?: FieldsOverride } & Partial<
  Omit<CollectionConfig, 'fields'>
> = {
  slug: 'search-collection',
  admin: {
    useAsTitle: 'search_title',
  },
  fields: ({ defaultFields }) => [
    ...defaultFields,
    {
      name: 'search_content',
      type: 'text',
    },
    {
      name: 'search_title',
      type: 'text',
    },
  ],
};
