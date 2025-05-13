import type {
  ContentBlockTypeNames,
  SectionRenderer,
} from '@/features/payload-cms/converters/page-sections/content-blocks';
import {
  AccordionBlock,
  DetailsTable,
  RenderBlogPostsOverview,
  RenderFileDownload,
  RenderFormBlock,
  RenderHeroSection,
  RenderInstagramEmbed,
  RenderPhotoCarousel,
  RenderRichTextSection,
  RenderSinglePicture,
  RenderYoutubeEmbed,
  SwisstopoInlineMapSection,
} from '@/features/payload-cms/converters/page-sections/content-blocks';
import type { ContentBlock } from '@/features/payload-cms/converters/page-sections/section-wrapper';
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
    blocks: ContentBlock[];
    sectionClassName?: string;
    sectionOverrides?: { [key in ContentBlockTypeNames]?: string };
  }
> = (sectionProperties) => {
  const { blocks } = sectionProperties;

  const componentMap: Record<ContentBlockTypeNames, SectionRenderer<never> | undefined> = {
    richTextSection: RenderRichTextSection,
    blogPostsOverview: RenderBlogPostsOverview,
    formBlock: RenderFormBlock,
    photoCarousel: RenderPhotoCarousel,
    singlePicture: RenderSinglePicture,
    youtubeEmbed: RenderYoutubeEmbed,
    instagramEmbed: RenderInstagramEmbed,
    heroSection: RenderHeroSection,
    swisstopoEmbed: SwisstopoInlineMapSection,
    fileDownload: RenderFileDownload,
    detailsTable: DetailsTable,
    accordion: AccordionBlock,
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
