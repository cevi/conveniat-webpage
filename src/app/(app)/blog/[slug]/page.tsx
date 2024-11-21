import { getPayload } from 'payload';
import { ErrorBoundary } from 'react-error-boundary';
import config from '@payload-config';

import { JSX } from 'react';

interface BlogPostProps {
  slug?: string;
}

async function BlogPost({ slug }: BlogPostProps): Promise<JSX.Element> {
  const payload = await getPayload({ config });

  const article_paged = await payload.find({
    collection: 'blog',
    limit: 1,
    where: {
      and: [{ urlSlug: { equals: slug } }],
    },
  });
  const article = article_paged.docs[0];

  if (!article) {
    throw new Error('Article not found');
  }

  const blog_de_CH = await payload.findByID({
    id: article.id,
    collection: 'blog',
    locale: 'de-CH',
    fallbackLocale: false,
    depth: 0,
  });

  const blog_fr_CH = await payload.findByID({
    id: article.id,
    collection: 'blog',
    locale: 'fr-CH',
    fallbackLocale: false,
    depth: 0,
  });

  const blog_en_US = await payload.findByID({
    collection: 'blog',
    id: article.id,
    locale: 'en-US',
    fallbackLocale: false,
    depth: 0,
  });

  return (
    <article className="mx-auto max-w-6xl px-4 py-8">
      {blog_de_CH._localized_status.published && (
        <div className="rounded-full bg-amber-500 px-3 py-1 text-xs font-semibold text-amber-950">
          DE: {blog_de_CH.blogH1}
        </div>
      )}

      {blog_fr_CH._localized_status.published && (
        <div className="rounded-full bg-amber-500 px-3 py-1 text-xs font-semibold text-amber-950">
          FR: {blog_fr_CH.blogH1}
        </div>
      )}

      {blog_en_US._localized_status.published && (
        <div className="rounded-full bg-amber-500 px-3 py-1 text-xs font-semibold text-amber-950">
          EN: {blog_en_US.blogH1}
        </div>
      )}
    </article>
  );
}

const Page = ({ params }: { params: { slug: string } }): JSX.Element => {
  const { slug } = params;

  return (
    <ErrorBoundary fallback={<div>Something went wrong</div>}>
      <BlogPost slug={slug} />
    </ErrorBoundary>
  );
};

export default Page;
