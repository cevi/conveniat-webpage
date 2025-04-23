import { youtubeLinkValidation } from '@/features/payload-cms/payload-cms/collections/youtube-validation';
import type { Block } from 'payload';

export const youtubeEmbedBlock: Block = {
  slug: 'youtubeEmbed',
  interfaceName: 'YoutubeEmbedding',

  imageURL: '/admin-block-images/youtube-embed-block.png',
  imageAltText: 'Youtube Embed block',

  fields: [
    {
      name: 'link',
      type: 'text',
      required: true,
      validate: youtubeLinkValidation,
    },
  ],
};
