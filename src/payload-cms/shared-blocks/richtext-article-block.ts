import { richTextParagraphsField } from '@/payload-cms/shared-fields/rich-text-paragraphs-field';
import { Block } from 'payload';

export const richtextArticleBlock: Block = {
  slug: 'article',
  fields: [richTextParagraphsField],
};
