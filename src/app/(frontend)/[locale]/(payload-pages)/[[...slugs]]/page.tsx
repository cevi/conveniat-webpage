import 'server-only';

import { PreviewWarningClient } from '@/app/(frontend)/[locale]/(payload-pages)/[[...slugs]]/preview-warning-client';

import { CustomErrorBoundaryFallback } from '@/app/(frontend)/[locale]/(payload-pages)/[[...slugs]]/custom-error-boundary-fallback';
import { NotFound } from '@/app/(frontend)/not-found';
import { CookieBanner } from '@/components/utils/cookie-banner';
import { RefreshRouteOnSave } from '@/components/utils/refresh-preview';
import { environmentVariables } from '@/config/environment-variables';
import { canUserAccessAdminPanel } from '@/features/payload-cms/payload-cms/access-rules/can-access-admin-panel';
import { LOCALE } from '@/features/payload-cms/payload-cms/locales';
import { routeResolutionTable } from '@/features/payload-cms/route-resolution-table';
import type { SpecialRouteResolutionEntry } from '@/features/payload-cms/special-pages-table';
import { getSpecialPage, isSpecialPage } from '@/features/payload-cms/special-pages-table';
import type { HitobitoNextAuthUser } from '@/types/hitobito-next-auth-user';
import type { Locale, SearchParameters } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { auth } from '@/utils/auth-helpers';
import { isPreviewTokenValid } from '@/utils/preview-token';
import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import type React from 'react';

const getCanonicalData = (
  specialPage: SpecialRouteResolutionEntry,
  locale: Locale,
): { canonical: string; languages: { [k: string]: string } } => {
  const availableLocales: Locale[] = ['de', 'fr', 'en'];
  const canonicalLocale = specialPage.alternatives['de'] ? 'de' : locale;
  const canonicalPath = specialPage.alternatives[canonicalLocale];

  const alternates = Object.fromEntries(
    availableLocales
      .filter((lang) => lang !== canonicalLocale && specialPage.alternatives[lang])
      .map((lang) => [lang, `/${lang}${specialPage.alternatives[lang]}`]),
  );

  return {
    canonical: `/${canonicalLocale}${canonicalPath}`,
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

export const generateMetadata = async ({
  params,
}: {
  params: {
    locale: Locale;
    slugs: string[] | undefined;
  };
}): Promise<Metadata> => {
  const { slugs, locale } = await params;
  const collection = (slugs?.[0] ?? '') as string;
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
    return await collectionPage.component.generateMetadata({ locale, slugs: remainingSlugs });
  }

  return {};
};

/**
 * Checks if the preview token is valid.
 *
 * We do that using the same concept as for a JWT token validation.
 * The token has a signature and is a compressed object { url: string; expires: number }
 * This function verifies the signature and checks if the token is still valid.
 *
 * @param previewToken
 * @param url the url of the current page (always include the locale,
 * especially for the default locale is included)
 */
const isValidPreviewToken = async (
  previewToken: string | undefined,
  url: string,
): Promise<boolean> => {
  if (previewToken === undefined) return false;
  return await isPreviewTokenValid(url, previewToken);
};

/**
 * Checks if the page should be rendered in preview mode.
 * This is the case of the `preview` query parameter is set to `true` and
 *
 * 1) the cookie `preview` is set and the use can access the payload admin panel
 * 2) or if the `preview-token` query parameter is set and valid
 *
 * @param searchParameters
 * @param url
 */
const canAccessPreviewOfCurrentPage = async (
  searchParameters: SearchParameters,
  url: string,
): Promise<boolean> => {
  let previewToken = searchParameters['preview-token'];

  if (Array.isArray(previewToken)) {
    previewToken = previewToken[0];
  }

  // check if preview token is set and valid
  const hasValidPreviewToken = await isValidPreviewToken(previewToken, url);
  if (hasValidPreviewToken) return true;

  // check if cookie is set
  const cookieStore = await cookies();
  const previewCookie = cookieStore.get('preview');
  const isPreviewCookieSet = previewCookie?.value === 'true';
  if (!isPreviewCookieSet) return false;

  const session = await auth();
  if (session === null) return false;

  // check if user is an admin
  const user = session.user;
  if (user === undefined) return false;

  return canUserAccessAdminPanel({ user: user as HitobitoNextAuthUser });
};

const PreviewWarning: React.FC<{
  params: Promise<{
    locale: Locale;
  }>;
}> = async ({ params }) => {
  const { locale } = await params;

  return <PreviewWarningClient locale={locale} />;
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
 *
 */
const CMSPage: React.FC<{
  params: Promise<{
    slugs: string[] | undefined;
    locale: Locale;
  }>;
  searchParams: Promise<SearchParameters>;
}> =
  // eslint-disable-next-line complexity
  async ({ params, searchParams: searchParametersPromise }) => {
    let { locale } = await params;
    let { slugs } = await params;

    // this logic is needed for the case the do not have set
    // we only treat valid locales as a valid locale, otherwise we use the default locale
    // and unshift the locale to the slugs array
    if (!Object.values(LOCALE).includes(locale)) {
      slugs ??= [];
      slugs.unshift(locale);
      locale = i18nConfig.defaultLocale as Locale;
    }

    const searchParameters = await searchParametersPromise;

    // check if error parameter is set
    if (searchParameters['error']) {
      return (
        <CustomErrorBoundaryFallback>
          <NotFound />
        </CustomErrorBoundaryFallback>
      );
    }

    const searchParametersString = Object.entries(searchParameters)
      .map(([key, value]) => {
        return Array.isArray(value) ? value.map((v) => `${key}=${v}`).join('&') : `${key}=${value}`;
      })
      .join('&');

    // check if part of a routable collection of the form [collection]/[slug]
    const collection = (slugs?.[0] ?? '') as string;
    const remainingSlugs = slugs?.slice(1) ?? [];

    const url = `/${locale}/${slugs?.join('/') ?? ''}`;
    const previewModeAllowed = await canAccessPreviewOfCurrentPage(searchParameters, url);
    const hasPreviewSearchParameter = searchParameters['preview'] === 'true';

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
              renderInPreviewMode={previewModeAllowed && hasPreviewSearchParameter}
              locale={locale}
              searchParams={searchParameters}
            />
            {previewModeAllowed && hasPreviewSearchParameter && <PreviewWarning params={params} />}

            <CookieBanner />
          </>
        );
      } else {
        // redirect to the alternative locale
        redirect(`/${locale}${specialPage.alternatives[locale]}?${searchParametersString}`);
      }
    }

    let collectionPage = routeResolutionTable[collection];
    if (collectionPage === undefined && routeResolutionTable[''] !== undefined) {
      // if no collection found, try to match the first slug to the default collection
      collectionPage = routeResolutionTable[''];
      remainingSlugs.unshift(collection);
    }

    if (!previewModeAllowed && hasPreviewSearchParameter) {
      throw new Error(`Preview mode is not allowed for this page.`);
    }

    if (collectionPage !== undefined) {
      if (collectionPage.locales.includes(locale)) {
        return (
          <>
            {previewModeAllowed && hasPreviewSearchParameter && (
              <RefreshRouteOnSave serverURL={environmentVariables.APP_HOST_URL} />
            )}

            <collectionPage.component
              locale={locale}
              slugs={remainingSlugs}
              searchParams={searchParameters}
              renderInPreviewMode={previewModeAllowed && hasPreviewSearchParameter}
            />

            {previewModeAllowed && hasPreviewSearchParameter && <PreviewWarning params={params} />}

            <CookieBanner />
          </>
        );
      } else {
        // redirect to alternative collectionPage if available
        const alternative = collectionPage.alternatives[locale];
        redirect(`/${locale}/${alternative}?${searchParametersString}`);
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

export default CMSPage;
