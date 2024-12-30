import { Blog } from '@/payload-types';
import { HeadlineH1 } from '@/components/typography/headline-h1';
import React from 'react';
import Image from 'next/image';
import { BuildingBlocks, ContentBlock } from '@/converters/building-blocks';
import { Locale } from '@/middleware';

export const BlogArticle: React.FC<{ article: Blog; locale: Locale }> = ({ article, locale }) => {
  if (typeof article.content.bannerImage === 'string') {
    throw new TypeError(
      'Expected bannerImage to be an object, you may got the ID instead of the object',
    );
  }

  const source = article.content.bannerImage.url ?? '/images/placeholder.png';
  const altText = article.content.bannerImage.alt;

  return (
    <>
      <article className="mx-auto my-8 max-w-5xl px-8">
        <div className="relative h-56 w-full">
          <Image objectFit="contain" layout="fill" src={source} alt={altText} fill={true} />
        </div>

        <HeadlineH1>{article.content.blogH1}</HeadlineH1>
        <BuildingBlocks blocks={article.content.mainContent as ContentBlock[]} locale={locale} />
      </article>
    </>
  );
};
