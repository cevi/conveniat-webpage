import { environmentVariables } from '@/config/environment-variables';
import type { Locale } from '@/types/types';
import { serverSideSlugToUrlResolution } from '@/utils/find-url-prefix';
import { generatePreviewToken } from '@/utils/preview-token';
import { notFound } from 'next/navigation';
import type { CollectionSlug } from 'payload';

/**
 * Prepares the QR code and display URLs for the document preview or redirects.
 * Resolves localized URL prefixes, appends temporary access preview tokens if necessary,
 * and builds the full URL to be encoded into the QR code.
 *
 * @param collectionSlug - The Payload collection slug.
 * @param locale - The currently active locale.
 * @param savedDocumentData - The raw database document data.
 * @param expirySeconds - Expiration duration in seconds for preview tokens.
 * @param domain - The host domain name of the application.
 * @param isRedirectQR - Whether this QR code is for a direct short-link redirect.
 * @returns An object containing the raw QR code content and the URL to be displayed in the UI.
 * @throws Error if document ID or preview token generation fails.
 */
export const prepareQRCodeData = async (
  collectionSlug: CollectionSlug,
  locale: Locale,
  savedDocumentData:
    | {
        seo?: { urlSlug?: string };
        id?: string;
        _localized_status?: Record<Locale, { status: string }>;
        urlSlug?: string;
      }
    | undefined,
  expirySeconds: number,
  domain: string,
  isRedirectQR: boolean = false,
): Promise<{ qrCodeContent: string; displayURL: string }> => {
  const path = await serverSideSlugToUrlResolution(collectionSlug, locale);

  let urlSlug: string = savedDocumentData?.seo?.urlSlug ?? '';

  if (isRedirectQR) {
    urlSlug = savedDocumentData?.urlSlug ?? '';
  }

  if (collectionSlug === 'timeline') urlSlug = savedDocumentData?.id ?? '';
  if (collectionSlug === 'forms') {
    let prefix = 'form-preview/';
    if (locale === 'de') {
      prefix = 'formular-vorschau/';
    } else if (locale === 'fr') {
      prefix = 'apercu-du-formulaire/';
    }
    if (savedDocumentData?.id === undefined) {
      notFound();
    }
    urlSlug = prefix + savedDocumentData.id;
  }

  const finalCollectionSlug: string = path === '' ? '' : `/${path}`;
  const finalUrlSlug: string = urlSlug.startsWith('/') ? urlSlug : `/${urlSlug}`;
  const basePreviewURL = `/${locale}${finalCollectionSlug}${finalUrlSlug}`;

  if (isRedirectQR) {
    const redirectURL = environmentVariables.NEXT_PUBLIC_ENABLE_CON27_SHORT_URLS
      ? 'https://con27.ch' + finalCollectionSlug + finalUrlSlug
      : domain + `/${locale}/go` + finalUrlSlug;
    return {
      qrCodeContent: redirectURL,
      displayURL: redirectURL,
    };
  }

  const maxExpirySeconds = 86_400 * 7; // 7 days
  const currentExpiry = expirySeconds <= maxExpirySeconds ? expirySeconds : 10_800;

  if (!savedDocumentData?.id) {
    console.error('Cannot generate preview token: document ID is missing');
    throw new Error('Cannot generate preview token: document ID is missing');
  }

  const previewToken = await generatePreviewToken(savedDocumentData.id, currentExpiry);
  if (previewToken === '') {
    console.error('Failed to generate preview token');
    throw new Error('Failed to generate preview token');
  }

  const previewTokenQueryParameter = `?preview=true&previewId=${savedDocumentData.id}&preview-token=${previewToken}`;
  const directURL = `${domain}${basePreviewURL}${previewTokenQueryParameter}`;

  return {
    qrCodeContent: directURL,
    displayURL: directURL,
  };
};
