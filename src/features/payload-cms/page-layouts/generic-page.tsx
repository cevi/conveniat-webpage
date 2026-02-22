import { GenericPageConverter } from '@/features/payload-cms/converters/generic-page';
import type { Permission } from '@/features/payload-cms/payload-types';
import { buildMetadata, findAlternatives } from '@/features/payload-cms/utils/metadata-helper';
import type { Locale, LocalizedCollectionComponent } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { hasPermissions } from '@/utils/has-permissions';
import config from '@payload-config';
import type { Metadata } from 'next';
import { cacheLife, cacheTag } from 'next/cache';
import { forbidden, notFound, redirect, unauthorized } from 'next/navigation';
import { getPayload } from 'payload';

import {
  getGenericPageByIDCached,
  getGenericPageBySlugCached,
} from '@/features/payload-cms/api/cached-generic-pages';
import type { GenericPage as GenericPageType } from '@/features/payload-cms/payload-types';

// Wrapper for persistent caching of the slug fetch
const getArticlesCachedPersistent = async (
  slug: string,
  locale: Locale,
  renderInPreviewMode: boolean,
): Promise<{ docs: GenericPageType[] }> => {
  'use cache';
  cacheLife('hours');
  cacheTag('payload', 'generic-page', `collection:generic-page`);

  return getGenericPageBySlugCached(slug, locale, renderInPreviewMode);
};

// Wrapper for persistent caching of the ID fetch
const getFallbackArticleCachedPersistent = async (
  id: string,
  locale: Locale,
  renderInPreviewMode: boolean,
): Promise<GenericPageType> => {
  'use cache';
  cacheLife('hours');
  cacheTag('payload', 'generic-page', `doc:generic-page:${id}`);

  return getGenericPageByIDCached(id, locale, renderInPreviewMode);
};

const GenericPage: LocalizedCollectionComponent = async ({
  slugs,
  locale,
  renderInPreviewMode,
}) => {
  const slug = slugs.join('/');

  if (renderInPreviewMode) {
    console.log('Preview mode enabled');
  }

  const articlesInPrimaryLanguage = await getArticlesCachedPersistent(
    slug,
    locale,
    renderInPreviewMode,
  );

  if (articlesInPrimaryLanguage.docs.length > 1)
    throw new Error('More than one article with the same slug found');

  const articleInPrimaryLanguage = articlesInPrimaryLanguage.docs[0];

  // article found in current locale --> render
  if (articleInPrimaryLanguage !== undefined) {
    if (
      renderInPreviewMode ||
      (await hasPermissions(articleInPrimaryLanguage.content.permissions as Permission))
    ) {
      return <GenericPageConverter page={articleInPrimaryLanguage} locale={locale} />;
    } else {
      console.log('Access denied: Redirecting to 401 or 403');
      const { auth } = await import('@/utils/auth');
      const session = await auth();
      if (session) {
        forbidden();
      } else {
        unauthorized();
      }
    }
  }

  // fallback logic to find article in other locales
  const locales: Locale[] = i18nConfig.locales.filter((l) => l !== locale) as Locale[];

  const articles = await Promise.all(
    locales.map((l) => getArticlesCachedPersistent(slug, l, renderInPreviewMode)),
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

  let fallbackDocumentId: string | undefined;

  if (articles.length === 1) {
    fallbackDocumentId = articles[0]?.id;
  } else if (articles.length > 1) {
    // if possible choose de, otherwise fr, then fr
    const preferredLocales = ['de', 'fr', 'en'];
    for (const preferredLocale of preferredLocales) {
      const articleInPreferredLocale = articles.find((a) => a._locale === preferredLocale);
      if (articleInPreferredLocale) {
        fallbackDocumentId = articleInPreferredLocale.id;
        break;
      }
    }
  }

  if (fallbackDocumentId === undefined) notFound();

  const article = await getFallbackArticleCachedPersistent(
    fallbackDocumentId,
    locale,
    renderInPreviewMode,
  );

  // check if published in target locale
  if (article._localized_status.published !== true) {
    notFound();
  }

  // rewrite URL to the correct locale
  console.log(`Redirecting to locale /${locale}/${article.seo.urlSlug}`);
  redirect(`/${locale}/${article.seo.urlSlug}`);
};

const generateMetadataInternal = async (
  locale: Locale,
  slugs: string[] | undefined,
): Promise<Metadata> => {
  'use cache';
  cacheLife('hours');
  cacheTag('payload', 'generic-page', `collection:generic-page`);

  const slug = slugs?.join('/') ?? '';

  // Use the SAME cached fetcher as the component to deduplicate the request
  const result = await getGenericPageBySlugCached(slug, locale, false);

  const page = result.docs[0];
  if (!page) return {};

  const payload = await getPayload({ config });
  const pageAlternatives = await findAlternatives({
    payload,
    collection: 'generic-page',
    internalPageName: page.internalPageName,
  });

  const germanAlternative = pageAlternatives.find((a) => a._locale.startsWith('de'));
  const canonicalLocale = germanAlternative?._locale ?? locale;
  const canonicalSlug = germanAlternative?.seo.urlSlug ?? slug;

  const alternates = Object.fromEntries(
    pageAlternatives
      .filter((alt) => alt._locale !== canonicalLocale)
      .map((alt) => [alt._locale, `/${alt._locale}/${alt.seo.urlSlug}`]),
  );

  return {
    ...buildMetadata({
      seo: page.seo,
      canonicalLocale,
      canonicalSlug,
      alternates,
    }),
    twitter: {
      card: 'summary',
      title: page.seo.metaTitle ?? page.content.pageTitle,
      description: page.seo.metaDescription ?? undefined,
    },
  };
};

GenericPage.generateMetadata = async ({ locale, slugs }): Promise<Metadata> => {
  return generateMetadataInternal(locale, slugs);
};

export default GenericPage;
