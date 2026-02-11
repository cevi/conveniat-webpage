import { ClientOnly } from '@/components/client-only';
import type { PhotoCarouselBlock } from '@/components/gallery';
import { PhotoCarousel } from '@/components/gallery';
import type { NewsCardType } from '@/components/news-card';
import { NewsCardBlock } from '@/components/news-card';
import { getTimelineEntriesCached } from '@/features/payload-cms/api/cached-timeline';
import { Accordion } from '@/features/payload-cms/components/accordion/accordion';
import type { CallToActionType } from '@/features/payload-cms/components/content-blocks/call-to-action';
import { CallToActionBlock } from '@/features/payload-cms/components/content-blocks/call-to-action';
import type { CampScheduleEntryType } from '@/features/payload-cms/components/content-blocks/camp-schedule-entry';
import { CampScheduleEntryContentBlock } from '@/features/payload-cms/components/content-blocks/camp-schedule-entry';
import type { CountdownType } from '@/features/payload-cms/components/content-blocks/countdown';
import { Countdown } from '@/features/payload-cms/components/content-blocks/countdown';
import type { FileDownloadType } from '@/features/payload-cms/components/content-blocks/file-download';
import { FileDownload } from '@/features/payload-cms/components/content-blocks/file-download';
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
import { resolveRichTextLinks } from '@/features/payload-cms/payload-cms/utils/resolve-rich-text-links';
import type {
  AccordionBlocks,
  Timeline,
  TimelineCategory,
  TimelineEntries,
} from '@/features/payload-cms/payload-types';
import type { Locale, LocalizedPageType, StaticTranslationString } from '@/types/types';
import config from '@payload-config';
import type { SerializedEditorState } from '@payloadcms/richtext-lexical/lexical';
import { cacheLife, cacheTag } from 'next/cache';
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
  | 'swisstopoEmbed'
  | 'fileDownload'
  | 'detailsTable'
  | 'accordion'
  | 'summaryBox'
  | 'timelineEntries'
  | 'countdown'
  | 'whiteSpace'
  | 'callToAction'
  | 'newsCard'
  | 'campScheduleEntryBlock';

export type SectionRenderer<T = object> = React.FC<
  LocalizedPageType & {
    block: ContentBlock<T>;
    sectionClassName?: string;
    sectionOverrides?: { [key in ContentBlockTypeNames]?: string };
    locale: Locale;
  }
>;

const errorMessageForType = (type: StaticTranslationString, locale: Locale): string => {
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
const getTimelineEntriesCachedPersistent = async (
  ids: string[],
  locale: Locale,
): Promise<{ docs: Timeline[] }> => {
  'use cache';
  cacheLife('hours');
  cacheTag('payload', 'timeline', 'collection:timeline');

  return getTimelineEntriesCached(ids, locale);
};

export const RenderTimelineEntries: SectionRenderer<TimelineEntries> = async ({
  block,
  locale,
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

  const { docs: timelineEntriesUnsorted } = await getTimelineEntriesCachedPersistent(
    timelineEntryUuids,
    locale,
  );

  const timelineEntries = timelineEntriesUnsorted.sort((entry1: Timeline, entry2: Timeline) =>
    entry2.date.localeCompare(entry1.date),
  );

  return (
    <SectionWrapper
      block={block}
      sectionClassName={sectionClassName}
      sectionOverrides={sectionOverrides}
      errorFallbackMessage={errorMessageForType(
        {
          de: 'der Zeitstrahl-Eintrag',
          en: 'timeline entry',
          fr: "l'entrée de la chronologie",
        },
        locale,
      )}
      locale={locale}
    >
      {/* eslint-disable-next-line @typescript-eslint/no-unnecessary-condition */}
      {timelineEntries?.map((timelineEntry, index) => (
        <Fragment key={index}>
          <TimelineEntry timeline={timelineEntry} locale={locale} />
        </Fragment>
      ))}
    </SectionWrapper>
  );
};

export const AccordionBlock: SectionRenderer<AccordionBlocks> = async ({
  block,
  sectionClassName,
  sectionOverrides,
  locale,
}) => {
  const payload = await getPayload({ config });

  if (block.introduction) {
    await resolveRichTextLinks(block.introduction, payload, locale);
  }

  return (
    <SectionWrapper
      block={block}
      sectionClassName={sectionClassName}
      sectionOverrides={sectionOverrides}
      errorFallbackMessage={errorMessageForType(
        {
          de: 'Der Akkordeonblock',
          en: 'accordion block',
          fr: 'le bloc accordéon',
        },
        locale,
      )}
      locale={locale}
    >
      {block.introduction && (
        <LexicalRichTextSection richTextSection={block.introduction} locale={locale} />
      )}

      <div className="mt-4">
        <Accordion block={block} locale={locale} />
      </div>
    </SectionWrapper>
  );
};

export const SummaryBlock: SectionRenderer<LexicalRichTextSectionType> = async ({
  block,
  sectionClassName,
  sectionOverrides,
  locale,
}) => {
  const payload = await getPayload({ config });
  await resolveRichTextLinks(block.richTextSection, payload, locale);

  return (
    <SectionWrapper
      block={block}
      sectionClassName={sectionClassName}
      sectionOverrides={sectionOverrides}
      errorFallbackMessage={errorMessageForType(
        {
          de: 'Der Zusammenfassungsblock',
          en: 'summary block',
          fr: 'le bloc de résumé',
        },
        locale,
      )}
      locale={locale}
    >
      <div className="border-t-conveniat-green mx-0 my-8 border-t-[4px] bg-green-100 p-6 md:mx-12">
        <LexicalRichTextSection richTextSection={block.richTextSection} locale={locale} />
      </div>
    </SectionWrapper>
  );
};

export const DetailsTable: SectionRenderer<{
  introduction: SerializedEditorState;
  detailsTableBlocks: { label: string; value: SerializedEditorState }[];
}> = async ({ block, sectionClassName, sectionOverrides, locale }) => {
  const payload = await getPayload({ config });

  if (block.introduction) {
    await resolveRichTextLinks(block.introduction, payload, locale);
  }

  if (block.detailsTableBlocks) {
    await Promise.all(
      block.detailsTableBlocks.map((tableBlock) =>
        resolveRichTextLinks(tableBlock.value, payload, locale),
      ),
    );
  }
  return (
    <SectionWrapper
      block={block}
      sectionClassName={sectionClassName}
      sectionOverrides={sectionOverrides}
      errorFallbackMessage={errorMessageForType(
        {
          de: 'Die Detailtabelle',
          en: 'details table',
          fr: 'le tableau de détails',
        },
        locale,
      )}
      locale={locale}
    >
      <LexicalRichTextSection richTextSection={block.introduction} locale={locale} />

      <div className="mt-4">
        <hr className="border border-gray-100" />
        {/* eslint-disable-next-line @typescript-eslint/no-unnecessary-condition */}
        {block.detailsTableBlocks?.map((detailsTableEntry, index) => (
          <Fragment key={index}>
            <div className="grid gap-x-2 p-2 hyphens-auto md:grid-cols-[1fr_2fr]">
              <div className="text-conveniat-green my-2 font-semibold">
                {detailsTableEntry.label}
              </div>
              <LexicalRichTextSection richTextSection={detailsTableEntry.value} locale={locale} />
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
  locale,
}) => {
  return (
    <SectionWrapper
      block={block}
      sectionClassName={sectionClassName}
      sectionOverrides={sectionOverrides}
      errorFallbackMessage={errorMessageForType(
        {
          de: 'Die Swisstopo-Karte',
          en: 'Swisstopo inline map',
          fr: 'la carte Swisstopo intégrée',
        },
        locale,
      )}
      locale={locale}
    >
      <InlineSwisstopoMapEmbed {...block} />
    </SectionWrapper>
  );
};

export const RenderSinglePicture: SectionRenderer<{
  image: {
    url: string;
    sizes?: { large?: { url: string } };
    alt: string;
    imageCaption?: string;
  };
}> = ({ block, sectionClassName, sectionOverrides, locale }) => {
  return (
    <SectionWrapper
      block={block}
      sectionClassName={sectionClassName}
      sectionOverrides={sectionOverrides}
      errorFallbackMessage={errorMessageForType(
        {
          de: 'Das Einzelbild',
          en: 'single picture',
          fr: 'l’image unique',
        },
        locale,
      )}
      locale={locale}
    >
      <div className="text-conveniat-green relative mt-10 aspect-video w-[calc(100%+32px)] text-lg max-md:mx-[-16px]">
        {/* eslint-disable @typescript-eslint/no-unnecessary-condition */}
        <Image
          src={block.image?.sizes?.large?.url ?? block.image?.url}
          alt={(block.image?.alt as undefined | string) ?? 'copyright by conveniat27'}
          className="block rounded-2xl object-contain"
          fill
        />
        {/* eslint-enable @typescript-eslint/no-unnecessary-condition */}
      </div>
    </SectionWrapper>
  );
};

export const RenderYoutubeEmbed: SectionRenderer<YoutubeEmbedType> = ({
  block,
  sectionClassName,
  sectionOverrides,
  locale,
}) => {
  return (
    <SectionWrapper
      block={block}
      sectionClassName={sectionClassName}
      sectionOverrides={sectionOverrides}
      errorFallbackMessage={errorMessageForType(
        {
          de: 'Der YouTube-Link',
          en: 'YouTube link',
          fr: 'le lien YouTube',
        },
        locale,
      )}
      locale={locale}
    >
      <YoutubeEmbed links={block.links} />
    </SectionWrapper>
  );
};

export const RenderInstagramEmbed: SectionRenderer<InstagramEmbedType> = ({
  block,
  sectionClassName,
  sectionOverrides,
  locale,
}) => {
  return (
    <SectionWrapper
      block={block}
      sectionClassName={sectionClassName}
      sectionOverrides={sectionOverrides}
      errorFallbackMessage={errorMessageForType(
        {
          de: 'Der Instagram-Link',
          en: 'Instagram link',
          fr: 'le lien Instagram',
        },
        locale,
      )}
      locale={locale}
    >
      <InstagramEmbed link={block.link} locale={locale} />
    </SectionWrapper>
  );
};

export const RenderPhotoCarousel: SectionRenderer<PhotoCarouselBlock> = ({
  block,
  sectionClassName,
  sectionOverrides,
  locale,
}) => {
  return (
    <SectionWrapper
      block={block}
      sectionClassName={sectionClassName}
      sectionOverrides={sectionOverrides}
      errorFallbackMessage={errorMessageForType(
        {
          de: 'Das Fotokarussell',
          en: 'photo carousel',
          fr: 'le carrousel de photos',
        },
        locale,
      )}
      locale={locale}
    >
      <PhotoCarousel images={block.images} locale={locale} />
    </SectionWrapper>
  );
};

export const RenderFormBlock: SectionRenderer<FormBlockType> = ({
  block,
  sectionClassName,
  sectionOverrides,
  locale,
}) => {
  return (
    <SectionWrapper
      block={block}
      sectionClassName={sectionClassName}
      sectionOverrides={sectionOverrides}
      errorFallbackMessage={errorMessageForType(
        {
          de: 'der Formularblock',
          en: 'form block',
          fr: 'le bloc de formulaire',
        },
        locale,
      )}
      locale={locale}
    >
      <ShowForm {...block} withBorder />
    </SectionWrapper>
  );
};

export const RenderBlogPostsOverview: SectionRenderer = ({
  locale,
  block,
  sectionClassName,
  sectionOverrides,
}) => {
  return (
    <SectionWrapper
      block={block}
      sectionClassName={sectionClassName}
      sectionOverrides={sectionOverrides}
      errorFallbackMessage={errorMessageForType(
        {
          de: 'Die Blogbeitragsübersicht',
          en: 'blog posts overview',
          fr: 'l’aperçu des articles de blog',
        },
        locale,
      )}
      locale={locale}
    >
      <ListBlogPosts locale={locale} />
    </SectionWrapper>
  );
};

export const RenderRichTextSection: SectionRenderer<LexicalRichTextSectionType> = async ({
  block,
  sectionClassName,
  sectionOverrides,
  locale,
}) => {
  const payload = await getPayload({ config });
  await resolveRichTextLinks(block.richTextSection, payload, locale);

  return (
    <SectionWrapper
      block={block}
      sectionClassName={sectionClassName}
      sectionOverrides={sectionOverrides}
      errorFallbackMessage={errorMessageForType(
        {
          de: 'Der Rich-Text-Abschnitt',
          en: 'rich text section',
          fr: 'la section de texte enrichi',
        },
        locale,
      )}
      locale={locale}
    >
      <LexicalRichTextSection richTextSection={block.richTextSection} locale={locale} />
    </SectionWrapper>
  );
};

export const RenderFileDownload: SectionRenderer<FileDownloadType> = ({
  block,
  sectionClassName,
  sectionOverrides,
  locale,
}) => {
  return (
    <SectionWrapper
      block={block}
      sectionClassName={sectionClassName}
      sectionOverrides={sectionOverrides}
      errorFallbackMessage={errorMessageForType(
        {
          de: 'Der Datei-Download',
          en: 'file download',
          fr: 'le téléchargement de fichier',
        },
        locale,
      )}
      locale={locale}
    >
      <FileDownload {...block} locale={locale} />
    </SectionWrapper>
  );
};

export const RenderCountdown: SectionRenderer<CountdownType> = ({
  block,
  sectionClassName,
  sectionOverrides,
  locale,
}) => {
  return (
    <SectionWrapper
      block={block}
      sectionClassName={sectionClassName}
      sectionOverrides={sectionOverrides}
      errorFallbackMessage={errorMessageForType(
        {
          de: 'Der Countdown',
          en: 'countdown',
          fr: 'le compte à rebours',
        },
        locale,
      )}
      locale={locale}
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

export const RenderWhiteSpace: SectionRenderer = ({
  block,
  sectionClassName,
  sectionOverrides,
  locale,
}) => {
  return (
    <SectionWrapper
      block={block}
      sectionClassName={sectionClassName}
      sectionOverrides={sectionOverrides}
      errorFallbackMessage={errorMessageForType(
        {
          de: 'Der Leerraum',
          en: 'whitespace',
          fr: "l'espace vide",
        },
        locale,
      )}
      locale={locale}
    >
      <div className="h-3 w-full" />
    </SectionWrapper>
  );
};

export const RenderCallToAction: SectionRenderer<CallToActionType> = ({
  block,
  sectionClassName,
  sectionOverrides,
  locale,
}) => {
  return (
    <SectionWrapper
      block={block}
      sectionClassName={sectionClassName}
      sectionOverrides={sectionOverrides}
      errorFallbackMessage={errorMessageForType(
        {
          de: 'Der Call-To-Action Button',
          en: 'call-to-action button',
          fr: 'le bouton call-to-action',
        },
        locale,
      )}
      locale={locale}
    >
      <CallToActionBlock {...block} locale={locale} />
    </SectionWrapper>
  );
};

export const RenderNewsCard: SectionRenderer<NewsCardType> = ({
  block,
  sectionClassName,
  sectionOverrides,
  locale,
}) => {
  return (
    <SectionWrapper
      block={block}
      sectionClassName={sectionClassName}
      sectionOverrides={sectionOverrides}
      errorFallbackMessage={errorMessageForType(
        {
          de: 'Die News-Card',
          en: 'news-card',
          fr: 'la news-card',
        },
        locale,
      )}
      locale={locale}
    >
      <NewsCardBlock {...block} />
    </SectionWrapper>
  );
};

export const RenderCampScheduleEntry: SectionRenderer<CampScheduleEntryType> = ({
  block,
  sectionClassName,
  sectionOverrides,
  locale,
}) => {
  return (
    <SectionWrapper
      block={block}
      sectionClassName={sectionClassName}
      sectionOverrides={sectionOverrides}
      errorFallbackMessage={errorMessageForType(
        {
          de: 'Das Programm',
          en: 'program',
          fr: 'le programme',
        },
        locale,
      )}
      locale={locale}
    >
      <CampScheduleEntryContentBlock {...block} />
    </SectionWrapper>
  );
};
