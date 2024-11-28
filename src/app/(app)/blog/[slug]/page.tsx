import config from '@payload-config';
import { ErrorBoundary } from 'react-error-boundary';
import { getPayload } from 'payload';
import React from 'react';
import { HeadlineH1 } from '@/components/typography/headline-h1';

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

  // @ts-ignore
  const blog_de_CH = await payload.findByID({
    id: article.id,
    collection: 'blog',
    locale: 'de-CH',
    fallbackLocale: undefined,
    depth: 0,
  });

  // @ts-ignore
  const blog_fr_CH = await payload.findByID({
    id: article.id,
    collection: 'blog',
    locale: 'fr-CH',
    fallbackLocale: undefined,
    depth: 0,
  });

  // @ts-ignore
  const blog_en_US = await payload.findByID({
    collection: 'blog',
    id: article.id,
    locale: 'en-US',
    fallbackLocale: undefined,
    depth: 0,
  });

  return (
    <article className="mx-auto my-8 max-w-6xl px-8">
      {blog_de_CH._localized_status.published && <HeadlineH1>DE: {blog_de_CH.blogH1}</HeadlineH1>}

      {blog_fr_CH._localized_status.published && <HeadlineH1>FR: {blog_fr_CH.blogH1}</HeadlineH1>}

      {blog_en_US._localized_status.published && <HeadlineH1>EN: {blog_en_US.blogH1}</HeadlineH1>}
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
