import { APP_USER_AGENT, QR_CODE_BACKEND_URL } from '@/config/constants';
import { environmentVariables } from '@/config/environment-variables';
import { prepareQRCodeData } from '@/features/payload-cms/payload-cms/components/qr-code/utils';
import type { Locale } from '@/types/types';
import { useQuery } from '@tanstack/react-query';
import type { CollectionSlug } from 'payload';
import type React from 'react';
import type { MouseEventHandler } from 'react';
import { useCallback, useEffect, useState } from 'react';

/**
 * Properties required by the `useQRCodeState` hook.
 */
export interface UseQRCodeStateProperties {
  /** Indicates whether the QR code dropdown/dialog is open. Trigger preparation and fetches only when open. */
  open: boolean;
  /** The unique collection identifier from Payload CMS. */
  collectionSlug: CollectionSlug | undefined;
  /** Active language code. */
  locale: Locale | undefined;
  /** Raw database fields of the current Payload CMS document. */
  savedDocumentData:
    | {
        seo?: { urlSlug?: string };
        id?: string;
        _localized_status?: Record<Locale, { status: string }>;
        urlSlug?: string;
      }
    | undefined;
  /** Current theme state (e.g., 'light' or 'dark') to determine the SVG fill color. */
  theme: string | undefined;
  /** Flag showing if the QR code should point to a redirect URL instead of a preview link. */
  createRedirectQR: boolean;
}

/**
 * Return type and state methods provided by the `useQRCodeState` hook.
 */
export interface UseQRCodeStateResult {
  /** The raw SVG string of the generated QR code, resolved from the backend API. */
  qrImageData: string | undefined;
  /** Indicates if the component is preparing document credentials or fetching the SVG. */
  isLoading: boolean;
  /** Indicates if the server-side backend fetch failed. */
  isError: boolean;
  /** The final readable URL that gets encoded in the QR code (and is copied to the clipboard). */
  displayUrl: string;
  /** True momentarily after the clipboard action successfully executes. */
  copied: boolean;
  /** Triggered to copy the raw destination link to the user's local clipboard. */
  handleCopy: MouseEventHandler<HTMLButtonElement>;
  /** Triggered to adjust temporary token duration times on the fly. */
  handleExpiryChange: (event: React.ChangeEvent<HTMLSelectElement>) => void;
  /** Current duration in seconds for preview token expiration. */
  expirySeconds: number;
}

/**
 * Custom hook to isolate state management, token generation, and network fetching
 * for the Cevi Payload CMS QR Code component.
 *
 * @param props - Hook arguments including collection, locale, saved document info, and theme.
 * @returns State properties, handlers, and the loading or error indicators.
 */
export const useQRCodeState = ({
  open,
  collectionSlug,
  locale,
  savedDocumentData,
  theme,
  createRedirectQR,
}: UseQRCodeStateProperties): UseQRCodeStateResult => {
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

  // Effect to resolve URL paths, slug names, and active preview tokens
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
    if (open && collectionSlug && locale && savedDocumentData) {
      const prepare = async (): Promise<void> => {
        setIsPreparingQrData(true);
        setQrInputDataSource(undefined);
        try {
          const data = await prepareQRCodeData(
            collectionSlug,
            locale,
            savedDocumentData,
            expirySeconds,
            environmentVariables.NEXT_PUBLIC_APP_HOST_URL,
            createRedirectQR,
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
  }, [open, collectionSlug, locale, savedDocumentData, expirySeconds, createRedirectQR]);

  // React Query endpoint hook to request dynamic SVG generation from the Cevi tools service
  const {
    data: qrImageData,
    isLoading: isLoadingQRCodeImage,
    isError: isErrorQRCodeImage,
  } = useQuery({
    queryKey: ['qrCodeSvgImage', qrInputDataSource?.qrCodeContent, theme],
    meta: { persist: false },
    queryFn: async () => {
      if (qrInputDataSource?.qrCodeContent == undefined) {
        throw new Error('QR code content not available for fetching.');
      }
      const response = await fetch(`${QR_CODE_BACKEND_URL}/svg`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': APP_USER_AGENT,
        },
        body: JSON.stringify({
          text: qrInputDataSource.qrCodeContent,
          options: { color_scheme: theme === 'light' ? 'cevi' : 'white' },
        }),
      });
      if (!response.ok) {
        throw new Error(`QR code fetch failed: ${response.status}`);
      }
      const rawSvg = await response.text();
      return rawSvg
        .replace(/b(['"])([\s\S]*?)\1/, (_, _q: string, p1: string) => {
          return p1
            .replaceAll(String.raw`\n`, '\n')
            .replaceAll(String.raw`\'`, "'")
            .replaceAll(String.raw`\"`, '"');
        })
        .replaceAll('ns0:', '');
    },
    enabled: !(qrInputDataSource?.qrCodeContent == undefined) && open,
    refetchInterval: false,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  // Handler to copy the generated URL to the clipboard
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
    [qrInputDataSource],
  );

  // Handler for expiry duration changes in the dropdown
  const handleExpiryChange = (event: React.ChangeEvent<HTMLSelectElement>): void => {
    setExpirySeconds(Number(event.target.value));
  };

  const displayUrl = qrInputDataSource?.displayURL ?? '';
  const isLoading = isPreparingQrData || isLoadingQRCodeImage;

  return {
    qrImageData,
    isLoading,
    isError: isErrorQRCodeImage,
    displayUrl,
    copied,
    handleCopy,
    handleExpiryChange,
    expirySeconds,
  };
};
