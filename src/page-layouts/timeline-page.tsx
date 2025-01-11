import React from 'react';
import { LocalizedCollectionPage } from './localized-page';
import { getPayload } from 'payload';
import config from '@payload-config';
import { HeadlineH1 } from '@/components/typography/headline-h1';
import { Locale } from '@/middleware';
import { BuildingBlocks, ContentBlock } from '@/converters/building-blocks';

export const TimeLinePage: React.FC<LocalizedCollectionPage> = async ({ locale, searchParams }) => {
  const payload = await getPayload({ config });
  const timeLineItems = await payload.find({
    collection: 'timeline',
    locale: locale,
    pagination: false,
    where: {
      _localized_status: {
        equals: {
          published: true,
        },
      },
    },
  });

  const pageTitle: Record<Locale, string> = {
    en: 'Timeline',
    de: 'Zeitstrahl',
    fr: 'Chronologie',
  };

  return (
    <article className="mx-auto my-8 max-w-2xl px-8">
      <HeadlineH1>{pageTitle[locale]}</HeadlineH1>

      <ul>
        {timeLineItems.docs.map((item) => (
          <li key={item.date}>
            <h2>
              {item.date} {item.blogH1}
            </h2>
            <BuildingBlocks
              blocks={item.mainContent as ContentBlock[]}
              locale={locale}
              searchParams={searchParams}
            />
          </li>
        ))}
      </ul>
    </article>
  );

  return (
    <>
      <p>a</p>
    </>
  );
};
