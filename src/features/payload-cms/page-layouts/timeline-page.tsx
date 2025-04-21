import React from 'react';
import { getPayload } from 'payload';
import config from '@payload-config';
import { HeadlineH1 } from '@/components/typography/headline-h1';
import { PageSectionsConverter } from '@/features/payload-cms/converters/page-sections';
import type { LocalizedCollectionPage, StaticTranslationString } from '@/types/types';
import { SubheadingH2 } from '@/components/typography/subheading-h2';
import type { ContentBlock } from '@/features/payload-cms/converters/page-sections/section-wrapper';

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

  const convertDate = (date: string): string => {
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
            <div className="mb-[-14px] mt-[-6px] flex items-center">
              <div className="mx-[6px] mr-2 h-2 w-2 rounded-full bg-gray-500"></div>
              <span className="my-2 ml-[6px] max-w-2xl text-left font-body text-xs font-bold text-gray-500">
                {convertDate(item.date)}
              </span>
            </div>
            <div className="m-2 mb-0 border-l-4 border-l-green-100 p-4">
              <SubheadingH2 className="text-md m-0 mt-[-8]">{item.title}</SubheadingH2>

              <PageSectionsConverter
                blocks={item.mainContent as unknown as ContentBlock[]}
                locale={locale}
                searchParams={searchParams}
                sectionClassName="mt-2"
                sectionOverrides={{ photoCarousel: 'lg:mx-[60px]' }}
              />
            </div>
          </div>
        );
      })}
    </article>
  );
};
