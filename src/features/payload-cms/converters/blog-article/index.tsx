import { HeadlineH1 } from '@/components/ui/typography/headline-h1';
import { PageSectionsConverter } from '@/features/payload-cms/converters/page-sections';
import type { ContentBlock } from '@/features/payload-cms/converters/page-sections/section-wrapper';
import { getImageAltInLocale } from '@/features/payload-cms/payload-cms/utils/images-meta-fields';
import type { Blog } from '@/features/payload-cms/payload-types';
import type { Locale } from '@/types/types';
import { formatBlogDate } from '@/utils/format-blog-date';
import Image from 'next/image';
import React from 'react';

export const BlogArticleConverter: React.FC<{
  article: Blog;
  locale: Locale;
}> = ({ article, locale }) => {
  if (typeof article.content.bannerImage === 'string') {
    throw new TypeError(
      'Expected bannerImage to be an object, you may got the ID instead of the object',
    );
  }

  const source = article.content.bannerImage.sizes?.large?.url ?? '';
  const altText = getImageAltInLocale(locale, article.content.bannerImage);
  const formattedDate = formatBlogDate(article.content.releaseDate, locale);

  return (
    <>
      <article className="my-8 w-full max-w-2xl px-8 max-xl:mx-auto">
        {/* Banner image with 2:1 aspect ratio */}
        <div className="text-conveniat-green relative mt-10 aspect-[2/1] w-full text-lg">
          <Image
            src={source}
            alt={altText}
            className="block rounded-2xl object-cover"
            fill
            priority
          />
        </div>

        {/* Release date */}
        <div className="flex items-center gap-2 pt-2">
          <div className="h-5 w-1 bg-gray-100"></div>
          <div className="text-sm text-gray-500">{formattedDate}</div>
        </div>

        {/* Article title */}
        <HeadlineH1>{article.content.blogH1}</HeadlineH1>

        <PageSectionsConverter
          blocks={article.content.mainContent as ContentBlock[]}
          locale={locale}
        />
      </article>
    </>
  );
};
