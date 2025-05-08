import type { CustomSlugComponentProperties } from '@/features/payload-cms/payload-cms/components/slug/types';
import { slugValidation } from '@/features/payload-cms/payload-cms/utils/slug-validation';
import type { TextField } from 'payload';

export const SlugField = (collectionName: CustomSlugComponentProperties): TextField => ({
  name: 'urlSlug',
  type: 'text',
  label: 'URL Slug',
  localized: true,
  required: true,
  unique: true,
  hasMany: false, // turn singleValidation on
  maxRows: undefined, // for typing
  minRows: undefined, // for typing
  validate: slugValidation,
  admin: {
    components: {
      Field: {
        path: '@/features/payload-cms/payload-cms/components/slug/slug-component#SlugComponent',
        clientProps: {
          collectionName,
        },
      },
    },
  },
});
