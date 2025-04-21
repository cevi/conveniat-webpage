import type { GenericPage } from '@/payload-types';
import { HeadlineH1 } from '@/components/typography/headline-h1';
import React from 'react';
import { PageSectionsConverter } from 'src/converters/page-sections';
import type { Locale, SearchParameters } from '@/types';
import type { ContentBlock } from '@/converters/page-sections/section-wrapper';

export const GenericPageConverter: React.FC<{
  page: GenericPage;
  locale: Locale;
  searchParams: SearchParameters;
}> = ({ page, locale, searchParams }) => {
  return (
    <>
      <article className="mx-auto my-8 max-w-2xl px-8">
        <HeadlineH1>{page.content.pageTitle}</HeadlineH1>
        <PageSectionsConverter
          blocks={page.content.mainContent as ContentBlock[]}
          locale={locale}
          searchParams={searchParams}
        />
      </article>
    </>
  );
};
