import 'server-only';

import { CookieBanner } from '@/components/utils/cookie-banner';
import { RefreshRouteOnSave } from '@/components/utils/refresh-preview';
import { environmentVariables } from '@/config/environment-variables';
import { canAccessAdminPanel } from '@/features/payload-cms/payload-cms/access-rules/can-access-admin-panel';
import { routeResolutionTable } from '@/features/payload-cms/route-resolution-table';
import type { Locale, SearchParameters } from '@/types/types';
import { auth } from '@/utils/auth-helpers';
import { isPreviewTokenValid } from '@/utils/preview-token';
import config from '@payload-config';
import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { getPayload, type PayloadRequest } from 'payload';
import type React from 'react';

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

    const payload = await getPayload({ config });

    const searchParametersString = Object.entries(searchParameters)
      .map(([key, value]) => {
        return Array.isArray(value) ? value.map((v) => `${key}=${v}`).join('&') : `${key}=${value}`;
      })
      .join('&');

    // check if part of a routable collection of the form [collection]/[slug]
    const collection = (slugs?.[0] ?? '') as string;
    const remainingSlugs = slugs?.slice(1) ?? [];

    // check if the page is actually a redirect slug
    const redirectPages = await payload.find({
      collection: 'redirects',
      depth: 1,
      limit: 1,
      locale,
      where: {
        from: {
          equals: collection,
        },
      },
    });
    if (redirectPages.totalDocs > 0) {
      const redirectPage = redirectPages.docs[0];
      if (redirectPage === undefined) {
        // redirect to the default page
        redirect(`/${locale}`);
      }
      // check if redirectPage.to.type is "reference" or "custom"
      const redirectPageTo = redirectPage.to as
        | { type: 'custom'; url: string }
        | {
            type: 'reference';
            reference: {
              relationTo: string;
              value: {
                seo: {
                  urlSlug: string;
                };
              };
            };
          };

      if (redirectPageTo.type === 'custom') {
        const redirectPageToCustom = redirectPageTo as { type: 'custom'; url: string };
        const redirectPageToValue = redirectPageToCustom.url;
        redirect(redirectPageToValue);
      } else {
        const redirectPageToValue = redirectPageTo.reference.value.seo.urlSlug;
        const redirectPageToRelationTo = redirectPageTo.reference.relationTo;
        redirect(`/${locale}/${redirectPageToRelationTo}/${redirectPageToValue}`);
      }
    }

    let collectionPage = routeResolutionTable[collection];
    if (collectionPage === undefined && routeResolutionTable[''] !== undefined) {
      // if no collection found, try to match the first slug to the default collection
      collectionPage = routeResolutionTable[''];
      remainingSlugs.unshift(collection);
    }

    const url = `/${locale}/${slugs?.join('/') ?? ''}`;
    const previewModeAllowed = await canAccessPreviewOfCurrentPage(searchParameters, url);
    const hasPreviewSearchParameter = searchParameters['preview'] === 'true';

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
