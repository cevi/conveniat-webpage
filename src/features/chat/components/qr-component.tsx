'use client';

import { QRCodeImage } from '@/features/payload-cms/payload-cms/components/qr-code/qr-code';
import type { Locale, StaticTranslationString } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { useCurrentLocale } from 'next-i18n-router/client';
import React, { useEffect, useRef, useState } from 'react';

import { environmentVariables } from '@/config/environment-variables';
import {
  ChatDialog,
  ChatDialogContent,
  ChatDialogHeader,
  ChatDialogTitle,
} from '@/features/chat/components/ui/chat-dialog';
import { FormSubmit } from '@payloadcms/ui';
import { useQuery } from '@tanstack/react-query';
import { QrCode } from 'lucide-react';

const qrCodeTitleText: StaticTranslationString = {
  de: 'Scannen lassen, um einen Chat zu starten.',
  fr: 'Faites-le scanner pour démarrer une discussion.',
  en: 'Let it be scanned to start a chat.',
};

export const QRCodeClientComponent: React.FC<{
  url: string;
}> = ({ url }) => {
  const locale = useCurrentLocale(i18nConfig) as Locale;
  const [open, setOpen] = useState(false);

  const [qrInputDataSource, setQrInputDataSource] = useState<
    | {
        qrCodeContent: string;
      }
    | undefined
  >();
  const [isPreparingQrData, setIsPreparingQrData] = useState(false);

  useEffect(() => {
    if (open) {
      const prepare = (): void => {
        setIsPreparingQrData(true);
        setQrInputDataSource(undefined);
        try {
          const data = {
            qrCodeContent: `${environmentVariables.NEXT_PUBLIC_ENABLE_CON27_SHORT_URLS ? 'https://con27.ch' : environmentVariables.NEXT_PUBLIC_APP_HOST_URL}/app/chat/new-chat-with-user/${url}`,
          };
          setQrInputDataSource(data);
        } catch (error) {
          console.error('Error preparing QR data:', error);
          setQrInputDataSource(undefined);
        } finally {
          setIsPreparingQrData(false);
        }
      };
      prepare();
    }
  }, [open, locale, url]);

  const {
    data: qrImageData,
    isLoading: isLoadingQRCodeImage,
    isError: isErrorQRCodeImage,
    isSuccess: isSuccessQRCodeImage,
  } = useQuery<string, Error>({
    queryKey: ['qrCodeImage', qrInputDataSource?.qrCodeContent],
    queryFn: async () => {
      if (qrInputDataSource?.qrCodeContent == undefined) {
        throw new Error('QR code content not available for fetching.');
      }
      const response = await fetch('https://backend.qr.cevi.tools/png', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: qrInputDataSource.qrCodeContent,
          options: { color_scheme: 'cevi' },
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

  return (
    <>
      <div onClick={() => setOpen(true)}>
        <FormSubmit
          icon={<QrCode className="h-6 w-6 cursor-pointer" />}
          iconPosition="left"
          buttonStyle="tab"
        />
      </div>

      <ChatDialog open={open} onOpenChange={setOpen}>
        <ChatDialogContent className="sm:max-w-md">
          <ChatDialogHeader className="sr-only">
            <ChatDialogTitle>{qrCodeTitleText[locale]}</ChatDialogTitle>
          </ChatDialogHeader>

          <div className="flex flex-col items-center gap-3 p-2">
            <QRCodeImage
              qrImageSrc={qrImageData}
              copied={false}
              isLoading={isLoading}
              locale={locale}
            />
            {isErrorQRCodeImage && (
              <p className="px-2 text-center text-xs text-red-500">
                Fehler beim Laden des QR-Codes. Bitte versuchen Sie es später erneut.
              </p>
            )}
          </div>

          <h2 className="text-md mb-4 text-center font-bold">{qrCodeTitleText[locale]}</h2>
        </ChatDialogContent>
      </ChatDialog>
    </>
  );
};
