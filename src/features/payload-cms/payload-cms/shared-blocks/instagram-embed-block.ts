import { instagramLinkValidation } from '@/features/payload-cms/payload-cms/utils/instagram-validation';
import type { Block } from 'payload';

export const instagramEmbedBlock: Block = {
  slug: 'instagramEmbed',
  interfaceName: 'InstagramEmbedding',

  imageURL: '/admin-block-images/single-picture-block.png',
  imageAltText: 'Instagram Embed block',
  fields: [
    {
      name: 'link',
      type: 'text',
      required: true,
      validate: instagramLinkValidation,
      admin: {
        description: {
          en: 'Link to the Instagram post',
          de: 'Link zum Instagram-Beitrag',
          fr: 'Lien vers le post Instagram',
        },
      },
    },
  ],
};
