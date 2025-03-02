import SectionWrapper, { ContentBlock } from '@/converters/page-sections/section-wrapper';
import { HeroSection, HeroSectionType } from '@/components/content-blocks/hero-section';
import React from 'react';
import { PhotoCarousel } from '@/components/gallery';
import { LocalizedPageType } from '@/types';
import { ShowForm } from '@/components/content-blocks/show-form';
import { FormBlockType } from '@/components/form';
import { LexicalRichTextSection } from '@/components/content-blocks/lexical-rich-text-section';
import type { SerializedEditorState } from '@payloadcms/richtext-lexical/lexical';
import { ListBlogPosts } from '@/components/content-blocks/list-blog-articles';
import { YoutubeEmbed } from '@/components/content-blocks/youtube-embed';
import InlineSwisstopoMapEmbed, {
  InlineSwisstopoMapEmbedType,
} from '@/components/map-viewer/inline-swisstopo-map-embed';
import { FileDownload, FileDownloadType } from '@/components/content-blocks/file-download';

export type ContentBlockTypeNames =
  | 'blogPostsOverview'
  | 'richTextSection'
  | 'formBlock'
  | 'photoCarousel'
  | 'youtubeEmbed'
  | 'heroSection'
  | 'swisstopoEmbed'
  | 'fileDownload';

export type SectionRenderer = React.FC<
  LocalizedPageType & {
    block: ContentBlock;
    sectionClassName?: string;
    sectionOverrides?: { [key in ContentBlockTypeNames]?: string };
  }
>;

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
  return (
    <SectionWrapper
      block={block}
      sectionClassName={sectionClassName}
      sectionOverrides={sectionOverrides}
      errorFallbackMessage="Failed to load youtube link. Reload the page to try again."
    >
      <YoutubeEmbed link={block.link ?? ''} />
    </SectionWrapper>
  );
};

export const RenderPhotoCarousel: SectionRenderer = ({
  block,
  sectionClassName,
  sectionOverrides,
}) => {
  return (
    <SectionWrapper
      block={block}
      sectionClassName={sectionClassName}
      sectionOverrides={sectionOverrides}
      errorFallbackMessage="Failed to load photo carousel. Reload the page to try again."
    >
      <PhotoCarousel images={block.images ?? []} />
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
  return (
    <SectionWrapper
      block={block}
      sectionClassName={sectionClassName}
      sectionOverrides={sectionOverrides}
      errorFallbackMessage="Failed to load blog posts overview. Reload the page to try again."
    >
      <LexicalRichTextSection richTextSection={block.richTextSection as SerializedEditorState} />
    </SectionWrapper>
  );
};

export const RenderFileDownload: SectionRenderer = ({
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
      <FileDownload {...(block as FileDownloadType)} />
    </SectionWrapper>
  );
};
