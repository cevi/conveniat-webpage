import type { CustomSlugComponentProperties } from '@/features/payload-cms/payload-cms/components/slug/types';
import { slugValidation } from '@/features/payload-cms/payload-cms/utils/slug-validation';
import { revalidateTag } from 'next/cache';
import type { TextField } from 'payload';

const generateRandomSlug = (): string => {
  const randomString = Math.random().toString(36).slice(2, 10);
  return `slug-${randomString}`;
};

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
  defaultValue: generateRandomSlug,

  hooks: {
    afterChange: [
      (): void => {
        try {
          revalidateTag('sitemap', 'max');
          console.log('Slug changed, revalidating sitemap');
        } catch {}
      },
    ],
  },

  admin: {
    components: {
      Field: {
        path: '@/features/payload-cms/payload-cms/components/slug/slug-component#SlugComponent',
        clientProps: {
          collectionName,
        },
      },
      Cell: {
        path: '@/features/payload-cms/payload-cms/components/slug/slug-cell#SlugCell',
      },
    },
  },
});
