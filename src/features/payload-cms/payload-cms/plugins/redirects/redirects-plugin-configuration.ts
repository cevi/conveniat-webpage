import { redirectsPlugin } from '@payloadcms/plugin-redirects';
import type { TextField } from 'payload';
import { SlugField } from '../../shared-fields/slug-field';

export const redirectsPluginConfiguration = redirectsPlugin({
  overrides: {
    fields: ({ defaultFields }) => {
      return [
        // replace FROM field
        SlugField({
          collectionSlugDE: '',
          collectionSlugEN: '',
          collectionSlugFR: '',
        }),
        // skip "from" field
        ...defaultFields.filter((field) => (field as TextField).name !== 'from'),
      ];
    },
  },
  collections: ['blog', 'generic-page'],
});
