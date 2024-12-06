import { HeadlineH1 } from '@/components/typography/headline-h1';
import React from 'react';
import { getPayload } from 'payload';
import config from '@payload-config';
import { mapLocale } from '@/utils/map-locale';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { BlogArticle } from '@/content-pages/blog-posts/article';

export const BlogPostPage: React.FC<{
  slug: string;
  locale: 'de' | 'en' | 'fr';
}> = async ({ slug, locale }) => {
  const payload = await getPayload({ config });

  const articlesInPrimaryLanguage = await payload.find({
    collection: 'blog',
    pagination: false,
    locale: mapLocale(locale),
    fallbackLocale: false,
    where: {
      and: [{ urlSlug: { equals: slug } }, { _localized_status: { equals: { published: true } } }],
    },
  });

  if (articlesInPrimaryLanguage.docs.length > 1)
    throw new Error('More than one article with the same slug found');

  const articleInPrimaryLanguage = articlesInPrimaryLanguage.docs[0];

  // article found in current locale --> render
  if (articleInPrimaryLanguage !== undefined) {
    return <BlogArticle article={articleInPrimaryLanguage} />;
  }

  // fallback logic to find article in other locales
  const locales: ('de-CH' | 'fr-CH' | 'en-GB')[] = ['de-CH', 'fr-CH', 'en-GB'].filter(
    (l) => l !== mapLocale(locale),
  ) as ('de-CH' | 'fr-CH' | 'en-GB')[];

  const articles = await Promise.all(
    locales.map((l) =>
      payload.find({
        collection: 'blog',
        pagination: false,
        locale: l,
        where: {
          and: [
            { urlSlug: { equals: slug } },
            { _localized_status: { equals: { published: true } } },
          ],
        },
      }),
    ),
  ).then((results) =>
    results
      .filter((r) => r.docs.length === 1)
      .flatMap((r) => r.docs[0])
      .filter((a) => a !== undefined),
  );

  // no article found --> 404
  if (articles.length === 0) {
    notFound();
  }

  // list options for user to choose from
  return (
    <article className="mx-auto my-8 max-w-6xl px-8">
      <HeadlineH1>Choose the correct article</HeadlineH1>
      <ul>
        {articles.map((article) => (
          <li key={article.id}>
            <Link
              href={`/${article._locale.split('-')[0]}/blog/${article.urlSlug}`}
              className="font-bold text-red-600"
            >
              - {article.blogH1} in {article._locale}
            </Link>
          </li>
        ))}
      </ul>
    </article>
  );
};
