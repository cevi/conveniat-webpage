'use client';

import { QRCodeImage } from '@/features/payload-cms/payload-cms/components/qr-code/qr-code';
import type { Locale, StaticTranslationString } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { useCurrentLocale } from 'next-i18n-router/client';
import React from 'react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { environmentVariables } from '@/config/environment-variables';
import { FormSubmit, useTheme } from '@payloadcms/ui';
import { useQuery } from '@tanstack/react-query'; // Added for TanStack Query
import { QrCode } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

const qrCodeLoadingText: StaticTranslationString = {
  de: 'QR-Code',
  fr: 'QR-Code',
  en: 'QR Code',
};

export const QRCodeClientComponent: React.FC<{
  url: string;
}> = ({ url }) => {
  const locale = useCurrentLocale(i18nConfig) as Locale;

  const { theme } = useTheme();

  const [open, setOpen] = useState(false);

  const [qrInputDataSource, setQrInputDataSource] = useState<
    | {
        qrCodeContent: string;
      }
    | undefined
  >();
  const [isPreparingQrData, setIsPreparingQrData] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
    if (open) {
      const prepare = async (): Promise<void> => {
        setIsPreparingQrData(true);
        setQrInputDataSource(undefined);
        try {
          const data = {
            qrCodeContent: `${environmentVariables.NEXT_PUBLIC_APP_HOST_URL}/app/chat/new-chat-with-user/${url}`,
          };

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
  }, [open, locale, url]);

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

  const isLoading = isPreparingQrData || (isLoadingQRCodeImage && !isSuccessQRCodeImage);

  if (isLoading) {
    return <></>;
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <FormSubmit
          icon={<QrCode className="h-6 w-6" />}
          iconPosition="left"
          buttonStyle="tab"
          onClick={() => {
            if (!open) setOpen(true);
          }}
        >
          {/*qrCodeLoadingText[locale as Locale]*/}
        </FormSubmit>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-96 rounded-md border-gray-200 bg-white text-gray-900 shadow-lg dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100">
        <DropdownMenuLabel className="px-2 py-1.5 font-semibold">
          {qrCodeLoadingText[locale as Locale]}
        </DropdownMenuLabel>
        <div className="flex flex-col items-center gap-3 p-2">
          <QRCodeImage
            qrImageSrc={qrImageData}
            copied={false}
            isLoading={isLoading}
            locale={locale as Locale}
          />
          {isErrorQRCodeImage && (
            <p className="px-2 text-center text-xs text-red-500 dark:text-red-400">
              Fehler beim Laden des QR-Codes. Bitte versuchen Sie es später erneut.
            </p>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
