import config from '@payload-config';
import { ErrorBoundary } from 'react-error-boundary';
import { getPayload } from 'payload';
import React from 'react';
import { HeadlineH1 } from '@/components/typography/headline-h1';
import { LexicalPageContent } from '@/components/lexical-page-content';
import type { SerializedEditorState } from '@payloadcms/richtext-lexical/lexical';
import { Blog } from '@/payload-types';
import Link from 'next/link';
import { notFound } from 'next/navigation';

export type LocalizedBlogPost = {
  slug: string;
  locale: 'de' | 'en' | 'fr';
};

const mapLocale = (locale: 'de' | 'en' | 'fr'): 'de-CH' | 'fr-CH' | 'en-GB' => {
  switch (locale) {
    case 'de': {
      return 'de-CH';
    }
    case 'en': {
      return 'en-GB';
    }
    case 'fr': {
      return 'fr-CH';
    }
  }
};

const BlogArticle: React.FC<{ primaryArticle: Blog }> = ({ primaryArticle }) => {
  return (
    <article className="mx-auto my-8 max-w-6xl px-8">
      <HeadlineH1>{primaryArticle.blogH1}</HeadlineH1>
      <LexicalPageContent pageContent={primaryArticle.pageContent as SerializedEditorState} />
    </article>
  );
};

const BlogPost: React.FC<LocalizedBlogPost> = async ({ slug, locale }) => {
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
    return <BlogArticle primaryArticle={articleInPrimaryLanguage} />;
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

const Page: React.FC<{ params: Promise<{ slug: string; locale: 'de' | 'en' | 'fr' }> }> = async ({
  params,
}) => {
  const { slug, locale } = await params;

  return (
    <ErrorBoundary fallback={<div>Something went wrong</div>}>
      <BlogPost slug={slug} locale={locale} />
    </ErrorBoundary>
  );
};

export default Page;
export const dynamic = 'force-dynamic';
