import { accordion } from '@/features/payload-cms/payload-cms/shared-blocks/accordion';
import { blockPostsOverview } from '@/features/payload-cms/payload-cms/shared-blocks/blog-posts-overview-block';
import { callToActionBlock } from '@/features/payload-cms/payload-cms/shared-blocks/call-to-action-block';
import { campScheduleEntryBlock } from '@/features/payload-cms/payload-cms/shared-blocks/camp-schedule-entry.block';
import { countdownBlock } from '@/features/payload-cms/payload-cms/shared-blocks/countdown-block';
import { detailsTable } from '@/features/payload-cms/payload-cms/shared-blocks/details-table';
import { fileDownloadBlock } from '@/features/payload-cms/payload-cms/shared-blocks/file-download-block';
import { formBlock } from '@/features/payload-cms/payload-cms/shared-blocks/form-block';
import { heroSection } from '@/features/payload-cms/payload-cms/shared-blocks/hero-section-block';
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
  defaultValue: [
    {
      blockType: 'richTextSection',
      richTextSection: {
        root: {
          children: [
            {
              children: [
                {
                  detail: 0,
                  format: 0,
                  mode: 'normal',
                  style: '',
                  text: 'This is a new page, please edit me!',
                  type: 'text',
                  version: 1,
                },
              ],
              format: '',
              indent: 0,
              type: 'paragraph',
              version: 1,
              textFormat: 0,
              textStyle: '',
            },
          ],
          format: '',
          indent: 0,
          type: 'root',
          version: 1,
        },
      },
      blockName: 'Main Page Content',
    },
  ],
  blocks: [
    richTextArticleBlock,
    blockPostsOverview,
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
    whiteSpaceBlock,
    callToActionBlock,
    newsCardBlock,
    campScheduleEntryBlock,
  ],
};
