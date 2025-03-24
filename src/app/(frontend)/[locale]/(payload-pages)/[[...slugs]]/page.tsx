import 'server-only';

import React from 'react';
import { notFound, redirect } from 'next/navigation';
import { routeResolutionTable } from '@/route-resolution-table';
import { Locale, SearchParameters } from '@/types';
import { cookies } from 'next/headers';
import { auth } from '@/auth/auth';
import { canAccessAdminPanel } from '@/payload-cms/access-rules/can-access-admin-panel';
import { PayloadRequest } from 'payload';
import { RefreshRouteOnSave } from '@/components/refresh-preview';
import { isPreviewTokenValid } from '@/utils/preview-token';
import { CookieBanner } from '@/components/utils/cookie-banner';

/**
 * Checks if the preview token is valid.
 *
 * We do that using the same concept as for a JWT token validation.
 * The token has a signature and is a compressed object { url: string; expires: number }
 * This function verify the signature and check if the token is still valid.
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

  return canAccessAdminPanel({ req: { user } as unknown as PayloadRequest });
};

const PreviewWarning: React.FC<{
  params: Promise<{
    locale: Locale;
  }>;
}> = async ({ params }) => {
  const { locale } = await params;
  const StatisPreviewString = {
    de: 'DIES IST EINE VORSCHAU',
    en: 'THIS IS A PREVIEW',
    fr: 'CECI EST UNE PRÉVISUALISATION',
  };
  return (
    <div className="fixed bottom-0 right-0 z-50 p-4">
      <div className="rounded-lg bg-orange-500 px-4 py-2 font-bold text-white shadow-lg">
        {StatisPreviewString[locale]}
      </div>
    </div>
  );
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
    const { locale, slugs } = await params;
    const searchParameters = await searchParametersPromise;

    const searchParametersString = Object.entries(searchParameters)
      .map(([key, value]) => {
        return Array.isArray(value) ? value.map((v) => `${key}=${v}`).join('&') : `${key}=${value}`;
      })
      .join('&');

    // check if part of a routable collection of the form [collection]/[slug]
    const collection = (slugs?.[0] ?? '') as string;
    const remainingSlugs = slugs?.slice(1) ?? [];

    let collectionPage = routeResolutionTable[collection];
    if (collectionPage === undefined && routeResolutionTable[''] !== undefined) {
      // if no collection found, try to match the first slug to the default collection
      collectionPage = routeResolutionTable[''];
      remainingSlugs.unshift(collection);
    }

    const url = `/${locale}/${slugs?.join('/')}`;
    const previewModeAllowed = await canAccessPreviewOfCurrentPage(searchParameters, url);
    const hasPreviewSearchParameter = searchParameters['preview'] === 'true';

    if (collectionPage !== undefined) {
      if (collectionPage.locales.includes(locale)) {
        return (
          <>
            {previewModeAllowed && hasPreviewSearchParameter && (
              <RefreshRouteOnSave serverURL={process.env['APP_HOST_URL'] ?? ''} />
            )}

            <collectionPage.component
              locale={locale}
              slugs={remainingSlugs}
              searchParams={searchParameters}
              renderInPreviewMode={previewModeAllowed && hasPreviewSearchParameter}
            />

            {previewModeAllowed && hasPreviewSearchParameter && <PreviewWarning params={params} />}

            {!previewModeAllowed || (!hasPreviewSearchParameter && <CookieBanner />)}
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
