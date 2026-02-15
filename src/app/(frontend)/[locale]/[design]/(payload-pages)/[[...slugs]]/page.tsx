import { CookieBanner } from '@/components/utils/cookie-banner';
import { RefreshRouteOnSave } from '@/components/utils/refresh-preview';
import { environmentVariables } from '@/config/environment-variables';
import { LOCALE } from '@/features/payload-cms/payload-cms/locales';
import { routeResolutionTable } from '@/features/payload-cms/route-resolution-table';
import type { SpecialRouteResolutionEntry } from '@/features/payload-cms/special-pages-table';
import { getSpecialPage, isSpecialPage } from '@/features/payload-cms/special-pages-table';
import { PreviewWarning } from '@/features/payload-cms/utils/preview-utils';
import type { Locale, SearchParameters } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { forceDynamicOnBuild } from '@/utils/is-pre-rendering';
import type { Metadata } from 'next';
import { draftMode } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { connection } from 'next/server';
import type React from 'react';
import { cache } from 'react';

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
 * Cached helper to generate metadata, avoiding redundant DB lookups.
 */
const generateMetadataCached = cache(
  async (locale: Locale, slugs: string[] | undefined): Promise<Metadata> => {
    // Check if we should bail out during build time
    if (await forceDynamicOnBuild()) {
      return {};
    }

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
      });
    }

    return {};
  },
);

export const generateMetadata = async ({
  params,
}: {
  params: Promise<{
    locale: string;
    design: string;
    slugs: string[] | undefined;
  }>;
}): Promise<Metadata> => {
  const { slugs, locale, design } = await params;
  const awaitedParameters = await params;

  const displaySlug =
    locale === '_next'
      ? `/_next/${design}/${(slugs ?? []).join('/')}`
      : `/${(slugs ?? []).join('/')}`;

  console.log(
    `Generate metadata for page with slug: ${displaySlug}, from: ${JSON.stringify(awaitedParameters)}`,
  );

  // During build, 'await connection()' signals that this function depends on
  // request-time info (like headers), effectively opting out of static pre-rendering
  // for this specific execution if it were truly dynamic.
  // HOWEVER, preventing the DB connection manually via our helper is safer for avoiding build errors.
  await connection();
  return await generateMetadataCached(locale as Locale, slugs);
};

/**
 *
 * Page component for the dynamic page route.
 *
 * This page is used as a fallback for all pages that aren't statically rendered using NextJS,
 * e.g. for all pages defined via PayloadCMS. The page resolves the url and maps it to the
 * corresponding page component defined for a given object in the CMS.
 *
 * @param params - The parameters for the page route
 * @param searchParametersPromise - The search parameters for the page route
 */
const CMSPage: React.FC<{
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

  const draft = await draftMode();

  // check if the user is allowed to access the preview of the current page
  let previewModeAllowed = false;
  if (draft.isEnabled) {
    const { canAccessPreviewOfCurrentPage } =
      await import('@/features/payload-cms/utils/preview-utils');

    const url = `/${locale}/${slugs?.join('/') ?? ''}`;
    previewModeAllowed = await canAccessPreviewOfCurrentPage(searchParameters, url);
  }

  // check if part of a routable collection of the form [collection]/[slug]
  const collection = slugs?.[0] ?? '';
  const remainingSlugs = slugs?.slice(1) ?? [];

  const isDraftSession = draft.isEnabled && previewModeAllowed;
  const previewParameter = searchParameters['preview'];
  const isPreviewDisabled =
    previewParameter === 'false' ||
    (Array.isArray(previewParameter) && previewParameter[0] === 'false');

  const renderInPreviewMode = isDraftSession && !isPreviewDisabled;

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
          {isDraftSession && (
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
      redirect(`/${validatedLocale}/${specialPage.alternatives[validatedLocale]}`);
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
          />

          {isDraftSession && (
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
      console.log('Redirecting to alternative locale for collection page');
      redirect(`/${validatedLocale}/${alternative}`);
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

// Optional: pre-render important pages at build time

export default CMSPage;
