import { Block } from 'payload';

export const paragraph: Block = {
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
