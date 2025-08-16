import { LinkField } from '@/features/payload-cms/payload-cms/shared-fields/link-field';
import type { Block } from 'payload';

export const newsCardBlock: Block = {
  slug: 'newsCard',

  imageURL: '/admin-block-images/news-card-block.png',
  imageAltText: 'News Card block',

  fields: [
    LinkField(false),
    {
      type: 'text',
      name: 'headline',
      required: true,
    },
    {
      type: 'date',
      name: 'date',
      required: true,
    },
    {
      type: 'relationship',
      name: 'image',
      relationTo: 'images',
      required: false,
    },
    {
      type: 'richText',
      name: 'paragraph',
    },
  ],
};
