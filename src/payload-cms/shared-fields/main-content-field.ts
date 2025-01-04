import { Field } from 'payload';
import { RichTextArticleBlock } from '@/payload-cms/shared-blocks/rich-text-article-block';
import { FormBlock } from '../shared-blocks/form-block';
import { PhotoCarouselBlock } from '@/payload-cms/shared-blocks/photo-carousel-block';
import { YoutubeEmbedBlock } from '../shared-blocks/youtube-embed-block';

export const MainContentField: Field = {
  name: 'mainContent',
  type: 'blocks',
  required: true,
  localized: true,
  admin: {
    description: {
      en: 'The main content of the page',
      de: 'Der Hauptinhalt der Seite',
      fr: 'Le contenu principal de la page',
    },
  },
  blocks: [
    RichTextArticleBlock,
    {
      slug: 'blogPostsOverview',
      fields: [],
    },
    FormBlock,
    PhotoCarouselBlock,
    YoutubeEmbedBlock,
  ],
};
