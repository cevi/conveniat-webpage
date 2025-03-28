import { Block } from 'payload';

export const formBlock: Block = {
  slug: 'formBlock',
  interfaceName: 'FormBlock',

  imageURL: '/admin-block-images/form-block.png',
  imageAltText: 'Form block',

  fields: [
    {
      name: 'form',
      type: 'relationship',
      relationTo: 'forms',
      required: true,
    },
  ],
};
