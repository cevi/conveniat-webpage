import { Blog } from '@/payload-types';
import { HeadlineH1 } from '@/components/typography/headline-h1';
import React from 'react';
import Image from 'next/image';
import { PageSectionsConverter, ContentBlock } from 'src/converters/page-sections';
import { Locale, SearchParameters } from '@/types';

export const BlogArticleConverter: React.FC<{
  article: Blog;
  locale: Locale;
  searchParams: SearchParameters;
}> = ({ article, locale, searchParams }) => {
  if (typeof article.content.bannerImage === 'string') {
    throw new TypeError(
      'Expected bannerImage to be an object, you may got the ID instead of the object',
    );
  }

  const source = article.content.bannerImage.url ?? '/images/placeholder.png';
  const altText = article.content.bannerImage.alt;
  return (
    <>
      <article className="mx-auto my-8 max-w-2xl px-8">
        <div className="relative h-56 w-full">
          <Image src={source} alt={altText} fill={true} style={{ objectFit: 'contain' }} />
        </div>

        <HeadlineH1>{article.content.blogH1}</HeadlineH1>
        <PageSectionsConverter
          blocks={article.content.mainContent as ContentBlock[]}
          locale={locale}
          searchParams={searchParams}
        />
      </article>
    </>
  );
};
