import React from 'react';
import { LocalizedCollectionPage } from './localized-page';
import { getPayload } from 'payload';
import config from '@payload-config';
import { HeadlineH1 } from '@/components/typography/headline-h1';
import { Locale } from '@/middleware';
import { BuildingBlocks, ContentBlock } from '@/converters/building-blocks';

const isActive = (date: string) => {
  // if date is in the past, return 'is-active', else return ''
  return new Date(date) < new Date() ? 'is-active' : '';
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

  const pageTitle: Record<Locale, string> = {
    en: 'Timeline',
    de: 'Zeitstrahl',
    fr: 'Chronologie',
  };

  const convertDate = (date: string) => {
    // i want dd.mm.yyyy
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    };
    return new Date(date).toLocaleDateString(locale, options);
  };

  return (
    <article className="mx-auto my-8 max-w-2xl px-8">
      <HeadlineH1>{pageTitle[locale]}</HeadlineH1>

      <div className="before:from-transparent before:via-slate-300 before:to-transparent relative space-y-8 before:absolute before:inset-0 before:ml-5 before:h-full before:w-0.5 before:-translate-x-px before:bg-gradient-to-b md:before:mx-auto md:before:translate-x-0">
        {timeLineItems.docs.map((item) => (
          <div
            key={item.date}
            className={`group relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse ${isActive(item.date)}`}
          >
            <div className="bg-slate-300 group-[.is-active]:bg-emerald-500 text-slate-500 group-[.is-active]:text-emerald-50 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white shadow md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
              {isActive(item.date) ? (
                <svg
                  className="fill-current"
                  xmlns="http://www.w3.org/2000/svg"
                  width="12"
                  height="12"
                >
                  <path
                    fillRule="nonzero"
                    d="M10.422 1.257 4.655 7.025 2.553 4.923A.916.916 0 0 0 1.257 6.22l2.75 2.75a.916.916 0 0 0 1.296 0l6.415-6.416a.916.916 0 0 0-1.296-1.296Z"
                  />
                </svg>
              ) : (
                <svg
                  className="fill-current"
                  xmlns="http://www.w3.org/2000/svg"
                  width="12"
                  height="12"
                >
                  <path
                    fillRule="nonzero"
                    d="M1 1l10 10M11 1L1 11"
                    stroke="currentColor"
                    strokeWidth="1"
                    strokeLinecap="round"
                  />
                </svg>
              )}
            </div>

            <div className="border-slate-200 w-[calc(100%-4rem)] rounded border bg-white p-4 shadow md:w-[calc(50%-2.5rem)]">
              <div className="mb-1 flex items-center justify-between space-x-2">
                <div className="text-slate-900 font-bold">{item.title}</div>
                <time className="font-caveat text-indigo-500 font-medium">
                  {convertDate(item.date)}
                </time>
              </div>
              <div className="text-slate-500">
                <BuildingBlocks
                  blocks={item.mainContent as ContentBlock[]}
                  locale={locale}
                  searchParams={searchParams}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </article>
  );
};
