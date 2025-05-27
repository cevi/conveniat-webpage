import { HeadlineH1 } from '@/components/ui/typography/headline-h1';
import { TimelineEntry } from '@/features/payload-cms/components/content-blocks/timeline-entry';
import type { Timeline } from '@/features/payload-cms/payload-types';
import type { LocalizedCollectionPage, StaticTranslationString } from '@/types/types';
import config from '@payload-config';
import { notFound } from 'next/navigation';
import { getPayload } from 'payload';
import React from 'react';

const pageTitle: StaticTranslationString = {
  en: 'Preview of a timeline entry',
  de: 'Vorschau eines Zeitstrahl-Eintrags',
  fr: 'Aperçu d’une entrée de la chronologie',
};

export const TimelinePreviewPage: React.FC<LocalizedCollectionPage> = async ({
  slugs,
  locale,
  searchParams,
  renderInPreviewMode,
}) => {
  // we use this page only for a preview of the news entry
  if (!renderInPreviewMode) notFound();
  if (slugs.length === 0) return notFound();

  const uuid = slugs[0];
  const payload = await getPayload({ config });
  const timeLineItems = await payload.find({
    collection: 'timeline',
    locale: locale,
    pagination: false,
    sort: '-date',
    draft: renderInPreviewMode,
    where: {
      id: { equals: uuid },
    },
  });

  return (
    <article className="mx-auto my-8 max-w-2xl px-8">
      <HeadlineH1>{pageTitle[locale]}</HeadlineH1>
      {timeLineItems.docs.map((item: Timeline) => {
        return (
          <React.Fragment key={item.id}>
            <TimelineEntry timeline={item} searchParams={searchParams} locale={locale} />
          </React.Fragment>
        );
      })}
    </article>
  );
};
