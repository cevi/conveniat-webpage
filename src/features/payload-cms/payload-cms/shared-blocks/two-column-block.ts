import { accordion } from '@/features/payload-cms/payload-cms/shared-blocks/accordion';
import { blockPostsOverview } from '@/features/payload-cms/payload-cms/shared-blocks/blog-posts-overview-block';
import { callToActionBlock } from '@/features/payload-cms/payload-cms/shared-blocks/call-to-action-block';
import { campScheduleEntryBlock } from '@/features/payload-cms/payload-cms/shared-blocks/camp-schedule-entry.block';
import { countdownBlock } from '@/features/payload-cms/payload-cms/shared-blocks/countdown-block';
import { detailsTable } from '@/features/payload-cms/payload-cms/shared-blocks/details-table';
import { fileDownloadBlock } from '@/features/payload-cms/payload-cms/shared-blocks/file-download-block';
import { formBlock } from '@/features/payload-cms/payload-cms/shared-blocks/form-block';
import { instagramEmbedBlock } from '@/features/payload-cms/payload-cms/shared-blocks/instagram-embed-block';
import { newsCardBlock } from '@/features/payload-cms/payload-cms/shared-blocks/news-card-block';
import { photoCarouselBlock } from '@/features/payload-cms/payload-cms/shared-blocks/photo-carousel-block';
import { richTextArticleBlock } from '@/features/payload-cms/payload-cms/shared-blocks/rich-text-article-block';
import { singlePictureBlock } from '@/features/payload-cms/payload-cms/shared-blocks/single-picture-block';
import { summaryBoxBlock } from '@/features/payload-cms/payload-cms/shared-blocks/summary-box-block';
import { swisstopoMapEmbedBlock } from '@/features/payload-cms/payload-cms/shared-blocks/swisstopo-embed-block';
import { timelineEntries } from '@/features/payload-cms/payload-cms/shared-blocks/timeline-entries';
import { whiteSpaceBlock } from '@/features/payload-cms/payload-cms/shared-blocks/white-space-block';
import { youtubeEmbedBlock } from '@/features/payload-cms/payload-cms/shared-blocks/youtube-embed-block';
import type { Block } from 'payload';

export const genericBlocks = [
  richTextArticleBlock,
  blockPostsOverview,
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
  whiteSpaceBlock,
  callToActionBlock,
  newsCardBlock,
  campScheduleEntryBlock,
];

export const twoColumnBlock: Block = {
  slug: 'twoColumnBlock',
  interfaceName: 'TwoColumnBlock',
  fields: [
    {
      name: 'leftColumn',
      type: 'blocks',
      required: true,
      blocks: genericBlocks,
      label: {
        de: 'Linke Spalte (kleiner)',
        en: 'Left Column (smaller)',
        fr: 'Colonne gauche (plus petit)',
      },
      admin: {
        description: {
          de: 'Inhalt für die schmalere, linke Spalte.',
          en: 'Content for the narrower, left column.',
          fr: 'Contenu de la colonne de gauche, plus étroite',
        },
      },
    },
    {
      name: 'rightColumn',
      type: 'blocks',
      required: true,
      blocks: genericBlocks,
      label: {
        de: 'Rechte Spalte (grösser)',
        en: 'Right Column (larger)',
        fr: 'Colonne droite (plus grand)',
      },
      admin: {
        description: {
          de: 'Inhalt für die breitere, rechte Spalte.',
          en: 'Content for the wider, right column.',
          fr: 'Contenu de la colonne de droite, plus large',
        },
      },
    },
  ],
};
