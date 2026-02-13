import { LinkField } from '@/features/payload-cms/payload-cms/shared-fields/link-field';
import { patchRichTextLinkHook } from '@/features/payload-cms/payload-cms/utils/link-field-logic';
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
      timezone: true,
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
      hooks: patchRichTextLinkHook,
    },
  ],
};
