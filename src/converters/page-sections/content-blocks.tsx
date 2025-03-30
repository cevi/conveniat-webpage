import SectionWrapper, { ContentBlock } from '@/converters/page-sections/section-wrapper';
import { HeroSection, HeroSectionType } from '@/components/content-blocks/hero-section';
import React from 'react';
import { PhotoCarousel, PhotoCarouselBlock } from '@/components/gallery';
import { LocalizedPageType } from '@/types';
import { ShowForm } from '@/components/content-blocks/show-form';
import { FormBlockType } from '@/components/form';
import {
  LexicalRichTextSection,
  LexicalRichTextSectionType,
} from '@/components/content-blocks/lexical-rich-text-section';
import type { SerializedEditorState } from '@payloadcms/richtext-lexical/lexical';
import { ListBlogPosts } from '@/components/content-blocks/list-blog-articles';
import { YoutubeEmbed, YoutubeEmbedType } from '@/components/content-blocks/youtube-embed';
import InlineSwisstopoMapEmbed, {
  InlineSwisstopoMapEmbedType,
} from '@/components/map-viewer/inline-swisstopo-map-embed';
import { FileDownload, FileDownloadType } from '@/components/content-blocks/file-download';
import Image from 'next/image';

export type ContentBlockTypeNames =
  | 'blogPostsOverview'
  | 'richTextSection'
  | 'formBlock'
  | 'photoCarousel'
  | 'youtubeEmbed'
  | 'singlePicture'
  | 'heroSection'
  | 'swisstopoEmbed'
  | 'fileDownload'
  | 'detailsTable';

export type SectionRenderer<T = object> = React.FC<
  LocalizedPageType & {
    block: ContentBlock<T>;
    sectionClassName?: string;
    sectionOverrides?: { [key in ContentBlockTypeNames]?: string };
  }
>;

export const DetailsTable: SectionRenderer<{
  introduction: SerializedEditorState;
  detailsTableBlocks: { label: string; value: SerializedEditorState }[];
}> = ({ block, sectionClassName, sectionOverrides }) => {
  return (
    <SectionWrapper
      block={block}
      sectionClassName={sectionClassName}
      sectionOverrides={sectionOverrides}
      errorFallbackMessage="Failed to load hero section. Reload the page to try again."
    >
      <LexicalRichTextSection richTextSection={block.introduction} />

      <div className="mt-4">
        <hr className="border-b-2 border-gray-100" />
        {block.detailsTableBlocks.map((detailsTableEntry, index) => (
          <React.Fragment key={index}>
            <div className="grid gap-x-2 hyphens-auto p-2 md:grid-cols-[1fr_2fr]">
              <div className="my-2 font-semibold text-conveniat-green">
                {detailsTableEntry.label}
              </div>
              <LexicalRichTextSection richTextSection={detailsTableEntry.value} />
            </div>
            <hr className="grid-cols-2 border-b-2 border-gray-100" />
          </React.Fragment>
        ))}
      </div>
    </SectionWrapper>
  );
};

export const SwisstopoInlineMapSection: SectionRenderer<InlineSwisstopoMapEmbedType> = ({
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
      <InlineSwisstopoMapEmbed {...block} />
    </SectionWrapper>
  );
};

export const RenderSinglePicture: SectionRenderer<{
  image: {
    url: string;
    alt: string;
    imageCaption?: string;
  };
}> = ({ block, sectionClassName, sectionOverrides }) => {
  return (
    <SectionWrapper
      block={block}
      sectionClassName={sectionClassName}
      sectionOverrides={sectionOverrides}
      errorFallbackMessage="Failed to load hero section. Reload the page to try again."
    >
      <div className="relative mt-10 aspect-[16/9] w-[calc(100%+32px)] text-lg text-conveniat-green max-md:mx-[-16px]">
        <Image
          src={block.image.url}
          alt={block.image.alt}
          className="block rounded-2xl object-cover"
          fill={true}
        />
      </div>
    </SectionWrapper>
  );
};

export const RenderHeroSection: SectionRenderer<HeroSectionType> = ({
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
      <HeroSection {...block} />
    </SectionWrapper>
  );
};

export const RenderYoutubeEmbed: SectionRenderer<YoutubeEmbedType> = ({
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
      <YoutubeEmbed link={block.link} />
    </SectionWrapper>
  );
};

export const RenderPhotoCarousel: SectionRenderer<PhotoCarouselBlock> = ({
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
      <PhotoCarousel images={block.images} />
    </SectionWrapper>
  );
};

export const RenderFormBlock: SectionRenderer<FormBlockType> = ({
  block,
  sectionClassName,
  sectionOverrides,
}) => {
  return (
    <SectionWrapper
      block={block}
      sectionClassName={sectionClassName}
      sectionOverrides={sectionOverrides}
      errorFallbackMessage="Failed to load form block. Reload the page to try again."
    >
      <ShowForm {...block} />
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

export const RenderRichTextSection: SectionRenderer<LexicalRichTextSectionType> = ({
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
      <LexicalRichTextSection richTextSection={block.richTextSection} />
    </SectionWrapper>
  );
};

export const RenderFileDownload: SectionRenderer<FileDownloadType> = ({
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
      <FileDownload {...block} />
    </SectionWrapper>
  );
};
