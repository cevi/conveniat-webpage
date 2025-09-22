import { HeadlineH1 } from '@/components/ui/typography/headline-h1';
import { PageSectionsConverter } from '@/features/payload-cms/converters/page-sections';
import type { ContentBlock } from '@/features/payload-cms/converters/page-sections/section-wrapper';
import type { GenericPage } from '@/features/payload-cms/payload-types';
import type { Locale } from '@/types/types';
import React from 'react';

export const GenericPageConverter: React.FC<{
  page: GenericPage;
  locale: Locale;
}> = ({ page, locale }) => {
  return (
    <>
      <article className="my-8 w-full max-w-2xl px-8 max-xl:mx-auto">
        <HeadlineH1>{page.content.pageTitle}</HeadlineH1>
        <PageSectionsConverter
          blocks={page.content.mainContent as ContentBlock[]}
          locale={locale}
        />
      </article>
    </>
  );
};
