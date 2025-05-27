import { NewsCard } from '@/components/news-card';
import type { RichTextSection } from '@/features/payload-cms/payload-cms/utils/extract-rich-text-content';
import { extractRichTextContent } from '@/features/payload-cms/payload-cms/utils/extract-rich-text-content';
import type { GenericPage } from '@/features/payload-cms/payload-types';
import Link from 'next/link';
import React from 'react';

interface ContentBlock {
  blockType: string;
  richTextSection?: RichTextSection;
}

export const PageDisplay: React.FC<{ page: GenericPage }> = ({ page }) => {
  const contentExcerpt = extractRichTextContent(page.content.mainContent as ContentBlock[]);
  const contentExcerptTrimmed =
    contentExcerpt.length > 150 ? contentExcerpt.slice(0, 150) + '...' : contentExcerpt;
  return (
    <React.Fragment key={page.seo.urlSlug}>
      <Link href={`/${page.seo.urlSlug}`} key={page.id}>
        <NewsCard date={page.content.releaseDate} headline={page.content.pageTitle}>
          <p className="text-sm text-gray-500">{contentExcerptTrimmed}</p>
        </NewsCard>
      </Link>
    </React.Fragment>
  );
};
