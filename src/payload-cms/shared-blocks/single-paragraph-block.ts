import { Block } from 'payload';

export const singleParagraphBlock: Block = {
  slug: 'paragraph', // required
  interfaceName: 'Paragraph', // optional
  fields: [
    {
      name: 'value',
      label: 'Value',
      type: 'textarea',
      required: true,
    },
  ],
};
