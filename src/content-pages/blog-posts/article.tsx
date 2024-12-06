import { Blog } from '@/payload-types';
import { HeadlineH1 } from '@/components/typography/headline-h1';
import { LexicalPageContent } from '@/components/lexical-page-content';
import type { SerializedEditorState } from '@payloadcms/richtext-lexical/lexical';
import React from 'react';

export const BlogArticle: React.FC<{ article: Blog }> = ({ article }) => {
  return (
    <article className="mx-auto my-8 max-w-6xl px-8">
      <HeadlineH1>{article.blogH1}</HeadlineH1>
      <LexicalPageContent pageContent={article.pageContent as SerializedEditorState} />
    </article>
  );
};
