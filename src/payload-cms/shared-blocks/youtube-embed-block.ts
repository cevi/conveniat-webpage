import { Block } from 'payload';
import { youtubeLinkValidaiton } from '../collections/youtube-validation';

export const YoutubeEmbedBlock: Block = {
  slug: 'youtubeEmbed',
  interfaceName: 'YoutubeEmbedding',
  fields: [
    {
      name: 'link',
      type: 'text',
      required: true,
      validate: youtubeLinkValidaiton,
    },
  ],
};
