import { Block } from 'payload';

export const YoutubeEmbedBlock: Block = {
  slug: 'youtubeEmbed',
  interfaceName: 'YoutubeEmbedding',
  fields: [
    {
      name: 'link',
      type: 'text',
      required: true,
    },
  ],
};
