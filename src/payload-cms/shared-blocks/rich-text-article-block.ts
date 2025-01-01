import { RichTextParagraphsField } from '@/payload-cms/shared-fields/rich-text-paragraphs-field';
import { Block } from 'payload';

export const RichTextArticleBlock: Block = {
  slug: 'richTextSection',
  fields: [RichTextParagraphsField],
};
