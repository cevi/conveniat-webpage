import React from 'react';
import { getPayload } from 'payload';
import config from '@payload-config';
import { HeadlineH1 } from '@/components/typography/headline-h1';
import { PageSectionsConverter, ContentBlock } from 'src/converters/page-sections';
import { LocalizedCollectionPage, StaticTranslationString } from '@/types';
import { SubheadingH2 } from '@/components/typography/subheading-h2';
import { ParagraphText } from '@/components/typography/paragraph-text';

const pageTitle: StaticTranslationString = {
  en: 'Timeline',
  de: 'Zeitstrahl',
  fr: 'Chronologie',
};

export const TimeLinePage: React.FC<LocalizedCollectionPage> = async ({ locale, searchParams }) => {
  const payload = await getPayload({ config });
  const timeLineItems = await payload.find({
    collection: 'timeline',
    locale: locale,
    pagination: false,
    sort: '-date',
    where: {
      _localized_status: {
        equals: {
          published: true,
        },
      },
    },
  });

  const convertDate = (date: string) => {
    // i want dd month yyyy, hh:mm Uhr
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'long',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    };
    return new Date(date).toLocaleDateString(locale, options);
  };

  return (
    <article className="mx-auto my-8 max-w-2xl px-8">
      <HeadlineH1>{pageTitle[locale]}</HeadlineH1>
      {timeLineItems.docs.map((item) => {
        return (
        <div key={item.date}>
          <ParagraphText className="my-0">{convertDate(item.date)}</ParagraphText>
          <div className="border-l-green-100 border-l-4 p-4 m-2">
            <SubheadingH2 className='m-0'>{item.title}</SubheadingH2>

            <PageSectionsConverter
              blocks={item.mainContent as ContentBlock[]}
              locale={locale}
              searchParams={searchParams}
            />
          </div>
        </div>
      )})}
    </article>
  );
};
