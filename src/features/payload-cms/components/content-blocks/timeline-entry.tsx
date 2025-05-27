import { SubheadingH2 } from '@/components/ui/typography/subheading-h2';
import { PageSectionsConverter } from '@/features/payload-cms/converters/page-sections';
import type { ContentBlock } from '@/features/payload-cms/converters/page-sections/section-wrapper';
import type { Timeline } from '@/features/payload-cms/payload-types';
import type { Locale, SearchParameters } from '@/types/types';
import React from 'react';

export const TimelineEntry: React.FC<{
  timeline: Timeline;
  locale: Locale;
  searchParams: SearchParameters;
}> = ({ timeline, locale, searchParams }) => {
  const convertDate = (date: string, format: Timeline['dateFormat']): string => {
    switch (format) {
      case 'fullDateAndTime': {
        return new Date(date).toLocaleString(locale, {
          year: 'numeric',
          month: 'long',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        });
      }
      case 'fullDate': {
        return new Date(date).toLocaleDateString(locale, {
          year: 'numeric',
          month: 'long',
          day: '2-digit',
        });
      }

      // including 'yearAndMonth'
      default: {
        return new Date(date).toLocaleDateString(locale, {
          year: 'numeric',
          month: 'long',
        });
      }
    }
  };

  return (
    <div>
      <div className="mb-[-14px] mt-[-6px] flex items-center">
        <div className="mx-[6px] mr-2 h-2 w-2 rounded-full bg-gray-500"></div>
        <span className="my-2 ml-[6px] max-w-2xl text-left font-body text-xs font-bold text-gray-500">
          {convertDate(timeline.date, timeline.dateFormat)}
        </span>
      </div>
      <div className="m-2 mb-0 border-l-4 border-l-green-100 p-4">
        <SubheadingH2 className="text-md m-0 mt-[-8]">{timeline.title}</SubheadingH2>

        <PageSectionsConverter
          blocks={timeline.mainContent as unknown as ContentBlock[]}
          locale={locale}
          searchParams={searchParams}
          sectionClassName="mt-2"
          sectionOverrides={{
            photoCarousel: 'lg:mx-[60px]',
            instagramEmbed: 'first:my-6 flex',
          }}
        />
      </div>
    </div>
  );
};
