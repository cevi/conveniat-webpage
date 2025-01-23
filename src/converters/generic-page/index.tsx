import { GenericPage } from '@/payload-types';
import { HeadlineH1 } from '@/components/typography/headline-h1';
import React from 'react';
import { BuildingBlocks, ContentBlock } from '@/converters/building-blocks';
import { Locale, SearchParameters } from '@/types';

export const GenericPageConverter: React.FC<{
  page: GenericPage;
  locale: Locale;
  searchParams: SearchParameters;
}> = ({ page, locale, searchParams }) => {
  return (
    <>
      <article className="mx-auto my-8 max-w-2xl px-8">
        <HeadlineH1>{page.content.pageTitle}</HeadlineH1>
        <BuildingBlocks
          blocks={page.content.mainContent as ContentBlock[]}
          locale={locale}
          searchParams={searchParams}
        />
      </article>
    </>
  );
};
