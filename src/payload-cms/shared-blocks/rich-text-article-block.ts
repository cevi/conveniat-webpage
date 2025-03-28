import { RichTextParagraphsField } from '@/payload-cms/shared-fields/rich-text-paragraphs-field';
import { Block } from 'payload';

export const richTextArticleBlock: Block = {
  slug: 'richTextSection',

  imageURL: '/admin-block-images/rich-text-article-block.png',
  imageAltText: 'Rich text article block',

  fields: [RichTextParagraphsField],
};
