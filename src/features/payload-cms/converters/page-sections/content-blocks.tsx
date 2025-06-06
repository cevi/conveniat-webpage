import { ClientOnly } from '@/components/client-only';
import type { PhotoCarouselBlock } from '@/components/gallery';
import { PhotoCarousel } from '@/components/gallery';
import { Accordion } from '@/features/payload-cms/components/accordion/accordion';
import type { CallToActionType } from '@/features/payload-cms/components/content-blocks/call-to-action';
import { CallToActionBlock } from '@/features/payload-cms/components/content-blocks/call-to-action';
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
import type { LocalizedPageType, StaticTranslationString } from '@/types/types';
import { getLocaleFromCookies } from '@/utils/get-locale-from-cookies';
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
  | 'whiteSpace'
  | 'callToAction';

export type SectionRenderer<T = object> = React.FC<
  LocalizedPageType & {
    block: ContentBlock<T>;
    sectionClassName?: string;
    sectionOverrides?: { [key in ContentBlockTypeNames]?: string };
  }
>;

const errorMessageForType = async (type: StaticTranslationString): Promise<string> => {
  const locale = await getLocaleFromCookies();

  const part1: StaticTranslationString = {
    de: '',
    en: 'Failed to load ',
    fr: 'Échec du chargement de ',
  };

  const part2: StaticTranslationString = {
    de: ' konnte nicht geladen werden. Lade die Seite neu, um es erneut zu versuchen.',
    en: '. Please reload the page to try again.',
    fr: '. Veuillez recharger la page pour réessayer.',
  };

  // combine part1, type, part2
  const combined: StaticTranslationString = {
    de: part1.de + type.de + part2.de,
    en: part1.en + type.en + part2.en,
    fr: part1.fr + type.fr + part2.fr,
  };

  return combined[locale];
};

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
      errorFallbackMessage={await errorMessageForType({
        de: 'der Zeitstrahl-Eintrag',
        en: 'timeline entry',
        fr: "l'entrée de la chronologie",
      })}
    >
      {timelineEntries.map((timelineEntry, index) => (
        <Fragment key={index}>
          <TimelineEntry timeline={timelineEntry} locale={locale} searchParams={searchParams} />
        </Fragment>
      ))}
    </SectionWrapper>
  );
};

export const AccordionBlock: SectionRenderer<AccordionBlocks> = async ({
  block,
  sectionClassName,
  sectionOverrides,
}) => {
  return (
    <SectionWrapper
      block={block}
      sectionClassName={sectionClassName}
      sectionOverrides={sectionOverrides}
      errorFallbackMessage={await errorMessageForType({
        de: 'Der Akkordeonblock',
        en: 'accordion block',
        fr: 'le bloc accordéon',
      })}
    >
      <LexicalRichTextSection richTextSection={block.introduction} />

      <div className="mt-4">
        <Accordion block={block} />
      </div>
    </SectionWrapper>
  );
};

export const SummaryBlock: SectionRenderer<LexicalRichTextSectionType> = async ({
  block,
  sectionClassName,
  sectionOverrides,
}) => {
  return (
    <SectionWrapper
      block={block}
      sectionClassName={sectionClassName}
      sectionOverrides={sectionOverrides}
      errorFallbackMessage={await errorMessageForType({
        de: 'Der Zusammenfassungsblock',
        en: 'summary block',
        fr: 'le bloc de résumé',
      })}
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
}> = async ({ block, sectionClassName, sectionOverrides }) => {
  return (
    <SectionWrapper
      block={block}
      sectionClassName={sectionClassName}
      sectionOverrides={sectionOverrides}
      errorFallbackMessage={await errorMessageForType({
        de: 'Die Detailtabelle',
        en: 'details table',
        fr: 'le tableau de détails',
      })}
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

export const SwisstopoInlineMapSection: SectionRenderer<InlineSwisstopoMapEmbedType> = async ({
  block,
  sectionClassName,
  sectionOverrides,
}) => {
  return (
    <SectionWrapper
      block={block}
      sectionClassName={sectionClassName}
      sectionOverrides={sectionOverrides}
      errorFallbackMessage={await errorMessageForType({
        de: 'Die Swisstopo-Karte',
        en: 'Swisstopo inline map',
        fr: 'la carte Swisstopo intégrée',
      })}
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
}> = async ({ block, sectionClassName, sectionOverrides }) => {
  return (
    <SectionWrapper
      block={block}
      sectionClassName={sectionClassName}
      sectionOverrides={sectionOverrides}
      errorFallbackMessage={await errorMessageForType({
        de: 'Das Einzelbild',
        en: 'single picture',
        fr: 'l’image unique',
      })}
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

export const RenderHeroSection: SectionRenderer<HeroSectionType> = async ({
  block,
  sectionClassName,
  sectionOverrides,
}) => {
  return (
    <SectionWrapper
      block={block}
      sectionClassName={sectionClassName}
      sectionOverrides={sectionOverrides}
      errorFallbackMessage={await errorMessageForType({
        de: 'Der Hero-Abschnitt',
        en: 'hero section',
        fr: 'la section héros',
      })}
    >
      <HeroSection {...block} />
    </SectionWrapper>
  );
};

export const RenderYoutubeEmbed: SectionRenderer<YoutubeEmbedType> = async ({
  block,
  sectionClassName,
  sectionOverrides,
}) => {
  return (
    <SectionWrapper
      block={block}
      sectionClassName={sectionClassName}
      sectionOverrides={sectionOverrides}
      errorFallbackMessage={await errorMessageForType({
        de: 'Der YouTube-Link',
        en: 'YouTube link',
        fr: 'le lien YouTube',
      })}
    >
      <YoutubeEmbed links={block.links} />
    </SectionWrapper>
  );
};

export const RenderInstagramEmbed: SectionRenderer<InstagramEmbedType> = async ({
  block,
  sectionClassName,
  sectionOverrides,
}) => {
  return (
    <SectionWrapper
      block={block}
      sectionClassName={sectionClassName}
      sectionOverrides={sectionOverrides}
      errorFallbackMessage={await errorMessageForType({
        de: 'Der Instagram-Link',
        en: 'Instagram link',
        fr: 'le lien Instagram',
      })}
    >
      <InstagramEmbed link={block.link} />
    </SectionWrapper>
  );
};

export const RenderPhotoCarousel: SectionRenderer<PhotoCarouselBlock> = async ({
  block,
  sectionClassName,
  sectionOverrides,
}) => {
  return (
    <SectionWrapper
      block={block}
      sectionClassName={sectionClassName}
      sectionOverrides={sectionOverrides}
      errorFallbackMessage={await errorMessageForType({
        de: 'Das Fotokarussell',
        en: 'photo carousel',
        fr: 'le carrousel de photos',
      })}
    >
      <PhotoCarousel images={block.images} />
    </SectionWrapper>
  );
};

export const RenderFormBlock: SectionRenderer<FormBlockType> = async ({
  block,
  sectionClassName,
  sectionOverrides,
}) => {
  return (
    <SectionWrapper
      block={block}
      sectionClassName={sectionClassName}
      sectionOverrides={sectionOverrides}
      errorFallbackMessage={await errorMessageForType({
        de: 'der Formularblock',
        en: 'form block',
        fr: 'le bloc de formulaire',
      })}
    >
      <ShowForm {...block} withBorder />
    </SectionWrapper>
  );
};

export const RenderBlogPostsOverview: SectionRenderer = async ({
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
      errorFallbackMessage={await errorMessageForType({
        de: 'Die Blogbeitragsübersicht',
        en: 'blog posts overview',
        fr: 'l’aperçu des articles de blog',
      })}
    >
      <ListBlogPosts locale={locale} searchParams={searchParams} />
    </SectionWrapper>
  );
};

export const RenderRichTextSection: SectionRenderer<LexicalRichTextSectionType> = async ({
  block,
  sectionClassName,
  sectionOverrides,
}) => {
  return (
    <SectionWrapper
      block={block}
      sectionClassName={sectionClassName}
      sectionOverrides={sectionOverrides}
      errorFallbackMessage={await errorMessageForType({
        de: 'Der Rich-Text-Abschnitt',
        en: 'rich text section',
        fr: 'la section de texte enrichi',
      })}
    >
      <LexicalRichTextSection richTextSection={block.richTextSection} />
    </SectionWrapper>
  );
};

export const RenderFileDownload: SectionRenderer<FileDownloadType> = async ({
  block,
  sectionClassName,
  sectionOverrides,
}) => {
  return (
    <SectionWrapper
      block={block}
      sectionClassName={sectionClassName}
      sectionOverrides={sectionOverrides}
      errorFallbackMessage={await errorMessageForType({
        de: 'Der Datei-Download',
        en: 'file download',
        fr: 'le téléchargement de fichier',
      })}
    >
      <FileDownload {...block} />
    </SectionWrapper>
  );
};

export const RenderCountdown: SectionRenderer<CountdownType> = async ({
  block,
  sectionClassName,
  sectionOverrides,
}) => {
  return (
    <SectionWrapper
      block={block}
      sectionClassName={sectionClassName}
      sectionOverrides={sectionOverrides}
      errorFallbackMessage={await errorMessageForType({
        de: 'Der Countdown',
        en: 'countdown',
        fr: 'le compte à rebours',
      })}
    >
      <ClientOnly
        fallback={
          <div className="bg-conveniat-green/10 border-conveniat-green/20 my-6 h-[327px] w-full rounded-lg border p-6"></div>
        }
      >
        <Countdown {...block} />
      </ClientOnly>
    </SectionWrapper>
  );
};

export const RenderWhiteSpace: SectionRenderer = async ({
  block,
  sectionClassName,
  sectionOverrides,
}) => {
  return (
    <SectionWrapper
      block={block}
      sectionClassName={sectionClassName}
      sectionOverrides={sectionOverrides}
      errorFallbackMessage={await errorMessageForType({
        de: 'Der Leerraum',
        en: 'whitespace',
        fr: "l'espace vide",
      })}
    >
      <div className="h-3 w-full" />
    </SectionWrapper>
  );
};

export const RenderCallToAction: SectionRenderer<CallToActionType> = async ({
  block,
  sectionClassName,
  sectionOverrides,
}) => {
  return (
    <SectionWrapper
      block={block}
      sectionClassName={sectionClassName}
      sectionOverrides={sectionOverrides}
      errorFallbackMessage={await errorMessageForType({
        de: 'Der Call-To-Action Button',
        en: 'call-to-action button',
        fr: 'le bouton call-to-action',
      })}
    >
      <CallToActionBlock {...block} />
    </SectionWrapper>
  );
};
