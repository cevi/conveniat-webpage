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

  imageURL: '/admin-block-images/two-column-block.png',
  imageAltText: 'Two column block',

  fields: [
    {
      name: 'splitRatio',
      type: 'select',
      required: true,
      defaultValue: 'rightLarger',
      options: [
        {
          label: {
            de: 'Rechte Spalte grösser (Goldener Schnitt)',
            en: 'Right Column larger (Golden Ratio)',
            fr: "Colonne droite plus grande (Nombre d'or)",
          },
          value: 'rightLarger',
        },
        {
          label: {
            de: 'Linke Spalte grösser (Goldener Schnitt)',
            en: 'Left Column larger (Golden Ratio)',
            fr: "Colonne gauche plus grande (Nombre d'or)",
          },
          value: 'leftLarger',
        },
        {
          label: {
            de: 'Gleich gross (50/50)',
            en: 'Equal size (50/50)',
            fr: 'Taille égale (50/50)',
          },
          value: 'equal',
        },
      ],
      label: {
        de: 'Spaltenaufteilung',
        en: 'Column Split Ratio',
        fr: 'Répartition des colonnes',
      },
      admin: {
        description: {
          de: 'Wähle das Breitenverhältnis der beiden Spalten zueinander aus.',
          en: 'Choose the width ratio of the two columns to each other.',
          fr: 'Choisissez le rapport de largeur des deux colonnes entre elles.',
        },
      },
    },
    {
      name: 'verticalAlignment',
      type: 'select',
      required: true,
      defaultValue: 'top',
      options: [
        {
          label: {
            de: 'Oben bündig',
            en: 'Top aligned',
            fr: 'Aligné en haut',
          },
          value: 'top',
        },
        {
          label: {
            de: 'Mittig zentriert',
            en: 'Centered vertically',
            fr: 'Centré verticalement',
          },
          value: 'center',
        },
        {
          label: {
            de: 'Unten bündig',
            en: 'Bottom aligned',
            fr: 'Aligné en bas',
          },
          value: 'bottom',
        },
      ],
      label: {
        de: 'Vertikale Ausrichtung',
        en: 'Vertical Alignment',
        fr: 'Alignement vertical',
      },
      admin: {
        description: {
          de: 'Wähle aus, wie die Spalten vertikal zueinander ausgerichtet sein sollen.',
          en: 'Choose how the columns should be aligned vertically to each other.',
          fr: 'Choisissez comment les colonnes doivent être alignées verticalement les unes par rapport aux autres.',
        },
      },
    },
    {
      name: 'leftColumn',
      type: 'blocks',
      required: true,
      blocks: genericBlocks,
      label: {
        de: 'Linke Spalte',
        en: 'Left Column',
        fr: 'Colonne gauche',
      },
      admin: {
        description: {
          de: 'Inhalt für die linke Spalte.',
          en: 'Content for the left column.',
          fr: 'Contenu de la colonne de gauche.',
        },
      },
    },
    {
      name: 'rightColumn',
      type: 'blocks',
      required: true,
      blocks: genericBlocks,
      label: {
        de: 'Rechte Spalte',
        en: 'Right Column',
        fr: 'Colonne droite',
      },
      admin: {
        description: {
          de: 'Inhalt für die rechte Spalte.',
          en: 'Content for the right column.',
          fr: 'Contenu de la colonne de droite.',
        },
      },
    },
  ],
};
