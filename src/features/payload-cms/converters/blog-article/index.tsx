import { HeadlineH1 } from '@/components/ui/typography/headline-h1';
import { PageSectionsConverter } from '@/features/payload-cms/converters/page-sections';
import type { ContentBlock } from '@/features/payload-cms/converters/page-sections/section-wrapper';
import type { Blog, Image as PayloadImage } from '@/features/payload-cms/payload-types';
import type { Locale, SearchParameters } from '@/types/types';
import Image from 'next/image';
import React from 'react';

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

  if ((article.content.bannerImage as PayloadImage | undefined) === undefined) {
    article.content.bannerImage = {
      ...article.content.bannerImage,
      url: '/admin-block-images/single-picture-block.png',
      alt: 'Placeholder image',
    };
  }

  const source = article.content.bannerImage.sizes?.large?.url ?? '';
  const altText = article.content.bannerImage.alt;
  return (
    <>
      <article className="my-8 w-full max-w-2xl px-8 max-xl:mx-auto">
        <HeadlineH1>{article.content.blogH1}</HeadlineH1>

        <div className="text-conveniat-green relative mt-10 aspect-[16/9] w-full text-lg">
          <Image
            src={source}
            alt={altText}
            className="block rounded-2xl object-cover"
            fill
            priority
          />
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
