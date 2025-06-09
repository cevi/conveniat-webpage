import { NewsCard } from '@/components/news-card';
import { LinkComponent } from '@/components/ui/link-component';
import type { ContentBlock } from '@/features/payload-cms/converters/page-sections/section-wrapper';
import { extractTextContent } from '@/features/payload-cms/payload-cms/utils/extract-rich-text';
import type { GenericPage } from '@/features/payload-cms/payload-types';
import React from 'react';

export const PageDisplay: React.FC<{ page: GenericPage }> = ({ page }) => {
  const contentExcerpt = extractTextContent(page.content.mainContent as ContentBlock[]);
  const contentExcerptTrimmed =
    contentExcerpt.length > 150 ? contentExcerpt.slice(0, 150) + '...' : contentExcerpt;
  return (
    <React.Fragment key={page.seo.urlSlug}>
      <LinkComponent href={`/${page.seo.urlSlug}`} key={page.id}>
        <NewsCard date={page.content.releaseDate} headline={page.content.pageTitle}>
          <p className="text-sm text-gray-500">{contentExcerptTrimmed}</p>
        </NewsCard>
      </LinkComponent>
    </React.Fragment>
  );
};
