import React from 'react';
import { getPayload } from 'payload';
import config from '@payload-config';
import { notFound, redirect } from 'next/navigation';
import type { Locale, LocalizedCollectionPage } from '@/types';
import { i18nConfig } from '@/types';
import { GenericPageConverter } from '@/converters/generic-page';
import { hasPermissions } from '@/utils/has-permissions';
import type { Permission } from '@/payload-types';

export const GenericPage: React.FC<LocalizedCollectionPage> = async ({
  slugs,
  locale,
  searchParams,
  renderInPreviewMode,
}) => {
  const payload = await getPayload({ config });
  const slug = slugs.join('/');

  if (renderInPreviewMode) {
    console.log('Preview mode enabled');
  }

  const articlesInPrimaryLanguage = await payload.find({
    collection: 'generic-page',
    pagination: false,
    locale: locale,
    fallbackLocale: false,
    draft: renderInPreviewMode,
    where: {
      and: [
        { 'seo.urlSlug': { equals: slug } },
        // we only resolve published pages unless in preview mode
        renderInPreviewMode ? {} : { _localized_status: { equals: { published: true } } },
      ],
    },
  });

  if (articlesInPrimaryLanguage.docs.length > 1)
    throw new Error('More than one article with the same slug found');

  const articleInPrimaryLanguage = articlesInPrimaryLanguage.docs[0];

  // article found in current locale --> render
  if (articleInPrimaryLanguage !== undefined) {
    if (await hasPermissions(articleInPrimaryLanguage.content.permissions as Permission)) {
      return (
        <GenericPageConverter
          page={articleInPrimaryLanguage}
          locale={locale}
          searchParams={searchParams}
        />
      );
    } else {
      notFound();
    }
  }

  // fallback logic to find article in other locales
  const locales: Locale[] = i18nConfig.locales.filter((l) => l !== locale) as Locale[];

  const articles = await Promise.all(
    locales.map((l) =>
      payload.find({
        collection: 'generic-page',
        pagination: false,
        draft: renderInPreviewMode,
        locale: l,
        where: {
          and: [
            { 'seo.urlSlug': { equals: slug } },
            // we only resolve published pages unless in preview mode
            renderInPreviewMode ? {} : { _localized_status: { equals: { published: true } } },
          ],
        },
      }),
    ),
  )
    .then((results) =>
      results
        .filter((r) => r.docs.length === 1)
        .flatMap((r) => r.docs[0])
        .filter((a) => a !== undefined),
    )
    .then(async (a) => {
      const filteredArticles = await Promise.all(
        a.map(async (article) => await hasPermissions(article.content.permissions as Permission)),
      );
      return a.filter((_, index) => filteredArticles[index] ?? false);
    });

  // no article found --> 404
  if (articles.length === 0) {
    notFound();
  }

  if (articles.length === 1) {
    // get page in current locale
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    const articleID = articles[0].id;

    const article = await payload.findByID({
      collection: 'generic-page',
      id: articleID,
      locale: locale,
      draft: renderInPreviewMode,
    });

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (article === null) {
      notFound();
    }
    // rewrite URL to the correct locale
    redirect(`/${locale}/${article.seo.urlSlug}`);
  }

  notFound();
};
