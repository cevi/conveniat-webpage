import { Button } from '@/components/ui/buttons/button';
import type { Locale, StaticTranslationString } from '@/types/types';
import { Check, Copy } from 'lucide-react';
import Image from 'next/image';
import type { MouseEventHandler } from 'react';
import React from 'react';

const linkLoadingText: StaticTranslationString = { de: 'Link', fr: 'Lien', en: 'Link' };

/**
 * Properties definition for the QRCodeImage component.
 */
interface QRCodeImageProperties {
  /** The source URL or inline SVG string representing the QR code. */
  qrImageSrc: string | undefined;
  /** The full invitation/preview URL displayed in the text input field. */
  fullURL?: string | undefined;
  /** Whether the full URL has been copied to the clipboard. */
  copied: boolean;
  /** Callback function executed when clicking the copy button. */
  handleCopy?: MouseEventHandler<HTMLButtonElement> | undefined;
  /** Active loading state indicator. */
  isLoading: boolean;
  /** The active locale (de, fr, en). */
  locale?: Locale;
  /** Active error state indicator. */
  isError?: boolean;
}

/**
 * A beautiful presentation component that renders a QR code.
 * Displays a pulse-animated loading skeleton while fetching from the backend API,
 * handles rendering of inline raw SVGs or fallback standard images, and provides
 * an input field to display and copy the full URL string to the clipboard.
 */
export const QRCodeImage: React.FC<QRCodeImageProperties> = ({
  qrImageSrc,
  fullURL,
  copied,
  handleCopy,
  isLoading,
  locale = 'en',
  isError = false,
}) => {
  const hasValidSvg = typeof qrImageSrc === 'string' && qrImageSrc.includes('<svg');
  const showLoading =
    !hasValidSvg &&
    (isLoading ||
      (!isError && (!qrImageSrc || qrImageSrc === 'undefined' || qrImageSrc === 'null')));

  if (showLoading) {
    return (
      <>
        <div className="flex h-[200px] w-[200px] items-center justify-center rounded-md bg-gray-50 p-2 dark:bg-gray-100">
          <svg
            viewBox="0 0 100 100"
            className="h-full w-full animate-pulse text-gray-200 dark:text-gray-300"
            fill="currentColor"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Top-Left Finder Pattern */}
            <rect
              x="8"
              y="8"
              width="24"
              height="24"
              rx="4"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
            />
            <rect x="14" y="14" width="12" height="12" rx="2" />

            {/* Top-Right Finder Pattern */}
            <rect
              x="68"
              y="8"
              width="24"
              height="24"
              rx="4"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
            />
            <rect x="74" y="14" width="12" height="12" rx="2" />

            {/* Bottom-Left Finder Pattern */}
            <rect
              x="8"
              y="68"
              width="24"
              height="24"
              rx="4"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
            />
            <rect x="14" y="74" width="12" height="12" rx="2" />

            {/* Alignment Pattern (Bottom-Right area) */}
            <rect
              x="68"
              y="68"
              width="10"
              height="10"
              rx="2"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            />
            <rect x="71" y="71" width="4" height="4" rx="1" />

            {/* Timing and Stylized data dots */}
            <rect x="38" y="12" width="4" height="4" rx="1.5" />
            <rect x="46" y="12" width="4" height="4" rx="1.5" />
            <rect x="54" y="12" width="4" height="4" rx="1.5" />

            <rect x="12" y="38" width="4" height="4" rx="1.5" />
            <rect x="12" y="46" width="4" height="4" rx="1.5" />
            <rect x="12" y="54" width="4" height="4" rx="1.5" />

            <rect x="38" y="38" width="6" height="6" rx="2" />
            <rect x="50" y="38" width="4" height="4" rx="1.5" />
            <rect x="58" y="38" width="8" height="4" rx="1.5" />

            <rect x="38" y="48" width="4" height="4" rx="1.5" />
            <rect x="46" y="48" width="8" height="6" rx="2" />
            <rect x="58" y="48" width="4" height="4" rx="1.5" />
            <rect x="66" y="48" width="6" height="6" rx="2" />
            <rect x="76" y="48" width="4" height="4" rx="1.5" />
            <rect x="84" y="48" width="4" height="4" rx="1.5" />

            <rect x="38" y="58" width="8" height="4" rx="1.5" />
            <rect x="50" y="58" width="4" height="4" rx="1.5" />
            <rect x="58" y="58" width="6" height="6" rx="2" />
            <rect x="68" y="58" width="4" height="4" rx="1.5" />
            <rect x="76" y="58" width="8" height="4" rx="1.5" />

            <rect x="38" y="68" width="4" height="4" rx="1.5" />
            <rect x="46" y="68" width="6" height="6" rx="2" />
            <rect x="56" y="68" width="4" height="4" rx="1.5" />

            <rect x="38" y="78" width="8" height="4" rx="1.5" />
            <rect x="50" y="78" width="4" height="4" rx="1.5" />
            <rect x="58" y="78" width="4" height="8" rx="1.5" />
            <rect x="82" y="78" width="6" height="6" rx="2" />

            <rect x="38" y="88" width="4" height="4" rx="1.5" />
            <rect x="46" y="88" width="4" height="4" rx="1.5" />
            <rect x="66" y="88" width="8" height="4" rx="1.5" />
            <rect x="78" y="88" width="4" height="4" rx="1.5" />
          </svg>
        </div>
        {fullURL != undefined && (
          <div className="flex h-10 w-full animate-pulse items-center justify-center rounded-md bg-gray-100 dark:bg-gray-700">
            <span className="font-semibold text-gray-500 dark:text-gray-300">
              {linkLoadingText[locale]}
            </span>
          </div>
        )}
      </>
    );
  }

  // Determine if the src is an inline SVG or a standard URL
  const isSvg = qrImageSrc?.includes('<svg') ?? false;

  let qrElement: React.ReactNode;
  if (isSvg && qrImageSrc) {
    qrElement = (
      <div
        className="h-[200px] w-[200px] [&>svg]:h-full [&>svg]:w-full"
        dangerouslySetInnerHTML={{ __html: qrImageSrc }}
      />
    );
  } else if (qrImageSrc) {
    qrElement = <Image src={qrImageSrc} height="200" width="200" alt="link-qr-code" />;
  }

  return (
    <>
      {qrElement}
      {fullURL != undefined && (
        <div className="relative w-full">
          <input
            className="w-full rounded-md border border-solid border-gray-300 p-2 pr-10 text-sm shadow-none outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
            readOnly
            value={fullURL}
          />
          <Button
            variant="ghost"
            size="sm"
            className="absolute top-1/2 right-1 -translate-y-1/2 transform"
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
      )}
    </>
  );
};
