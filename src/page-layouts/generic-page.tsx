import React from 'react';
import { getPayload } from 'payload';
import config from '@payload-config';
import { notFound } from 'next/navigation';
import { i18nConfig, Locale, LocalizedCollectionPage } from '@/types';
import { GenericPageConverter } from '@/converters/generic-page';

export const GenericPage: React.FC<LocalizedCollectionPage> = async ({
  slugs,
  locale,
  searchParams,
}) => {
  const payload = await getPayload({ config });
  const slug = slugs.join('/');

  const articlesInPrimaryLanguage = await payload.find({
    collection: 'generic-page',
    pagination: false,
    locale: locale,
    fallbackLocale: false,
    where: {
      and: [
        { 'seo.urlSlug': { equals: slug } },
        { _localized_status: { equals: { published: true } } },
      ],
    },
  });

  if (articlesInPrimaryLanguage.docs.length > 1)
    throw new Error('More than one article with the same slug found');

  const articleInPrimaryLanguage = articlesInPrimaryLanguage.docs[0];

  // article found in current locale --> render
  if (articleInPrimaryLanguage !== undefined) {
    return (
      <GenericPageConverter
        page={articleInPrimaryLanguage}
        locale={locale}
        searchParams={searchParams}
      />
    );
  }

  // fallback logic to find article in other locales
  const locales: Locale[] = i18nConfig.locales.filter((l) => l !== locale) as Locale[];

  const articles = await Promise.all(
    locales.map((l) =>
      payload.find({
        collection: 'generic-page',
        pagination: false,
        locale: l,
        where: {
          and: [
            { 'seo.urlSlug': { equals: slug } },
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

  if (articles.length === 1) {
    // TODO....
    notFound();
  }

  notFound();
};
