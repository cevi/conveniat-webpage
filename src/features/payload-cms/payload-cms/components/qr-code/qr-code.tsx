'use client';

import { Button } from '@/components/ui/buttons/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { environmentVariables } from '@/config/environment-variables';
import type { Locale, StaticTranslationString } from '@/types/types';
import { serverSideSlugToUrlResolution } from '@/utils/find-url-prefix';
import { generatePreviewToken } from '@/utils/preview-token';
import { FormSubmit, useDocumentInfo, useLocale, useTheme } from '@payloadcms/ui';
import { useQuery } from '@tanstack/react-query'; // Added for TanStack Query
import { Check, Copy, Eye } from 'lucide-react';
import Image from 'next/image';
import type { CollectionSlug } from 'payload';
import type { ChangeEvent, MouseEventHandler } from 'react';
import React, { useCallback, useEffect, useRef, useState } from 'react';

const previewExpiryText: StaticTranslationString = {
  de: 'Gültigkeit',
  fr: 'Durée de validité',
  en: 'Expiry',
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

const previewLinkText: StaticTranslationString = {
  de: 'Vorschau',
  fr: 'Aperçu',
  en: 'Preview',
};

const previewLinkTextLong: StaticTranslationString = {
  de: 'Vorschau Link für',
  fr: 'lien d’aperçu pour',
  en: 'Preview link for',
};

const qrCodeLoadingText: StaticTranslationString = {
  de: 'QR-Code',
  fr: 'QR-Code',
  en: 'QR Code',
};
const linkLoadingText: StaticTranslationString = { de: 'Link', fr: 'Lien', en: 'Link' };
const qrNotAvailableText: StaticTranslationString = {
  de: 'QR-Code nicht verfügbar',
  fr: 'QR-Code non disponible',
  en: 'QR Code not available',
};
const linkNotAvailableText: StaticTranslationString = {
  de: 'Link nicht verfügbar',
  fr: 'Lien non disponible',
  en: 'Link not available',
};

// eslint-disable-next-line complexity
const prepareQRCodeData = async (
  collectionSlug: CollectionSlug,
  locale: Locale,
  savedDocumentData:
    | {
        seo?: { urlSlug?: string };
        id?: string;
        _localized_status?: Record<Locale, { status: string }>;
      }
    | undefined,
  expirySeconds: number,
  domain: string,
): Promise<{ qrCodeContent: string; displayURL: string }> => {
  const path = await serverSideSlugToUrlResolution(collectionSlug, locale);

  let urlSlug: string = savedDocumentData?.seo?.urlSlug ?? '';

  if (collectionSlug === 'timeline') urlSlug = savedDocumentData?.id ?? '';

  const finalCollectionSlug: string = path === '' ? '' : `/${path}`;
  const finalUrlSlug: string = urlSlug.startsWith('/') ? urlSlug : `/${urlSlug}`;
  const basePreviewURL = `/${locale}${finalCollectionSlug}${finalUrlSlug}`;

  const fullURLForToken = domain + basePreviewURL;

  const maxExpirySeconds = 86_400 * 7; // 7 days
  const currentExpiry = expirySeconds <= maxExpirySeconds ? expirySeconds : 10_800;

  const previewToken = await generatePreviewToken(basePreviewURL, currentExpiry);
  if (previewToken === '') {
    console.error('Failed to generate preview token');
    throw new Error('Failed to generate preview token');
  }

  const previewTokenQueryParameter = `?preview=true&preview-token=${previewToken}`;
  return {
    qrCodeContent: fullURLForToken + previewTokenQueryParameter,
    displayURL: fullURLForToken + previewTokenQueryParameter,
  };
};

// --- QRCodeImage Component (Refined for loading states) ---
interface QRCodeImageProperties {
  qrImageSrc: string | undefined;
  fullURL: string;
  copied: boolean;
  handleCopy: MouseEventHandler<HTMLButtonElement>;
  isLoading: boolean;
  locale?: Locale;
}

const QRCodeImage: React.FC<QRCodeImageProperties> = ({
  qrImageSrc,
  fullURL,
  copied,
  handleCopy,
  isLoading,
  locale = 'en',
}) => {
  if (isLoading) {
    return (
      <>
        <div className="flex h-[200px] w-[200px] animate-pulse items-center justify-center rounded-md bg-gray-100 dark:bg-gray-700">
          <span className="text-gray-500 dark:text-gray-300">{qrCodeLoadingText[locale]}</span>
        </div>
        <div className="flex h-10 w-full animate-pulse items-center justify-center rounded-md bg-gray-100 dark:bg-gray-700">
          <span className="font-semibold text-gray-500 dark:text-gray-300">
            {linkLoadingText[locale]}
          </span>
        </div>
      </>
    );
  }

  if (qrImageSrc != undefined) {
    return (
      <>
        <Image src={qrImageSrc} height="200" width="200" alt="link-qr-code" />
        <div className="relative w-full">
          <input
            className="w-full rounded-md border border-solid border-gray-300 p-2 pr-10 text-sm shadow-none outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
            readOnly
            value={fullURL}
          />
          <Button
            variant="ghost"
            size="sm"
            className="absolute top-1/2 right-1 -translate-y-1/2 transform" // Ensure correct centering
            onClick={handleCopy}
            aria-label="Copy link"
          >
            {copied ? (
              <Check className="h-4 w-4 text-green-500 dark:text-green-100" />
            ) : (
              <Copy className="h-4 w-4 text-gray-500 dark:text-gray-100" />
            )}
          </Button>
        </div>
      </>
    );
  }

  // Fallback for error or unexpected state after loading finishes
  return (
    <>
      <div className="flex h-[200px] w-[200px] items-center justify-center rounded-md border border-dashed border-gray-300 bg-gray-50 dark:border-gray-600 dark:bg-gray-700">
        <span className="text-center text-xs text-gray-500 dark:text-gray-300">
          {qrNotAvailableText[locale]}
        </span>
      </div>
      <div className="flex h-10 w-full items-center justify-center rounded-md border border-dashed border-gray-300 bg-gray-50 dark:border-gray-600 dark:bg-gray-700">
        <span className="text-xs font-semibold text-gray-500 dark:text-gray-300">
          {linkNotAvailableText[locale]}
        </span>
      </div>
    </>
  );
};

interface ExpiryDropdownProperties {
  locale: Locale | undefined;
  expirySeconds: number;
  handleExpiryChange: (event: ChangeEvent<HTMLSelectElement>) => void;
}

const ExpiryDropdown: React.FC<ExpiryDropdownProperties> = ({
  locale,
  expirySeconds,
  handleExpiryChange,
}) => (
  <div className="grid w-full grid-cols-2 items-center gap-4">
    <label htmlFor="expiry" className="text-sm font-medium">
      {previewExpiryText[locale as Locale]}
    </label>
    <select
      id="expiry"
      className="bg-background flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-sm disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
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
);

type QRCodeProperties = object;

// eslint-disable-next-line complexity
const QRCode: React.FC<QRCodeProperties> = () => {
  const { collectionSlug, savedDocumentData } = useDocumentInfo();
  const { code: locale } = useLocale();
  const { theme } = useTheme();

  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [expirySeconds, setExpirySeconds] = useState<number>(86_400); // Default 1 day

  const [qrInputDataSource, setQrInputDataSource] = useState<
    | {
        qrCodeContent: string;
        displayURL: string;
      }
    | undefined
  >();
  const [isPreparingQrData, setIsPreparingQrData] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
    if (open && collectionSlug && locale && savedDocumentData) {
      const prepare = async (): Promise<void> => {
        setIsPreparingQrData(true);
        setQrInputDataSource(undefined);
        try {
          const data = await prepareQRCodeData(
            collectionSlug as CollectionSlug,
            locale as Locale,
            savedDocumentData,
            expirySeconds,
            environmentVariables.NEXT_PUBLIC_APP_HOST_URL,
          );
          setQrInputDataSource(data);
        } catch (error) {
          console.error('Error preparing QR data:', error);
          setQrInputDataSource(undefined);
        } finally {
          setIsPreparingQrData(false);
        }
      };
      prepare().catch(console.error);
    }
  }, [open, collectionSlug, locale, savedDocumentData, expirySeconds]);

  const {
    data: qrImageData,
    isLoading: isLoadingQRCodeImage,
    isError: isErrorQRCodeImage,
    isSuccess: isSuccessQRCodeImage,
  } = useQuery<string, Error>({
    queryKey: ['qrCodeImage', qrInputDataSource?.qrCodeContent, theme],
    queryFn: async () => {
      if (qrInputDataSource?.qrCodeContent == undefined) {
        throw new Error('QR code content not available for fetching.');
      }
      const response = await fetch('https://backend.qr.cevi.tools/png', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: qrInputDataSource.qrCodeContent,
          options: { color_scheme: theme === 'light' ? 'cevi' : 'white' },
        }),
      });
      if (!response.ok) {
        throw new Error(`QR code fetch failed: ${response.status}`);
      }
      const blob = await response.blob();
      const fixedBlob = new Blob([blob], { type: 'image/png' });
      return URL.createObjectURL(fixedBlob);
    },
    enabled: !(qrInputDataSource?.qrCodeContent == undefined) && open,
    refetchInterval: open ? 60_000 : false,
    staleTime: 50_000,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  const previousQrImageData = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (previousQrImageData.current != undefined && previousQrImageData.current !== qrImageData) {
      URL.revokeObjectURL(previousQrImageData.current);
    }
    previousQrImageData.current = qrImageData;

    return (): void => {
      if (previousQrImageData.current != undefined) {
        URL.revokeObjectURL(previousQrImageData.current);
        previousQrImageData.current = undefined;
      }
    };
  }, [qrImageData]);

  const handleCopy: MouseEventHandler<HTMLButtonElement> = useCallback(
    (event) => {
      if (qrInputDataSource?.displayURL != undefined) {
        navigator.clipboard
          .writeText(qrInputDataSource.displayURL)
          .then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          })
          .catch(console.error);
      }
      event.preventDefault();
    },
    [qrInputDataSource?.displayURL],
  );

  const handleExpiryChange = (event: ChangeEvent<HTMLSelectElement>): void => {
    setExpirySeconds(Number(event.target.value));
    // The useEffect for preparing QR data will pick up this change.
  };

  const displayUrl = qrInputDataSource?.displayURL ?? '';
  const isLoading = isPreparingQrData || (isLoadingQRCodeImage && !isSuccessQRCodeImage);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <FormSubmit
          icon={<Eye className="h-6 w-6" />}
          iconPosition="left"
          buttonStyle="tab"
          onClick={() => {
            if (!open) setOpen(true);
          }}
        >
          {previewLinkText[locale as Locale]} ({locale.toUpperCase()})
        </FormSubmit>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-96 rounded-md border-gray-200 bg-white text-gray-900 shadow-lg dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100">
        <DropdownMenuLabel className="px-2 py-1.5 font-semibold">
          {previewLinkTextLong[locale as Locale]} {locale.toUpperCase()}
        </DropdownMenuLabel>
        <div className="flex flex-col items-center gap-3 p-2">
          <QRCodeImage
            qrImageSrc={qrImageData}
            fullURL={displayUrl}
            copied={copied}
            handleCopy={handleCopy}
            isLoading={isLoading}
            locale={locale as Locale}
          />
          {isErrorQRCodeImage && !isLoading && (
            <p className="px-2 text-center text-xs text-red-500 dark:text-red-400">
              Fehler beim Laden des QR-Codes. Bitte versuchen Sie es später erneut.
            </p>
          )}
          <ExpiryDropdown
            locale={locale as Locale}
            expirySeconds={expirySeconds}
            handleExpiryChange={handleExpiryChange}
          />
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default QRCode;
