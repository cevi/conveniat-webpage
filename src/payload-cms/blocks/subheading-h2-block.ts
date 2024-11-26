dd import { Block } from 'payload';

export const subheadingH2: Block = {
  slug: 'subheading', // required
  interfaceName: 'SubheadingH2', // optional
  fields: [
    {
      name: 'value',
      label: 'Value',
      type: 'text',
      required: true,
    },
  ],
};
