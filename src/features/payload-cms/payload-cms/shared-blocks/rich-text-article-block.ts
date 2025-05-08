import { RichTextParagraphsField } from '@/features/payload-cms/payload-cms/shared-fields/rich-text-paragraphs-field';
import type { Block } from 'payload';

export const richTextArticleBlock: Block = {
  slug: 'richTextSection',

  imageURL: '/admin-block-images/rich-text-article-block.png',
  imageAltText: 'Rich text article block',

  fields: [RichTextParagraphsField],
};
