import { Block } from 'payload';
import { youtubeLinkValidation } from '../collections/youtube-validation';

export const youtubeEmbedBlock: Block = {
  slug: 'youtubeEmbed',
  interfaceName: 'YoutubeEmbedding',
  fields: [
    {
      name: 'link',
      type: 'text',
      required: true,
      validate: youtubeLinkValidation,
    },
  ],
};
