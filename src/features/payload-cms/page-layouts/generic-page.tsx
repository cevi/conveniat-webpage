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
  getGenericPageBySlugHistoryCached,
  getGenericPageExistsBySlugCached,
} from '@/features/payload-cms/api/cached-generic-pages';
import type { GenericPage as GenericPageType } from '@/features/payload-cms/payload-types';

// Wrapper for persistent caching of the slug fetch
const getArticlesCachedPersistent = async (
  slug: string,
  locale: Locale,
): Promise<{ docs: GenericPageType[] }> => {
  'use cache';
  cacheLife('hours');
  cacheTag('payload', 'generic-page', `collection:generic-page`);

  return getGenericPageBySlugCached(slug, locale, false);
};

// Wrapper for persistent caching of the lightweight existence check
const getArticlesExistsCachedPersistent = async (
  slug: string,
  locale: Locale,
): Promise<{ docs: GenericPageType[] }> => {
  'use cache';
  cacheLife('hours');
  cacheTag('payload', 'generic-page', `collection:generic-page`);

  return getGenericPageExistsBySlugCached(slug, locale, false);
};

// Wrapper for persistent caching of the ID fetch
const getFallbackArticleCachedPersistent = async (
  id: string,
  locale: Locale,
): Promise<GenericPageType> => {
  'use cache';
  cacheLife('hours');
  cacheTag('payload', 'generic-page', `doc:generic-page:${id}`);

  return getGenericPageByIDCached(id, locale, false);
};

const GenericPage: LocalizedCollectionComponent = async ({
  slugs,
  locale,
  renderInPreviewMode,
  searchParams,
}) => {
  const slug = slugs.join('/');

  let previewId: string | undefined;
  if (renderInPreviewMode && searchParams) {
    const awaitedParameters = await searchParams;
    const pid = awaitedParameters['previewId'];
    previewId = Array.isArray(pid) ? pid[0] : pid;
  }

  if (renderInPreviewMode) {
    console.log('Preview mode enabled');
  }

  // Depending on whether we are in preview mode, we use the cached
  // or the uncached fetch flow. The uncached flow is necessary to allow
  // real-time hot-reloading inside the payload CMS live preview iframe.
  let documents: GenericPageType[] = [];
  if (renderInPreviewMode) {
    if (previewId) {
      try {
        const document_ = await getGenericPageByIDCached(previewId, locale, true);
        documents = [document_];
      } catch {
        // Fallback to slug if ID fetch fails
        const fetchResult = await getGenericPageBySlugCached(slug, locale, true);
        documents = fetchResult.docs;
      }
    } else {
      const fetchResult = await getGenericPageBySlugCached(slug, locale, true);
      documents = fetchResult.docs;
    }
  } else {
    const fetchResult = await getArticlesCachedPersistent(slug, locale);
    documents = fetchResult.docs;
  }

  const articlesInPrimaryLanguage = { docs: documents };

  if (articlesInPrimaryLanguage.docs.length > 1) {
    const conflicting = articlesInPrimaryLanguage.docs
      .map((document_) => `id=${document_.id}, internalPageName="${document_.internalPageName}"`)
      .join('; ');
    throw new Error(
      `More than one article with the same slug found (slug="${slug}", locale="${locale}"). Conflicting pages: [${conflicting}]`,
    );
  }

  const articleInPrimaryLanguage = articlesInPrimaryLanguage.docs[0];

  // article found in current locale --> render
  if (articleInPrimaryLanguage !== undefined) {
    if (
      renderInPreviewMode ||
      (await hasPermissions(articleInPrimaryLanguage.content.permissions as Permission))
    ) {
      return (
        <GenericPageConverter
          page={articleInPrimaryLanguage}
          locale={locale}
          renderInPreviewMode={renderInPreviewMode}
        />
      );
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
    locales.map(async (l) => {
      // Use the lightweight existence check — it skips mainContent blocks,
      // fetching only id, _locale, and content.permissions.
      return await (renderInPreviewMode
        ? getGenericPageExistsBySlugCached(slug, l, true)
        : getArticlesExistsCachedPersistent(slug, l));
    }),
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
    // Check if the slug exists in the URL history
    const historyResult = await (renderInPreviewMode
      ? getGenericPageBySlugHistoryCached(slug, locale, true)
      : getGenericPageBySlugHistoryCached(slug, locale, false));

    if (historyResult.docs.length > 0) {
      const historicArticle = historyResult.docs[0];
      if (typeof historicArticle?.seo.urlSlug === 'string') {
        const historicSlug = historicArticle.seo.urlSlug;
        const redirectPath = historicSlug === '' ? `/${locale}` : `/${locale}/${historicSlug}`;

        let queryString = '';
        if (searchParams) {
          const awaitedParameters = await searchParams;
          const urlSearchParameters = new URLSearchParams();
          for (const [key, value] of Object.entries(awaitedParameters)) {
            if (Array.isArray(value)) {
              for (const v of value) urlSearchParameters.append(key, v);
            } else {
              urlSearchParameters.append(key, value);
            }
          }
          const string_ = urlSearchParameters.toString();
          if (string_) queryString = `?${string_}`;
        }

        const currentPath = slug === '' ? `/${locale}` : `/${locale}/${slug}`;
        console.log(
          `Redirecting from historic slug ${currentPath} to ${redirectPath}${queryString}`,
        );
        redirect(`${redirectPath}${queryString}`, 'replace');
      }
    }

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

  const article = await (renderInPreviewMode
    ? getGenericPageByIDCached(fallbackDocumentId, locale, true)
    : getFallbackArticleCachedPersistent(fallbackDocumentId, locale));

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

  const germanAlternative = pageAlternatives.find((a) =>
    (a._locale as string | undefined)?.startsWith('de'),
  );
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

const generateMetadataPreview = async (
  locale: Locale,
  slugs: string[] | undefined,
): Promise<Metadata> => {
  const slug = slugs?.join('/') ?? '';

  const payload = await getPayload({ config });
  const result = await payload.find({
    collection: 'generic-page',
    depth: 0,
    pagination: false,
    locale: locale,
    fallbackLocale: false,
    draft: true,
    where: {
      'seo.urlSlug': { equals: slug },
    },
    select: {
      seo: true,
      content: true,
    },
  });

  const page = result.docs[0];
  if (!page) return { title: 'Preview Mode' };

  return {
    title: page.seo.metaTitle || page.content.pageTitle || 'Preview Mode',
    description: page.seo.metaDescription || undefined,
  };
};

GenericPage.generateMetadata = async ({ locale, slugs, isPreview }): Promise<Metadata> => {
  if (isPreview) {
    return generateMetadataPreview(locale, slugs);
  }
  return generateMetadataInternal(locale, slugs);
};

export default GenericPage;
