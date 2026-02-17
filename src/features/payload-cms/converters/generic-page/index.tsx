import { HeadlineH1 } from '@/components/ui/typography/headline-h1';
import { PageSectionsConverter } from '@/features/payload-cms/converters/page-sections';
import type { ContentBlock } from '@/features/payload-cms/converters/page-sections/section-wrapper';
import type { GenericPage } from '@/features/payload-cms/payload-types';
import type { Locale } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import React from 'react';

export const GenericPageConverter: React.FC<{
  page: GenericPage;
  locale: Locale;
}> = ({ page, locale }) => {
  const hasForm =
    Array.isArray(page.content.mainContent) &&
    page.content.mainContent.some((block) => block.blockType === 'formBlock');

  return (
    <>
      <article
        className={cn(
          'my-8 w-full px-8 max-xl:mx-auto',
          hasForm ? 'mx-auto max-w-screen-2xl' : 'max-w-2xl',
        )}
      >
        <HeadlineH1>{page.content.pageTitle}</HeadlineH1>
        <PageSectionsConverter
          blocks={page.content.mainContent as ContentBlock[]}
          locale={locale}
        />
      </article>
    </>
  );
};
