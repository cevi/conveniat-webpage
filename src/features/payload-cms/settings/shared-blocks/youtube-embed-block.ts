import type { Block } from 'payload';
import { youtubeLinkValidation } from '@/features/payload-cms/settings/collections/youtube-validation';

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
