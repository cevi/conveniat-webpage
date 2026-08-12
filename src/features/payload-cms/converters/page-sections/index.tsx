import type {
  ContentBlockTypeNames,
  SectionRenderer,
} from '@/features/payload-cms/converters/page-sections/content-blocks';
import {
  AccordionBlock,
  DetailsTable,
  RenderApprovedFormSubmissions,
  RenderBlogPostsOverview,
  RenderCallToAction,
  RenderCampScheduleEntry,
  RenderCardGrid,
  RenderContactPerson,
  RenderCountdown,
  RenderDonationCta,
  RenderFeaturedSection,
  RenderFileDownload,
  RenderFormBlock,
  RenderHeroSection,
  RenderInstagramEmbed,
  RenderNewsCard,
  RenderPhotoCarousel,
  RenderPhotoContestBlock,
  RenderRichTextSection,
  RenderSectionSeparatorBlock,
  RenderSinglePicture,
  RenderSponsorGrid,
  RenderTabsBlock,
  RenderTimelineEntries,
  RenderWhiteSpace,
  RenderYoutubeEmbed,
  SummaryBlock,
  SwisstopoInlineMapSection,
} from '@/features/payload-cms/converters/page-sections/content-blocks';
import type { ContentBlock } from '@/features/payload-cms/converters/page-sections/section-wrapper';
import { RenderTwoColumnBlock } from '@/features/payload-cms/converters/page-sections/two-column-block';
import type { LocalizedPageType } from '@/types/types';
import React from 'react';

/**
 * A React component responsible for rendering the page sections of type blocks: ContentBlock.
 * This component is used to render the main content of a page.
 *
 * @param sectionProperties
 */
export const PageSectionsConverter: React.FC<
  LocalizedPageType & {
    blocks?: ContentBlock[] | null;
    sectionClassName?: string;
    sectionOverrides?: { [key in ContentBlockTypeNames]?: string };
    renderInPreviewMode?: boolean;
  }
> = (sectionProperties) => {
  const { blocks } = sectionProperties;

  if (!blocks) return <></>;

  const componentMap: Record<ContentBlockTypeNames, SectionRenderer<never> | undefined> = {
    richTextSection: RenderRichTextSection,
    blogPostsOverview: RenderBlogPostsOverview,
    formBlock: RenderFormBlock,
    approvedFormSubmissionsBlock: RenderApprovedFormSubmissions,
    photoCarousel: RenderPhotoCarousel,
    photoContestBlock: RenderPhotoContestBlock,
    singlePicture: RenderSinglePicture,
    youtubeEmbed: RenderYoutubeEmbed,
    instagramEmbed: RenderInstagramEmbed,
    swisstopoEmbed: SwisstopoInlineMapSection,
    fileDownload: RenderFileDownload,
    detailsTable: DetailsTable,
    accordion: AccordionBlock,
    summaryBox: SummaryBlock,
    timelineEntries: RenderTimelineEntries,
    countdown: RenderCountdown,
    whiteSpace: RenderWhiteSpace,
    callToAction: RenderCallToAction,
    donationCta: RenderDonationCta,
    newsCard: RenderNewsCard,
    campScheduleEntryBlock: RenderCampScheduleEntry,
    twoColumnBlock: RenderTwoColumnBlock,
    cardGrid: RenderCardGrid,
    contactPerson: RenderContactPerson,
    sponsorGrid: RenderSponsorGrid,
    featuredSection: RenderFeaturedSection,
    tabsBlock: RenderTabsBlock,
    heroSection: RenderHeroSection,
    sectionSeparator: RenderSectionSeparatorBlock,
  };

  return (
    <div>
      {blocks.map((block) => {
        const BlockComponent = componentMap[block.blockType];
        if (BlockComponent === undefined)
          return <div key={block.id}>Unknown Block Type: {block.blockType}</div>;
        // we need to cast block to never because the block type is unknown
        return <BlockComponent key={block.id} {...sectionProperties} block={block as never} />;
      })}
    </div>
  );
};
