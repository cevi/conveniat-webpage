import { LinkField } from '@/features/payload-cms/payload-cms/shared-fields/link-field';
import type { Block } from 'payload';

export const callToActionBlock: Block = {
  slug: 'callToAction',
  imageURL: '/admin-block-images/call-to-action-block.png',
  imageAltText: 'Call To Action block',
  fields: [
    {
      name: 'label',
      type: 'text',
      admin: {
        description: {
          en: 'Label for the button',
          de: 'Label für den Button.',
          fr: 'Étiquette pour le bouton',
        },
      },
    },
    LinkField,
  ],
};
