import { RichTextParagraphsField } from '@/features/payload-cms/payload-cms/shared-fields/rich-text-paragraph-field';
import type { Block } from 'payload';

export const summaryBoxBlock: Block = {
  slug: 'summaryBox',
  interfaceName: 'summaryBox',

  imageURL: '/admin-block-images/summary-block-block.png',
  imageAltText: 'Summary Bock Post',
  fields: [RichTextParagraphsField],
};
