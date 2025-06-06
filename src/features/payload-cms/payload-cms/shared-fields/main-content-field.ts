import { accordion } from '@/features/payload-cms/payload-cms/shared-blocks/accordion';
import { callToActionBlock } from '@/features/payload-cms/payload-cms/shared-blocks/call-to-action-block';
import { countdownBlock } from '@/features/payload-cms/payload-cms/shared-blocks/countdown-block';
import { detailsTable } from '@/features/payload-cms/payload-cms/shared-blocks/details-table';
import { fileDownloadBlock } from '@/features/payload-cms/payload-cms/shared-blocks/file-download-block';
import { formBlock } from '@/features/payload-cms/payload-cms/shared-blocks/form-block';
import { heroSection } from '@/features/payload-cms/payload-cms/shared-blocks/hero-section-block';
import { instagramEmbedBlock } from '@/features/payload-cms/payload-cms/shared-blocks/instagram-embed-block';
import { photoCarouselBlock } from '@/features/payload-cms/payload-cms/shared-blocks/photo-carousel-block';
import { richTextArticleBlock } from '@/features/payload-cms/payload-cms/shared-blocks/rich-text-article-block';
import { singlePictureBlock } from '@/features/payload-cms/payload-cms/shared-blocks/single-picture-block';
import { summaryBoxBlock } from '@/features/payload-cms/payload-cms/shared-blocks/summary-box-block';
import { swisstopoMapEmbedBlock } from '@/features/payload-cms/payload-cms/shared-blocks/swisstopo-embed-block';
import { timelineEntries } from '@/features/payload-cms/payload-cms/shared-blocks/timeline-entries';
import { youtubeEmbedBlock } from '@/features/payload-cms/payload-cms/shared-blocks/youtube-embed-block';
import type { Field } from 'payload';

export const mainContentField: Field = {
  name: 'mainContent',
  type: 'blocks',
  required: true,
  localized: true,
  admin: {
    initCollapsed: true,
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
      imageURL: '/admin-block-images/block-post-overview.png',
      imageAltText: 'Blog Posts Overview Block',
      fields: [],
    },
    heroSection,
    formBlock,
    photoCarouselBlock,
    singlePictureBlock,
    youtubeEmbedBlock,
    instagramEmbedBlock,
    swisstopoMapEmbedBlock,
    fileDownloadBlock,
    detailsTable,
    accordion,
    summaryBoxBlock,
    timelineEntries,
    countdownBlock,
    {
      slug: 'whiteSpace',
      imageURL: '/admin-block-images/white-space-block.png',
      imageAltText: 'White Space Block',
      fields: [],
    },
    callToActionBlock,
  ],
};
