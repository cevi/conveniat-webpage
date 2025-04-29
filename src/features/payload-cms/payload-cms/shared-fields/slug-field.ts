import type { TextField } from 'payload';
import { slugValidation } from '../utils/slug-validation';

export const SlugField: TextField = {
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
      beforeInput: ['@/features/payload-cms/payload-cms/components/url-field/url-input-field'],
      Field: {
        path: '@/features/payload-cms/payload-cms/components/slug/slug-component#SlugComponent',
      },
    },
  },
};
