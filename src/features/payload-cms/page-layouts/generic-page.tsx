import { GenericPageConverter } from '@/features/payload-cms/converters/generic-page';
import type { GenericPage, Permission } from '@/features/payload-cms/payload-types';
import { buildMetadata, findAlternatives } from '@/features/payload-cms/utils/metadata-helper';
import type { Locale, LocalizedCollectionComponent } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { hasPermissions } from '@/utils/has-permissions';
import config from '@payload-config';
import type { Metadata } from 'next';
import { cacheLife, cacheTag } from 'next/cache';
import { forbidden, notFound, redirect } from 'next/navigation';
import type { PaginatedDocs } from 'payload';
import { getPayload } from 'payload';

const getArticlesInPrimaryLanguageCached = async (
  slug: string,
  locale: Locale,
  renderInPreviewMode: boolean,
): Promise<PaginatedDocs<GenericPage>> => {
  'use cache';
  cacheLife('hours');
  cacheTag('generic-page', 'payload');

  const payload = await getPayload({ config });

  return payload.find({
    depth: 1,
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
};

const getArticlesCached = async (
  slug: string,
  locale: Locale,
  renderInPreviewMode: boolean,
): Promise<PaginatedDocs<GenericPage>> => {
  'use cache';
  cacheLife('hours');
  cacheTag('generic-page', 'payload');

  const payload = await getPayload({ config });

  return payload.find({
    depth: 1,
    collection: 'generic-page',
    pagination: false,
    draft: renderInPreviewMode,
    locale: locale,
    where: {
      and: [
        { 'seo.urlSlug': { equals: slug } },
        // we only resolve published pages unless in preview mode
        renderInPreviewMode ? {} : { _localized_status: { equals: { published: true } } },
      ],
    },
  });
};

const getFallbackArticleCached = async (
  id: string,
  locale: Locale,
  renderInPreviewMode: boolean,
): Promise<GenericPage> => {
  'use cache';
  cacheLife('hours');
  cacheTag('generic-page', 'payload');

  const payload = await getPayload({ config });

  return payload.findByID({
    collection: 'generic-page',
    depth: 1,
    id,
    locale,
    draft: renderInPreviewMode,
  });
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

  const articlesInPrimaryLanguage = await getArticlesInPrimaryLanguageCached(
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
      console.log('Access denied: Redirecting to 403');
      forbidden();
    }
  }

  // fallback logic to find article in other locales
  const locales: Locale[] = i18nConfig.locales.filter((l) => l !== locale) as Locale[];

  const articles = await Promise.all(
    locales.map((l) => getArticlesCached(slug, l, renderInPreviewMode)),
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

  const article = await getFallbackArticleCached(fallbackDocumentId, locale, renderInPreviewMode);

  // check if published in target locale
  if (article._localized_status.published !== true) {
    notFound();
  }

  // rewrite URL to the correct locale
  console.log(`Redirecting to locale /${locale}/${article.seo.urlSlug}`);
  redirect(`/${locale}/${article.seo.urlSlug}`);
};

GenericPage.generateMetadata = async ({ locale, slugs }): Promise<Metadata> => {
  'use cache';
  cacheLife('hours');
  cacheTag('generic-page');

  const payload = await getPayload({ config });
  const slug = slugs?.join('/') ?? '';

  const result = await payload.find({
    collection: 'generic-page',
    pagination: false,
    locale,
    fallbackLocale: false,
    draft: false,
    where: {
      and: [
        { 'seo.urlSlug': { equals: slug } },
        { _localized_status: { equals: { published: true } } },
      ],
    },
  });

  const page = result.docs[0];
  if (!page) return {};

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

export default GenericPage;
