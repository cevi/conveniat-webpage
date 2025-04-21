import type { Field } from 'payload';
import { richTextArticleBlock } from '@/features/payload-cms/settings/shared-blocks/rich-text-article-block';
import { formBlock } from '@/features/payload-cms/settings/shared-blocks/form-block';
import { photoCarouselBlock } from '@/features/payload-cms/settings/shared-blocks/photo-carousel-block';
import { youtubeEmbedBlock } from '@/features/payload-cms/settings/shared-blocks/youtube-embed-block';
import { heroSection } from '@/features/payload-cms/settings/shared-blocks/hero-section-block';
import { swisstopoMapEmbedBlock } from '@/features/payload-cms/settings/shared-blocks/swisstopo-embed-block';
import { fileDownloadBlock } from '@/features/payload-cms/settings/shared-blocks/file-download-block';
import { detailsTable } from '@/features/payload-cms/settings/shared-blocks/details-table';
import { singlePictureBlock } from '@/features/payload-cms/settings/shared-blocks/single-picture-block';

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
    singlePictureBlock,
    youtubeEmbedBlock,
    swisstopoMapEmbedBlock,
    fileDownloadBlock,
    detailsTable,
  ],
};
