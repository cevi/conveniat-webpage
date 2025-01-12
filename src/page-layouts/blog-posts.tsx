import { HeadlineH1 } from '@/components/typography/headline-h1';
import React from 'react';
import { getPayload } from 'payload';
import config from '@payload-config';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { BlogArticle } from '@/converters/blog-article';
import { LocalizedCollectionPage } from '@/page-layouts/localized-page';
import { i18nConfig, Locale } from '@/middleware';

export const BlogPostPage: React.FC<LocalizedCollectionPage> = async ({
  slugs,
  locale,
  searchParams,
}) => {
  const payload = await getPayload({ config });
  const slug = slugs.join('/');

  const currentDate = new Date().toISOString();

  const articlesInPrimaryLanguage = await payload.find({
    collection: 'blog',
    pagination: false,
    locale: locale,
    fallbackLocale: false,
    where: {
      and: [
        { 'seo.urlSlug': { equals: slug } },
        { _localized_status: { equals: { published: true } } },
        {
          'content.releaseDate': {
            less_than_equal: currentDate,
          },
        },
      ],
    },
  });

  if (articlesInPrimaryLanguage.docs.length > 1)
    throw new Error('More than one article with the same slug found');

  const articleInPrimaryLanguage = articlesInPrimaryLanguage.docs[0];

  // article found in current locale --> render
  if (articleInPrimaryLanguage !== undefined) {
    return (
      <BlogArticle article={articleInPrimaryLanguage} locale={locale} searchParams={searchParams} />
    );
  }

  // fallback logic to find article in other locales
  const locales: Locale[] = i18nConfig.locales.filter((l) => l !== locale) as Locale[];

  const articles = await Promise.all(
    locales.map((l) =>
      payload.find({
        collection: 'blog',
        pagination: false,
        locale: l,
        where: {
          and: [
            { 'seo.urlSlug': { equals: slug } },
            { _localized_status: { equals: { published: true } } },
            {
              'content.releaseDate': {
                less_than_equal: currentDate,
              },
            },
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

  const languageChooseText: Record<Locale, string> = {
    en: 'Choose the correct article',
    de: 'Wähle den korrekten Artikel',
    fr: "Choisissez l'article correct",
  };

  const languagePreposition: Record<Locale, string> = {
    en: 'in',
    de: 'in',
    fr: 'en',
  };

  // list options for user to choose from
  return (
    <article className="mx-auto my-8 max-w-2xl px-8">
      <HeadlineH1>{languageChooseText[locale]}</HeadlineH1>
      <ul>
        {articles.map((article) => (
          <li key={article.id}>
            <Link
              href={`/${article._locale.split('-')[0]}/blog/${article.seo.urlSlug}`}
              className="font-bold text-red-600"
            >
              - {article.content.blogH1} {languagePreposition[locale]} {article._locale}
            </Link>
          </li>
        ))}
      </ul>
    </article>
  );
};
