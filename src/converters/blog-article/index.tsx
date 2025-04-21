import type { Blog } from '@/payload-types';
import { HeadlineH1 } from '@/components/typography/headline-h1';
import React from 'react';
import Image from 'next/image';
import { PageSectionsConverter } from 'src/converters/page-sections';
import type { Locale, SearchParameters } from '@/types';
import type { ContentBlock } from '@/converters/page-sections/section-wrapper';

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
        <HeadlineH1>{article.content.blogH1}</HeadlineH1>

        <div className="relative mt-10 aspect-[16/9] w-full text-lg text-conveniat-green">
          <Image src={source} alt={altText} className="block rounded-2xl object-cover" fill />
        </div>

        <PageSectionsConverter
          blocks={article.content.mainContent as ContentBlock[]}
          locale={locale}
          searchParams={searchParams}
        />
      </article>
    </>
  );
};
