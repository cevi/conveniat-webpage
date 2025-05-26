'use client';

import { environmentVariables } from '@/config/environment-variables';
import type { Locale, StaticTranslationString } from '@/types/types';
import { serverSideSlugToUrlResolution } from '@/utils/find-url-prefix';
import { generatePreviewToken } from '@/utils/preview-token';
import { FormSubmit, useDocumentInfo, useLocale, useTheme } from '@payloadcms/ui';
import { Check, Copy } from 'lucide-react';
import Image from 'next/image';
import type { CollectionSlug } from 'payload';
import type { ChangeEvent, MouseEventHandler } from 'react';
import React, { useCallback, useEffect, useState } from 'react';

const previewExpiryText: StaticTranslationString = {
  de: 'Vorschau-Link für',
  fr: 'Lien de prévisualisation pour',
  en: 'Preview link for',
};

const previewMinutesText: StaticTranslationString = {
  de: 'Minuten',
  fr: 'Minutes',
  en: 'Minutes',
};

const previewHoursText: StaticTranslationString = {
  de: 'Stunden',
  fr: 'Heures',
  en: 'Hours',
};

const previewDaysText: StaticTranslationString = {
  de: 'Tage',
  fr: 'Jours',
  en: 'Days',
};

const fetchQRCode = (
  fullURLForToken: string,
  previewTokenURL: string,
  theme: 'dark' | 'light',
  setImageData: (value: ((previousState: string) => string) | string) => void,
  setHasGeneratedQR: (value: ((previousState: boolean) => boolean) | boolean) => void,
): void => {
  fetch('https://backend.qr.cevi.tools/png', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: fullURLForToken + previewTokenURL,
      options: { color_scheme: theme === 'light' ? 'cevi' : 'white' },
    }),
  })
    .then((response) => {
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return response.blob();
    })
    .then((blob) => {
      const fixedBlob = new Blob([blob], { type: 'image/png' });
      setImageData(URL.createObjectURL(fixedBlob));
      setHasGeneratedQR(true);
    })
    .catch(console.error);
};

const QRCode: React.FC = () => {
  const { collectionSlug, savedDocumentData } = useDocumentInfo();
  const [imageData, setImageData] = useState('');
  const [fullURL, setFullURL] = useState('');
  const [copied, setCopied] = useState(false);
  const [expirySeconds, setExpirySeconds] = useState<number>(10_800); // Default 3 hours
  const [hasGeneratedQR, setHasGeneratedQR] = useState(false); // Track the first generation

  const { code: locale } = useLocale();
  const { theme } = useTheme();

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment,@typescript-eslint/no-unsafe-member-access
  const isPublished: boolean = savedDocumentData?.['_localized_status']?.['published'] ?? false;
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment,@typescript-eslint/no-unsafe-member-access
  const qrCodeEnabled = savedDocumentData?.['seo']?.['urlSlug'] ?? '';

  const generateQR = useCallback(
    // eslint-disable-next-line complexity
    async (customExpiry?: number): Promise<void> => {
      const path = await serverSideSlugToUrlResolution(
        collectionSlug as CollectionSlug,
        locale as Locale,
      );

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment,@typescript-eslint/no-unsafe-member-access
      let urlSlug: string = savedDocumentData?.['seo']?.['urlSlug'] ?? '';
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      if (collectionSlug === 'timeline') urlSlug = savedDocumentData?.['id'] ?? '';

      const finalCollectionSlug: string = path === '' ? '' : `/${path}`;
      const finalUrlSlug: string = urlSlug.startsWith('/') ? urlSlug : `/${urlSlug}`;
      const domain = environmentVariables.NEXT_PUBLIC_APP_HOST_URL;

      const fullURLForToken = domain + '/' + locale + finalCollectionSlug + finalUrlSlug;

      const maxExpirySeconds = 86_400 * 7; // 7 days

      const previewToken = await generatePreviewToken(
        '/' + locale + finalCollectionSlug + finalUrlSlug,
        customExpiry && customExpiry <= maxExpirySeconds ? customExpiry : 10_800,
      ).catch(console.error);

      const previewTokenURL = '?preview=true&preview-token=' + previewToken;
      setFullURL(fullURLForToken + previewTokenURL);
      fetchQRCode(fullURLForToken, previewTokenURL, theme, setImageData, setHasGeneratedQR);
    },
    [collectionSlug, locale, savedDocumentData, theme],
  );

  // Regenerate QR when expiry changes, but only after it has been generated at least once
  useEffect(() => {
    if (hasGeneratedQR) {
      generateQR(expirySeconds).catch(console.error);
    }
  }, [expirySeconds, generateQR, hasGeneratedQR]);

  const handleCopy: MouseEventHandler<HTMLButtonElement> = (event): void => {
    navigator.clipboard
      .writeText(fullURL)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(console.error);
    event.preventDefault();
  };

  const handleExpiryChange = (event: ChangeEvent<HTMLSelectElement>): void => {
    setExpirySeconds(Number(event.target.value));
  };

  const previewLinkText: StaticTranslationString = {
    de: 'Vorschau-Link für',
    fr: 'Lien de prévisualisation pour',
    en: 'Preview link for',
  };

  return (
    <div>
      <FormSubmit
        className=""
        buttonId="generate-qr"
        disabled={!Boolean(isPublished || qrCodeEnabled)}
        onClick={() => {
          generateQR().catch(console.error);
        }}
        size="medium"
        type="button"
      >
        {previewLinkText[locale as Locale]} {locale}
      </FormSubmit>

      {imageData && (
        <div className="mt-4">
          <Image src={imageData} height="200" width="200" alt="link-qr-code" />

          <div className="relative mb-2 w-full max-w-[200px]">
            <input
              className="w-full rounded-md border border-solid border-gray-300 p-[4px] pr-10 text-sm shadow-none outline-hidden focus:ring-1"
              readOnly
              value={fullURL}
            />
            <button
              className="absolute right-1 top-0.5 m-0 h-7 w-7 -translate-y-1/2 cursor-pointer items-center rounded-md border border-solid border-gray-300 bg-gray-50 p-0 text-center"
              onClick={handleCopy}
              aria-label="Copy link"
            >
              {copied ? (
                <Check className="h-4 w-4 text-green-400" />
              ) : (
                <Copy className="h-4 w-4 text-gray-600" />
              )}
            </button>
          </div>

          <div className="mb-2">
            <label htmlFor="expiry" className="mr-2 text-sm font-medium">
              {previewExpiryText[locale as Locale]}
            </label>
            <select
              id="expiry"
              className="rounded border px-2 py-1 text-sm"
              value={expirySeconds}
              onChange={handleExpiryChange}
            >
              <option value={300}>5 {previewMinutesText[locale as Locale]}</option>
              <option value={1800}>30 {previewMinutesText[locale as Locale]}</option>
              <option value={3600}>1 {previewHoursText[locale as Locale]}</option>
              <option value={10_800}>3 {previewHoursText[locale as Locale]}</option>
              <option value={86_400}>1 {previewDaysText[locale as Locale]}</option>
              <option value={604_800}>7 {previewDaysText[locale as Locale]}</option>
            </select>
          </div>
        </div>
      )}
    </div>
  );
};

export default QRCode;
