import { NewsCardBlock } from '@/components/news-card';
import type { ContentBlock } from '@/features/payload-cms/converters/page-sections/section-wrapper';
import type { LinkFieldDataType } from '@/features/payload-cms/payload-cms/shared-fields/link-field';
import { extractTextContent } from '@/features/payload-cms/payload-cms/utils/extract-rich-text';
import type { GenericPage } from '@/features/payload-cms/payload-types';
import type { Locale } from '@/types/types';
import React from 'react';

export const PageDisplay: React.FC<{ locale: Locale; page: GenericPage }> = ({ locale, page }) => {
  const contentExcerpt = extractTextContent(page.content.mainContent as ContentBlock[]);
  const contentExcerptTrimmed =
    contentExcerpt.length > 150 ? contentExcerpt.slice(0, 150) + '...' : contentExcerpt;

  const linkField: LinkFieldDataType = {
    type: 'reference',
    reference: {
      relationTo: 'generic-page',
      value: page,
    },
  };

  return (
    <React.Fragment key={page.seo.urlSlug}>
      <NewsCardBlock
        date={page.content.releaseDate}
        headline={page.content.pageTitle}
        linkField={linkField}
        locale={locale}
      >
        <p className="text-sm text-gray-500">{contentExcerptTrimmed}</p>
      </NewsCardBlock>
    </React.Fragment>
  );
};
