import type { ContentBlock } from '@/features/payload-cms/converters/page-sections/section-wrapper';
import SectionWrapper from '@/features/payload-cms/converters/page-sections/section-wrapper';
import type { HeroSectionType } from '@/features/payload-cms/components/content-blocks/hero-section';
import { HeroSection } from '@/features/payload-cms/components/content-blocks/hero-section';
import React from 'react';
import type { PhotoCarouselBlock } from '@/components/gallery';
import { PhotoCarousel } from '@/components/gallery';
import type { LocalizedPageType } from '@/types/types';
import { ShowForm } from '@/features/payload-cms/components/content-blocks/show-form';
import type { FormBlockType } from 'src/features/payload-cms/components/form';
import type { LexicalRichTextSectionType } from '@/features/payload-cms/components/content-blocks/lexical-rich-text-section';
import { LexicalRichTextSection } from '@/features/payload-cms/components/content-blocks/lexical-rich-text-section';
import type { SerializedEditorState } from '@payloadcms/richtext-lexical/lexical';
import { ListBlogPosts } from '@/features/payload-cms/components/content-blocks/list-blog-articles';
import type { YoutubeEmbedType } from '@/features/payload-cms/components/content-blocks/youtube-embed';
import { YoutubeEmbed } from '@/features/payload-cms/components/content-blocks/youtube-embed';
import type { InlineSwisstopoMapEmbedType } from '@/features/payload-cms/components/content-blocks/inline-swisstopo-map-embed';
import InlineSwisstopoMapEmbed from '@/features/payload-cms/components/content-blocks/inline-swisstopo-map-embed';
import type { FileDownloadType } from '@/features/payload-cms/components/content-blocks/file-download';
import { FileDownload } from '@/features/payload-cms/components/content-blocks/file-download';
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
      errorFallbackMessage="Failed to load details table. Reload the page to try again."
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
      errorFallbackMessage="Failed to load swisstopo inline map. Reload the page to try again."
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
      errorFallbackMessage="Failed to load single picture. Reload the page to try again."
    >
      <div className="relative mt-10 aspect-[16/9] w-[calc(100%+32px)] text-lg text-conveniat-green max-md:mx-[-16px]">
        <Image
          src={block.image.url}
          alt={block.image.alt}
          className="block rounded-2xl object-cover"
          fill
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
      errorFallbackMessage="Failed to load rich text section. Reload the page to try again."
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
      errorFallbackMessage="Failed to load file download. Reload the page to try again."
    >
      <FileDownload {...block} />
    </SectionWrapper>
  );
};
