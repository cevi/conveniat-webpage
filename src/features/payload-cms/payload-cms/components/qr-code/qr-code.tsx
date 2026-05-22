'use client';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  localeNames,
  previewLinkTextLong,
  qrCodeLoadingText,
  sharePreviewLinkText,
} from '@/features/payload-cms/payload-cms/components/qr-code/constants';
import { ExpiryDropdown } from '@/features/payload-cms/payload-cms/components/qr-code/expiry-dropdown';
import { QRCodeImage } from '@/features/payload-cms/payload-cms/components/qr-code/qr-code-image';
import { useQRCodeState } from '@/features/payload-cms/payload-cms/components/qr-code/use-qr-code-state';
import { documentControlButtonClasses } from '@/features/payload-cms/payload-cms/components/shared/document-control-button-styles';
import type { Locale } from '@/types/types';
import { Button as PayloadButton, useDocumentInfo, useLocale, useTheme } from '@payloadcms/ui';
import { Share2 } from 'lucide-react';
import React, { useState } from 'react';

/**
 * Properties for the QRCode component.
 */
type QRCodeProperties = object;

/**
 * The main QRCode component integrated into the Payload CMS document editing interface.
 * Implements a dropdown menu containing a custom-generated, Cevi-branded QR code that maps
 * to the document's localized preview URL or short redirect link. Includes customizable
 * preview token expiration and responsive light/dark theme schemes.
 *
 * This component acts as a presentational layer, delegating its state and network fetches
 * to the `useQRCodeState` hook.
 */
const QRCode: React.FC<QRCodeProperties> = () => {
  const { collectionSlug, savedDocumentData } = useDocumentInfo();
  const { code: locale } = useLocale();
  const { theme } = useTheme();

  const [open, setOpen] = useState(false);
  const createRedirectQR = (collectionSlug && collectionSlug === 'go') ?? false;

  const {
    qrImageData,
    isLoading,
    isError,
    displayUrl,
    copied,
    handleCopy,
    handleExpiryChange,
    expirySeconds,
  } = useQRCodeState({
    open,
    collectionSlug,
    locale: locale as Locale,
    savedDocumentData,
    theme,
    createRedirectQR,
  });

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <PayloadButton
          buttonStyle="transparent"
          size="medium"
          className={documentControlButtonClasses.iconOnly()}
          type="button"
          onClick={() => {
            if (!open) setOpen(true);
          }}
          tooltip={
            createRedirectQR
              ? qrCodeLoadingText[locale as Locale]
              : sharePreviewLinkText[locale as Locale]
          }
        >
          <Share2 className="h-4 w-4" />
        </PayloadButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-96 rounded-md border-gray-200 bg-white text-gray-900 shadow-lg dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100">
        <DropdownMenuLabel className="px-2 py-1.5 font-semibold">
          {createRedirectQR ? (
            <>{qrCodeLoadingText[locale as Locale]}</>
          ) : (
            <>
              {previewLinkTextLong[locale as Locale]} {localeNames[locale as Locale]}
            </>
          )}
        </DropdownMenuLabel>
        <div className="flex flex-col items-center gap-3 p-2">
          <QRCodeImage
            qrImageSrc={qrImageData}
            fullURL={displayUrl}
            copied={copied}
            handleCopy={handleCopy}
            isLoading={isLoading}
            locale={locale as Locale}
            isError={isError}
          />
          {isError && !isLoading && (
            <p className="px-2 text-center text-xs text-red-500 dark:text-red-400">
              Fehler beim Laden des QR-Codes. Bitte versuchen Sie es später erneut.
            </p>
          )}
          {!createRedirectQR && (
            <ExpiryDropdown
              locale={locale as Locale}
              expirySeconds={expirySeconds}
              handleExpiryChange={handleExpiryChange}
            />
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default QRCode;
