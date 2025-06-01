import { filterOptionsOnlyPublished } from '@/features/payload-cms/payload-cms/utils/filter-options-only-published';
import type { Block } from 'payload';

export const formBlock: Block = {
  slug: 'formBlock',
  interfaceName: 'FormBlock',

  imageURL: '/admin-block-images/form-block.png',
  imageAltText: 'Form block',

  fields: [
    {
      name: 'form',
      type: 'relationship',
      relationTo: 'forms',
      required: true,
      hasMany: false,
      filterOptions: filterOptionsOnlyPublished,
      validate: () => true,
    },
  ],
};
