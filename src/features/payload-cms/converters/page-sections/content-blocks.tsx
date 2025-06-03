import type { PhotoCarouselBlock } from '@/components/gallery';
import { PhotoCarousel } from '@/components/gallery';
import { Accordion } from '@/features/payload-cms/components/accordion/accordion';
import type { CountdownType } from '@/features/payload-cms/components/content-blocks/countdown';
import { Countdown } from '@/features/payload-cms/components/content-blocks/countdown';
import type { FileDownloadType } from '@/features/payload-cms/components/content-blocks/file-download';
import { FileDownload } from '@/features/payload-cms/components/content-blocks/file-download';
import type { HeroSectionType } from '@/features/payload-cms/components/content-blocks/hero-section';
import { HeroSection } from '@/features/payload-cms/components/content-blocks/hero-section';
import type { InlineSwisstopoMapEmbedType } from '@/features/payload-cms/components/content-blocks/inline-swisstopo-map-embed';
import InlineSwisstopoMapEmbed from '@/features/payload-cms/components/content-blocks/inline-swisstopo-map-embed';
import {
  InstagramEmbed,
  type InstagramEmbedType,
} from '@/features/payload-cms/components/content-blocks/instagram-embed';
import type { LexicalRichTextSectionType } from '@/features/payload-cms/components/content-blocks/lexical-rich-text-section';
import { LexicalRichTextSection } from '@/features/payload-cms/components/content-blocks/lexical-rich-text-section';
import { ListBlogPosts } from '@/features/payload-cms/components/content-blocks/list-blog-articles';
import { ShowForm } from '@/features/payload-cms/components/content-blocks/show-form';
import { TimelineEntry } from '@/features/payload-cms/components/content-blocks/timeline-entry';
import type { YoutubeEmbedType } from '@/features/payload-cms/components/content-blocks/youtube-embed';
import { YoutubeEmbed } from '@/features/payload-cms/components/content-blocks/youtube-embed';
import type { FormBlockType } from '@/features/payload-cms/components/form';
import type { ContentBlock } from '@/features/payload-cms/converters/page-sections/section-wrapper';
import SectionWrapper from '@/features/payload-cms/converters/page-sections/section-wrapper';
import type {
  AccordionBlocks,
  Timeline,
  TimelineCategory,
  TimelineEntries,
} from '@/features/payload-cms/payload-types';
import type { LocalizedPageType } from '@/types/types';
import config from '@payload-config';
import type { SerializedEditorState } from '@payloadcms/richtext-lexical/lexical';
import Image from 'next/image';
import { getPayload } from 'payload';
import type React from 'react';
import { Fragment } from 'react';

export type ContentBlockTypeNames =
  | 'blogPostsOverview'
  | 'richTextSection'
  | 'formBlock'
  | 'photoCarousel'
  | 'youtubeEmbed'
  | 'instagramEmbed'
  | 'singlePicture'
  | 'heroSection'
  | 'swisstopoEmbed'
  | 'fileDownload'
  | 'detailsTable'
  | 'accordion'
  | 'summaryBox'
  | 'timelineEntries'
  | 'countdown'
  | 'whiteSpace';

export type SectionRenderer<T = object> = React.FC<
  LocalizedPageType & {
    block: ContentBlock<T>;
    sectionClassName?: string;
    sectionOverrides?: { [key in ContentBlockTypeNames]?: string };
  }
>;

export const RenderTimelineEntries: SectionRenderer<TimelineEntries> = async ({
  block,
  locale,
  searchParams,
  sectionClassName,
  sectionOverrides,
}) => {
  const timelineEntryCategories: (string | TimelineCategory)[] =
    block.timelineEntryCategories ?? [];

  const timelineEntryUuids: string[] = timelineEntryCategories
    .filter((entry: string | TimelineCategory) => typeof entry === 'object')
    .flatMap((entry: TimelineCategory) => entry.relatedTimelineEntries?.docs ?? [])
    .flat()
    .filter((entry: string | Timeline) => typeof entry === 'string');

  const payload = await getPayload({ config });
  const now = new Date();
  const timelineQueryResult = timelineEntryUuids.map((uuid) =>
    payload.find({
      collection: 'timeline',
      locale: locale, // current locale
      where: {
        id: { equals: uuid },
        // only show news entries that are published in the current locale
        _localized_status: { equals: { published: true } },
        // only show news entries that lay in the past
        date: { less_than_equal: now },
      },
    }),
  );

  const timelineEntriesPaginated = await Promise.all(timelineQueryResult);
  const timelineEntries = timelineEntriesPaginated
    .flatMap((element) => element.docs)
    // order timeline entries by date
    .sort((entry1: Timeline, entry2: Timeline) => entry2.date.localeCompare(entry1.date));

  return (
    <SectionWrapper
      block={block}
      sectionClassName={sectionClassName}
      sectionOverrides={sectionOverrides}
      errorFallbackMessage="Failed to load timeline entries. Reload the page to try again."
    >
      {timelineEntries.map((timelineEntry, index) => (
        <Fragment key={index}>
          <TimelineEntry timeline={timelineEntry} locale={locale} searchParams={searchParams} />
        </Fragment>
      ))}
    </SectionWrapper>
  );
};

export const AccordionBlock: SectionRenderer<AccordionBlocks> = ({
  block,
  sectionClassName,
  sectionOverrides,
}) => {
  return (
    <SectionWrapper
      block={block}
      sectionClassName={sectionClassName}
      sectionOverrides={sectionOverrides}
      errorFallbackMessage="Failed to load details table. Reload the page to try again."
    >
      <LexicalRichTextSection richTextSection={block.introduction} />

      <div className="mt-4">
        <Accordion block={block} />
      </div>
    </SectionWrapper>
  );
};

export const SummaryBlock: SectionRenderer<LexicalRichTextSectionType> = ({
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
      <div className="border-t-conveniat-green mx-0 my-8 border-t-[4px] bg-green-100 p-6 md:mx-12">
        <LexicalRichTextSection richTextSection={block.richTextSection} />
      </div>
    </SectionWrapper>
  );
};

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
        <hr className="border border-gray-100" />
        {block.detailsTableBlocks.map((detailsTableEntry, index) => (
          <Fragment key={index}>
            <div className="grid gap-x-2 p-2 hyphens-auto md:grid-cols-[1fr_2fr]">
              <div className="text-conveniat-green my-2 font-semibold">
                {detailsTableEntry.label}
              </div>
              <LexicalRichTextSection richTextSection={detailsTableEntry.value} />
            </div>
            <hr className="grid-cols-2 border border-gray-100" />
          </Fragment>
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
      <div className="text-conveniat-green relative mt-10 aspect-[16/9] w-[calc(100%+32px)] text-lg max-md:mx-[-16px]">
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
      <YoutubeEmbed links={block.links} />
    </SectionWrapper>
  );
};

export const RenderInstagramEmbed: SectionRenderer<InstagramEmbedType> = ({
  block,
  sectionClassName,
  sectionOverrides,
}) => {
  return (
    <SectionWrapper
      block={block}
      sectionClassName={sectionClassName}
      sectionOverrides={sectionOverrides}
      errorFallbackMessage="Failed to load instagram link. Reload the page to try again."
    >
      <InstagramEmbed link={block.link} />
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

export const RenderCountdown: SectionRenderer<CountdownType> = ({
  block,
  sectionClassName,
  sectionOverrides,
}) => {
  return (
    <SectionWrapper
      block={block}
      sectionClassName={sectionClassName}
      sectionOverrides={sectionOverrides}
      errorFallbackMessage="Failed to load countdown. Reload the page to try again."
    >
      <Countdown {...block} />
    </SectionWrapper>
  );
};

export const RenderWhiteSpace: SectionRenderer = ({
  block,
  sectionClassName,
  sectionOverrides,
}) => {
  return (
    <SectionWrapper
      block={block}
      sectionClassName={sectionClassName}
      sectionOverrides={sectionOverrides}
      errorFallbackMessage="Failed to load countdown. Reload the page to try again."
    >
      <div className="h-3 w-full" />
    </SectionWrapper>
  );
};
