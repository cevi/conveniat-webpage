import { HeadlineH1 } from '@/components/ui/typography/headline-h1';
import { TimelineEntry } from '@/features/payload-cms/components/content-blocks/timeline-entry';
import type { Timeline } from '@/features/payload-cms/payload-types';
import type { LocalizedCollectionPage, StaticTranslationString } from '@/types/types';
import config from '@payload-config';
import { getPayload } from 'payload';
import React from 'react';

const pageTitle: StaticTranslationString = {
  en: 'Timeline',
  de: 'Zeitstrahl',
  fr: 'Chronologie',
};

export const TimeLinePage: React.FC<LocalizedCollectionPage> = async ({
  locale,
  searchParams,
  renderInPreviewMode,
}) => {
  const payload = await getPayload({ config });
  const timeLineItems = await payload.find({
    collection: 'timeline',
    locale: locale,
    pagination: false,
    sort: '-date',
    draft: renderInPreviewMode,
    where: {
      _localized_status: {
        equals: {
          published: true,
        },
      },
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
