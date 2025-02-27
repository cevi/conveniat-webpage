import SectionWrapper, { ContentBlock } from '@/converters/page-sections/section-wrapper';
import { HeroSection, HeroSectionType } from '@/components/content-blocks/hero-section';
import React from 'react';
import { PhotoCarousel, PhotoCarouselBlock } from '@/components/gallery';
import { LocalizedPageType } from '@/types';
import { ShowForm } from '@/components/content-blocks/show-form';
import { FormBlockType } from '@/components/form';
import { LexicalRichTextSection } from '@/components/content-blocks/lexical-rich-text-section';
import type { SerializedEditorState } from '@payloadcms/richtext-lexical/lexical';
import { ListBlogPosts } from '@/components/content-blocks/list-blog-articles';
import { YoutubeEmbed, YoutubeEmbedType } from '@/components/content-blocks/youtube-embed';
import InlineSwisstopoMapEmbed, {
  InlineSwisstopoMapEmbedType,
} from '@/components/map-viewer/inline-swisstopo-map-embed';

export type ContentBlockTypeNames =
  | 'blogPostsOverview'
  | 'richTextSection'
  | 'formBlock'
  | 'photoCarousel'
  | 'youtubeEmbed'
  | 'heroSection'
  | 'swisstopoEmbed'
  | 'detailsTable';

export type SectionRenderer = React.FC<
  LocalizedPageType & {
    block: ContentBlock;
    sectionClassName?: string;
    sectionOverrides?: { [key in ContentBlockTypeNames]?: string };
  }
>;

export const DetailsTable: SectionRenderer = ({ block, sectionClassName, sectionOverrides }) => {
  return (
    <SectionWrapper
      block={block}
      sectionClassName={sectionClassName}
      sectionOverrides={sectionOverrides}
      errorFallbackMessage="Failed to load hero section. Reload the page to try again."
    >
      <LexicalRichTextSection richTextSection={block.introduction as SerializedEditorState} />
      <div>
        <hr className="border-b-2 border-gray-100" />
        {block.detailsTableBlocks?.map((detailsTableBlock, index) => (
          <div key={index} className="grid gap-x-2 p-2 md:grid-cols-2">
            <div className="my-2 font-semibold text-conveniat-green">{detailsTableBlock.label}</div>
            <LexicalRichTextSection
              richTextSection={detailsTableBlock.value as SerializedEditorState}
            />
            <hr className="grid-cols-2 border-b-2 border-gray-100" />
          </div>
        ))}
      </div>
    </SectionWrapper>
  );
};

export const SwisstopoInlineMapSection: SectionRenderer = ({
  block,
  sectionClassName,
  sectionOverrides,
}) => {
  return (
    <SectionWrapper
      block={block}
      sectionClassName={sectionClassName}
      sectionOverrides={sectionOverrides}
      errorFallbackMessage="Failed to load hero section. Reload the page to try again."
    >
      <InlineSwisstopoMapEmbed {...(block as InlineSwisstopoMapEmbedType)} />
    </SectionWrapper>
  );
};

export const RenderHeroSection: SectionRenderer = ({
  block,
  sectionClassName,
  sectionOverrides,
}) => {
  return (
    <SectionWrapper
      block={block}
      sectionClassName={sectionClassName}
      sectionOverrides={sectionOverrides}
      errorFallbackMessage="Failed to load hero section. Reload the page to try again."
    >
      <HeroSection {...(block as HeroSectionType)} />
    </SectionWrapper>
  );
};

export const RenderYoutubeEmbed: SectionRenderer = ({
  block,
  sectionClassName,
  sectionOverrides,
}) => {
  const youtubeEmbedBlock = block as YoutubeEmbedType;

  return (
    <SectionWrapper
      block={block}
      sectionClassName={sectionClassName}
      sectionOverrides={sectionOverrides}
      errorFallbackMessage="Failed to load youtube link. Reload the page to try again."
    >
      <YoutubeEmbed link={youtubeEmbedBlock.link} />
    </SectionWrapper>
  );
};

export const RenderPhotoCarousel: SectionRenderer = ({
  block,
  sectionClassName,
  sectionOverrides,
}) => {
  const photoCarouselBlock = block as PhotoCarouselBlock;

  return (
    <SectionWrapper
      block={block}
      sectionClassName={sectionClassName}
      sectionOverrides={sectionOverrides}
      errorFallbackMessage="Failed to load photo carousel. Reload the page to try again."
    >
      <PhotoCarousel images={photoCarouselBlock.images} />
    </SectionWrapper>
  );
};

export const RenderFormBlock: SectionRenderer = ({ block, sectionClassName, sectionOverrides }) => {
  return (
    <SectionWrapper
      block={block}
      sectionClassName={sectionClassName}
      sectionOverrides={sectionOverrides}
      errorFallbackMessage="Failed to load form block. Reload the page to try again."
    >
      <ShowForm {...(block as FormBlockType)} />
    </SectionWrapper>
  );
};

export const RenderBlogPostsOverview: SectionRenderer = ({
  locale,
  searchParams,
  block,
  sectionClassName,
  sectionOverrides,
}) => {
  return (
    <SectionWrapper
      block={block}
      sectionClassName={sectionClassName}
      sectionOverrides={sectionOverrides}
      errorFallbackMessage="Failed to load blog posts overview. Reload the page to try again."
    >
      <ListBlogPosts locale={locale} searchParams={searchParams} />
    </SectionWrapper>
  );
};

export const RenderRichTextSection: SectionRenderer = ({
  block,
  sectionClassName,
  sectionOverrides,
}) => {
  const richTextBlock = block as { richTextSection: SerializedEditorState };

  return (
    <SectionWrapper
      block={block}
      sectionClassName={sectionClassName}
      sectionOverrides={sectionOverrides}
      errorFallbackMessage="Failed to load blog posts overview. Reload the page to try again."
    >
      <LexicalRichTextSection richTextSection={richTextBlock.richTextSection} />
    </SectionWrapper>
  );
};
