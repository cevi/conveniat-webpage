import { youtubeLinkValidation } from '@/features/payload-cms/payload-cms/utils/youtube-validation';
import type { Block } from 'payload';

export const youtubeEmbedBlock: Block = {
  slug: 'youtubeEmbed',
  interfaceName: 'YoutubeEmbedding',

  imageURL: '/admin-block-images/youtube-embed-block.png',
  imageAltText: 'Youtube Embed block',

  fields: [
    {
      name: 'links',
      type: 'array',
      label: 'Links',
      required: true,
      admin: {
        description: {
          en: 'Links to the Youtube videos',
          de: 'Links zu den Youtube Videos',
          fr: 'Liens vers les vidéos Youtube',
        },
      },
      fields: [
        {
          name: 'link',
          type: 'text',
          required: true,
          validate: youtubeLinkValidation,
          admin: {
            description: {
              en: 'Link to the Youtube video',
              de: 'Link zum Youtube Video',
              fr: 'Lien vers la vidéo Youtube',
            },
          },
        },
      ],
    },
  ],
};
