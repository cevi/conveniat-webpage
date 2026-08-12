import { CookieBanner } from '@/components/utils/cookie-banner';
import { RefreshRouteOnSave } from '@/components/utils/refresh-preview';
import { environmentVariables } from '@/config/environment-variables';
import { LOCALE } from '@/features/payload-cms/payload-cms/locales';
import { routeResolutionTable } from '@/features/payload-cms/route-resolution-table';
import type { SpecialRouteResolutionEntry } from '@/features/payload-cms/special-pages-table';
import { getSpecialPage, isSpecialPage } from '@/features/payload-cms/special-pages-table';
import { PreviewWarning } from '@/features/payload-cms/utils/preview/preview-utils';
import type { Locale, SearchParameters } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { DesignCodes } from '@/utils/design-codes';
import { forceDynamicOnBuild } from '@/utils/is-pre-rendering';
import type { Metadata } from 'next';
import { cacheLife, cacheTag } from 'next/cache';

import { notFound, redirect, unstable_rethrow } from 'next/navigation';
import type React from 'react';
import { cache, Suspense } from 'react';

/**
 * Dynamic Payload CMS catch-all route handles dynamic slug resolution, locale switching,
 * preview modes, and 404 fallbacks. Opt out of Next.js 16.3 static instant validation.
 */
export const instant = false;

const getCanonicalData = (
  specialPage: SpecialRouteResolutionEntry,
  locale: Locale,
): { canonical: string; languages: { [k: string]: string } } => {
  const availableLocales: Locale[] = ['de', 'fr', 'en'];
  const canonicalLocale = specialPage.alternatives['de'] === '' ? locale : 'de';
  const canonicalPath = specialPage.alternatives[canonicalLocale];

  const alternates = Object.fromEntries(
    availableLocales
      .filter((lang): boolean => lang !== canonicalLocale && specialPage.alternatives[lang] !== '')
      .map((lang) => [lang, `/${lang}${specialPage.alternatives[lang]}`]),
  );

  return {
    // If the canonical locale is 'de', we do not add the locale to the path
    canonical: `${canonicalLocale == 'de' ? '' : '/' + canonicalLocale}${canonicalPath}`,
    languages: alternates,
  };
};

const normalizeAlternativePath = (alternativePath: string): string =>
  alternativePath.replace(/^\/+/, '');

const validLocales = new Set<string>(Object.values(LOCALE));
const validDesigns = new Set<string>(Object.values(DesignCodes));

const handleSpecialPage = (collection: string, locale: Locale): Metadata => {
  const specialPage = getSpecialPage(collection);
  if (!specialPage) return {};

  const foundLocale = specialPage.locale;

  if (foundLocale === locale) {
    const { canonical, languages } = getCanonicalData(specialPage, locale);
    return {
      title: specialPage.title[locale],
      alternates: {
        canonical,
        languages,
      },
    };
  }

  return {
    title: specialPage.title[locale],
  };
};

/**
 * Resolves the metadata for a route by asking the matching collection component.
 */
const resolveRouteMetadata = async (
  locale: Locale,
  slugs: string[] | undefined,
  isPreview: boolean,
): Promise<Metadata> => {
  const collection = slugs?.[0] ?? '';
  const remainingSlugs = slugs?.slice(1) ?? [];

  if (isSpecialPage(collection)) {
    return handleSpecialPage(collection, locale);
  }

  let collectionPage = routeResolutionTable[collection];

  if (!collectionPage && routeResolutionTable['']) {
    collectionPage = routeResolutionTable[''];
    remainingSlugs.unshift(collection);
  }

  if (collectionPage?.component.generateMetadata) {
    return await collectionPage.component.generateMetadata({
      locale,
      slugs: remainingSlugs,
      isPreview,
    });
  }

  return {};
};

/**
 * The same read, cached across requests.
 *
 * This previously used React's `cache()` alone, which memoises only within a single render —
 * so despite the name, every request re-read the CMS to build the metadata for every page.
 * That is the defect #1534 fixed for the Payload globals; this is the same one on the route
 * that serves every CMS page. `revalidateTag('payload')` already fires from the collections'
 * afterChange hooks, so an edit still takes effect immediately and `cacheLife` is only the
 * upper bound if that ever fails.
 */
const readRouteMetadata = async (
  locale: Locale,
  slugs: string[] | undefined,
): Promise<Metadata> => {
  'use cache';
  cacheLife('hours');
  cacheTag('payload', `route-metadata:${locale}:${(slugs ?? []).join('/')}`);

  return await resolveRouteMetadata(locale, slugs, false);
};

/**
 * Request-level memoisation on top of the persistent layer, so several callers within one
 * render share a single lookup.
 *
 * The build-phase guard stays out here: during `next build` there is no database, and its
 * placeholder return value must never be written to the persistent cache. Preview reads bypass
 * the persistent layer entirely — an editor must see what they just typed, not an entry that is
 * up to an hour old.
 */
const generateMetadataCached = cache(
  async (locale: Locale, slugs: string[] | undefined, isPreview: boolean): Promise<Metadata> => {
    if (await forceDynamicOnBuild()) {
      return {};
    }

    if (isPreview) {
      return await resolveRouteMetadata(locale, slugs, true);
    }

    return await readRouteMetadata(locale, slugs);
  },
);

export const generateMetadata = async ({
  params,
  searchParams,
}: {
  params: Promise<{
    locale: string;
    design: string;
    slugs: string[] | undefined;
  }>;
  searchParams: Promise<SearchParameters>;
}): Promise<Metadata> => {
  const { slugs, locale, design } = await params;

  // `[locale]/[design]` matches any two segments, so requests this app does not own reach here
  // too — a missing `/_next/static/...` asset, a stray font, a crawler guessing paths. The
  // layout answers those with notFound(), which aborts the render pass. Doing the cached
  // metadata read first would then leave a cached call recorded in one prerender pass and not
  // the other, which is what "Unexpected cache miss after cache warming phase" reports, and it
  // writes a cache entry for a route that does not exist. Bail out before that happens.
  if (!validLocales.has(locale) || !validDesigns.has(design)) {
    return {};
  }

  let isPreview = false;
  try {
    const awaitedSearchParameters = await searchParams;
    const previewParameter = awaitedSearchParameters['preview'];
    const isPreviewRequested =
      previewParameter === 'true' ||
      (Array.isArray(previewParameter) && previewParameter[0] === 'true');

    if (isPreviewRequested) {
      const { canAccessPreviewOfCurrentPage } =
        await import('@/features/payload-cms/utils/preview/preview-utils');
      isPreview = await canAccessPreviewOfCurrentPage(awaitedSearchParameters);
    }
  } catch (error) {
    // Let Next.js control-flow errors (dynamic rendering signals, redirect, notFound)
    // propagate so the prerender can abort cleanly instead of hitting connection().
    unstable_rethrow(error);
    // During prerendering, searchParams rejects — preview is never active.
    // The check below is only reached for non-Next.js errors.
    if (!(error instanceof Error && error.message.includes('searchParams'))) {
      console.error('Unexpected error while resolving preview state:', error);
    }
  }

  // During build, this opts out of static pre-rendering so the CMS lookup below is not
  // attempted against an unavailable database.
  //
  // This MUST stay gated on the build phase. An unconditional `connection()` also runs during
  // the runtime prerender, where it rejects as soon as the prerender completes ("During
  // prerendering, `connection()` rejects when the prerender is complete"), throwing away the
  // prerender pass for every request to this route.
  await forceDynamicOnBuild();
  return await generateMetadataCached(locale as Locale, slugs, isPreview);
};

/**
 *
 * Resolved body of the dynamic page route.
 *
 * This page is used as a fallback for all pages that aren't statically rendered using NextJS,
 * e.g. for all pages defined via PayloadCMS. The page resolves the url and maps it to the
 * corresponding page component defined for a given object in the CMS.
 *
 * Everything that reads `params` or `searchParams` lives here rather than in `CMSPage`, because
 * this component renders inside a `<Suspense>` boundary. See `CMSPage` below for why.
 *
 * @param params - The parameters for the page route
 * @param searchParametersPromise - The search parameters for the page route
 */
const CMSPageContent: React.FC<{
  params: Promise<{
    slugs: string[] | undefined;
    locale: string;
    design: string;
  }>;
  searchParams: Promise<SearchParameters>;
}> = async ({ params, searchParams: searchParametersPromise }) => {
  if (await forceDynamicOnBuild()) {
    return <></>;
  }

  let { locale } = await params;
  let { slugs } = await params;
  const searchParameters = await searchParametersPromise;
  // this logic is needed for the case the do not have set
  // we only treat valid locales as a valid locale, otherwise we use the default locale
  // and unshift the locale to the slugs array
  if (!(Object.values(LOCALE) as string[]).includes(locale)) {
    slugs ??= [];
    slugs.unshift(locale);
    locale = i18nConfig.defaultLocale;
  }
  const validatedLocale = locale as Locale;

  const previewParameter = searchParameters['preview'];
  const isPreviewRequested =
    previewParameter === 'true' ||
    (Array.isArray(previewParameter) && previewParameter[0] === 'true');

  // check if the user is allowed to access the preview of the current page
  let renderInPreviewMode = false;
  if (isPreviewRequested) {
    const { canAccessPreviewOfCurrentPage } =
      await import('@/features/payload-cms/utils/preview/preview-utils');

    renderInPreviewMode = await canAccessPreviewOfCurrentPage(searchParameters);
  }

  // check if part of a routable collection of the form [collection]/[slug]
  const collection = slugs?.[0] ?? '';
  const remainingSlugs = slugs?.slice(1) ?? [];

  // check if the collection is in the special page table
  if (isSpecialPage(collection)) {
    const specialPage = getSpecialPage(collection);
    if (specialPage === undefined) {
      notFound();
    }

    const foundLocale = specialPage.locale;

    if (foundLocale === locale) {
      // locale matches --> render the page
      return (
        <>
          <specialPage.component
            slugs={remainingSlugs}
            renderInPreviewMode={renderInPreviewMode}
            locale={validatedLocale}
            searchParams={searchParametersPromise}
          />
          {renderInPreviewMode && (
            <PreviewWarning
              params={Promise.resolve({ locale: validatedLocale })}
              renderInPreviewMode={renderInPreviewMode}
            />
          )}

          <CookieBanner />
        </>
      );
    } else {
      // redirect to the alternative locale
      console.log('Redirecting to alternative locale for special page');
      const normalizedAlternativePath = normalizeAlternativePath(
        specialPage.alternatives[validatedLocale],
      );
      redirect(`/${validatedLocale}/${normalizedAlternativePath}`);
    }
  }

  let collectionPage = routeResolutionTable[collection];
  if (collectionPage === undefined && routeResolutionTable[''] !== undefined) {
    // if no collection found, try to match the first slug to the default collection
    collectionPage = routeResolutionTable[''];
    remainingSlugs.unshift(collection);
  }

  if (collectionPage !== undefined) {
    if (collectionPage.locales.includes(validatedLocale)) {
      return (
        <>
          {renderInPreviewMode && (
            <RefreshRouteOnSave serverURL={environmentVariables.APP_HOST_URL} />
          )}

          <collectionPage.component
            locale={validatedLocale}
            slugs={remainingSlugs}
            renderInPreviewMode={renderInPreviewMode}
            searchParams={searchParametersPromise}
          />

          {renderInPreviewMode && (
            <PreviewWarning
              params={Promise.resolve({ locale: validatedLocale })}
              renderInPreviewMode={renderInPreviewMode}
            />
          )}

          <CookieBanner />
        </>
      );
    } else {
      // redirect to alternative collectionPage if available
      const alternative = collectionPage.alternatives[validatedLocale];
      const normalizedAlternativePath = normalizeAlternativePath(alternative);
      console.log('Redirecting to alternative locale for collection page');
      redirect(`/${validatedLocale}/${normalizedAlternativePath}`);
    }
  }

  if (collection === 'admin') {
    redirect(`/admin`);
  }

  /////////////////////////////////////
  // no matching page found
  //  --> render 404 page
  /////////////////////////////////////
  notFound();
};

/**
 * Page component for the dynamic page route.
 *
 * This does nothing but hand `params` and `searchParams` to `CMSPageContent` *without awaiting
 * them*, from inside a `<Suspense>` boundary.
 *
 * Under `cacheComponents`, reading request data outside a boundary makes the whole tree
 * un-prerenderable: the prospective ("cache warming") prerender pass aborts at the first read,
 * so every `'use cache'` call below it — the header, the footer, `getGenericPageBySlugCached`
 * and the metadata readers — never gets warmed. The final prerender pass then misses every one
 * of them, which is what "Unexpected cache miss after cache warming phase during prerendering"
 * reports, and the page falls back to a fully dynamic render (~144 Mongo queries instead of 0).
 *
 * Awaiting here also blocked the *layout* from prerendering, since the layout cannot complete
 * while its child holds the request. Keeping the await behind the boundary lets the shell
 * prerender and only this subtree stream.
 *
 * @see https://nextjs.org/docs/messages/blocking-prerender-runtime
 */
const CMSPage: React.FC<{
  params: Promise<{
    slugs: string[] | undefined;
    locale: string;
    design: string;
  }>;
  searchParams: Promise<SearchParameters>;
}> = ({ params, searchParams }) => (
  <Suspense fallback={undefined}>
    <CMSPageContent params={params} searchParams={searchParams} />
  </Suspense>
);

// Optional: pre-render important pages at build time

export default CMSPage;
