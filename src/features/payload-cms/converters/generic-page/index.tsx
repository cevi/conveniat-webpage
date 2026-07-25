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
  renderInPreviewMode?: boolean;
}> = ({ page, locale, renderInPreviewMode = false }) => {
  const mainContent = page.content.mainContent;
  const hasHeroSection =
    Array.isArray(mainContent) &&
    mainContent.some((block) => (block as { blockType?: string }).blockType === 'heroSection');

  return (
    <>
      <article className={cn('w-full', hasHeroSection ? 'mb-8' : 'my-8')}>
        {!hasHeroSection && (
          <div className="mx-auto w-full max-w-[1920px] px-4 md:px-8 xl:px-16">
            <HeadlineH1>{page.content.pageTitle}</HeadlineH1>
          </div>
        )}
        <PageSectionsConverter
          blocks={mainContent as ContentBlock[]}
          locale={locale}
          renderInPreviewMode={renderInPreviewMode}
        />
      </article>
    </>
  );
};
