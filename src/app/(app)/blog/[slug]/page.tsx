import config from '@payload-config';
import { ErrorBoundary } from 'react-error-boundary';
import { getPayload } from 'payload';
import React from 'react';
import { HeadlineH1 } from '@/components/typography/headline-h1';
import { LexicalPageContent } from '@/components/lexical-page-content';
import type { SerializedEditorState } from '@payloadcms/richtext-lexical/lexical';

interface BlogPostProperties {
  slug?: string;
}

const BlogPost: React.FC<BlogPostProperties> = async ({ slug }: BlogPostProperties) => {
  const payload = await getPayload({ config });

  const article_paged = await payload.find({
    collection: 'blog',
    limit: 1,
    where: {
      and: [{ urlSlug: { equals: slug } }],
    },
  });
  const article = article_paged.docs[0];
  if (article === undefined) throw new Error('Article not found');

  return (
    <article className="mx-auto my-8 max-w-6xl px-8">
      <HeadlineH1>{article.blogH1}</HeadlineH1>
      <LexicalPageContent pageContent={article.pageContent as SerializedEditorState} />

      <hr />
    </article>
  );
};

const Page: React.FC<{ params: Promise<{ slug: string }> }> = async ({ params }) => {
  const { slug } = await params;

  return (
    <ErrorBoundary fallback={<div>Something went wrong</div>}>
      <BlogPost slug={slug} />
    </ErrorBoundary>
  );
};

export default Page;
