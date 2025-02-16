import { Field } from 'payload';
import { richTextArticleBlock } from '@/payload-cms/shared-blocks/rich-text-article-block';
import { formBlock } from '../shared-blocks/form-block';
import { photoCarouselBlock } from '@/payload-cms/shared-blocks/photo-carousel-block';
import { youtubeEmbedBlock } from '../shared-blocks/youtube-embed-block';
import { heroSection } from '@/payload-cms/shared-blocks/hero-section-block';
import { swisstopoMapEmbedBlock } from '@/payload-cms/shared-blocks/swisstopo-embed-block';

export const mainContentField: Field = {
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
    richTextArticleBlock,
    {
      slug: 'blogPostsOverview',
      fields: [],
    },
    heroSection,
    formBlock,
    photoCarouselBlock,
    youtubeEmbedBlock,
    swisstopoMapEmbedBlock,
  ],
};
