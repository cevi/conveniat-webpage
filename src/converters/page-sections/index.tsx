import React from 'react';
import { LocalizedPageType } from '@/types';
import { ContentBlock } from '@/converters/page-sections/section-wrapper';
import {
  ContentBlockTypeNames,
  DetailsTable,
  RenderBlogPostsOverview,
  RenderFormBlock,
  RenderHeroSection,
  RenderPhotoCarousel,
  RenderRichTextSection,
  RenderYoutubeEmbed,
  SectionRenderer,
  SwisstopoInlineMapSection,
} from '@/converters/page-sections/content-blocks';

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

  const componentMap: Record<ContentBlockTypeNames, SectionRenderer | undefined> = {
    richTextSection: RenderRichTextSection,
    blogPostsOverview: RenderBlogPostsOverview,
    formBlock: RenderFormBlock,
    photoCarousel: RenderPhotoCarousel,
    youtubeEmbed: RenderYoutubeEmbed,
    heroSection: RenderHeroSection,
    swisstopoEmbed: SwisstopoInlineMapSection,
    detailsTable: DetailsTable,
  };

  return blocks.map((block) => {
    const BlockComponent = componentMap[block.blockType];
    if (BlockComponent === undefined)
      return <div key={block.id}>Unknown Block Type: {block.blockType}</div>;
    return <BlockComponent key={block.id} {...sectionProperties} block={block} />;
  });
};
