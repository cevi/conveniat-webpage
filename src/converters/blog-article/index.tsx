import { Blog } from '@/payload-types';
import { HeadlineH1 } from '@/components/typography/headline-h1';
import { LexicalPageContent } from '@/components/content-blocks/lexical-page-content';
import type { SerializedEditorState } from '@payloadcms/richtext-lexical/lexical';
import React from 'react';
import Image from 'next/image';

export const BlogArticle: React.FC<{ article: Blog }> = ({ page }) => {
  if (typeof page.content.bannerImage === 'string') {
    throw new TypeError(
      'Expected bannerImage to be an object, you may got the ID instead of the object',
    );
  }

  const source = page.content.bannerImage.url ?? '/images/placeholder.png';
  const altText = page.content.bannerImage.alt;

  return (
    <>
      <article className="mx-auto my-8 max-w-5xl px-8">
        <div className="relative h-56 w-full">
          <Image objectFit="contain" layout="fill" src={source} alt={altText} fill={true} />
        </div>

        <HeadlineH1>{page.content.blogH1}</HeadlineH1>
        <LexicalPageContent pageContent={page.content.pageContent as SerializedEditorState} />
      </article>
    </>
  );
};
