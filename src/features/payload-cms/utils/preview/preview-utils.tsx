import 'server-only';

import { PreviewWarningClient } from '@/components/preview-warning-client';
import type { Locale, SearchParameters } from '@/types/types';
import { isAdminSession } from '@/utils/is-admin-session';
import { PREVIEW_SESSION_COOKIE } from '@/utils/preview-session-cookie';
import { isPreviewTokenValid } from '@/utils/preview-token';
import { cookies } from 'next/headers';
import type React from 'react';

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
  if (previewToken === undefined) {
    console.log('Preview token is undefined');
    return false;
  }

  // normalize url: remove trailing slash
  const normalizedUrl = url.endsWith('/') ? url.slice(0, -1) : url;

  const isValid = await isPreviewTokenValid(normalizedUrl, previewToken);

  if (!isValid) {
    // try with trailing slash
    const isValidWithSlash = await isPreviewTokenValid(normalizedUrl + '/', previewToken);
    if (isValidWithSlash) {
      console.log('Preview token valid with trailing slash');
      return true;
    }
  }

  console.log(`Preview token validation for URL '${normalizedUrl}' (orig: '${url}'): ${isValid}`);
  return isValid;
};

/**
 * Checks if the page should be rendered in preview mode.
 * This is the case if the `preview` query parameter is set to `true` and
 *
 * 1) the user has a valid `preview-token` query parameter (e.g. shared preview link)
 * 2) or the user has an authenticated admin session AND has visited the admin panel
 *    during the current browser session (indicated by the `payload-admin-visited` cookie)
 *
 * @param searchParameters
 * @param url
 */
export const canAccessPreviewOfCurrentPage = async (
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

  // check if the admin has visited the admin panel in this session
  const cookieStore = await cookies();
  const hasVisitedAdmin = cookieStore.has(PREVIEW_SESSION_COOKIE);
  if (!hasVisitedAdmin) return false;

  // check if user has an authenticated admin session
  return await isAdminSession();
};

export const PreviewWarning: React.FC<{
  params: Promise<{
    locale: Locale;
  }>;
  renderInPreviewMode: boolean;
}> = async ({ params, renderInPreviewMode }) => {
  const { locale } = await params;

  return <PreviewWarningClient locale={locale} renderInPreviewMode={renderInPreviewMode} />;
};
