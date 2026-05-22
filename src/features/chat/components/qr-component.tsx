'use client';

import { QRCodeImage } from '@/features/payload-cms/payload-cms/components/qr-code/qr-code-image';
import type { Locale, StaticTranslationString } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { useCurrentLocale } from 'next-i18n-router/client';
import React, { useState } from 'react';

import { APP_USER_AGENT, QR_CODE_BACKEND_URL } from '@/config/constants';
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
  initialSvg?: string | undefined;
}> = ({ url, initialSvg }) => {
  const locale = useCurrentLocale(i18nConfig) as Locale;
  const [open, setOpen] = useState(false);

  const qrCodeContent = `${
    environmentVariables.NEXT_PUBLIC_ENABLE_CON27_SHORT_URLS
      ? 'https://con27.ch'
      : environmentVariables.NEXT_PUBLIC_APP_HOST_URL
  }/app/chat/new-chat-with-user/${url}`;

  const {
    data: qrImageData,
    isLoading,
    isError: isErrorQRCodeImage,
  } = useQuery({
    queryKey: ['qrCodeSvgImage', qrCodeContent],
    meta: { persist: false },
    queryFn: async () => {
      if (initialSvg?.includes('<svg')) {
        return initialSvg;
      }
      const response = await fetch(`${QR_CODE_BACKEND_URL}/svg`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': APP_USER_AGENT,
        },
        body: JSON.stringify({
          text: qrCodeContent,
          options: { color_scheme: 'cevi' },
        }),
      });
      if (!response.ok) {
        throw new Error(`QR code fetch failed: ${response.status}`);
      }
      const rawSvg = await response.text();
      const processed = rawSvg
        .replace(/b(['"])([\s\S]*?)\1/, (_, _q: string, p1: string) => {
          return p1
            .replaceAll(String.raw`\n`, '\n')
            .replaceAll(String.raw`\'`, "'")
            .replaceAll(String.raw`\"`, '"');
        })
        .replaceAll('ns0:', '');
      return processed;
    },
    enabled: open,
    ...(initialSvg?.includes('<svg') ? { initialData: initialSvg } : {}),
    refetchInterval: false,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    retry: 1,
  });

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
              isError={isErrorQRCodeImage}
            />
            {isErrorQRCodeImage && (
              <p className="px-2 text-center text-xs text-red-500">
                Fehler beim Laden des QR-Codes. Bitte versuchen Sie es später erneut.
              </p>
            )}
          </div>

          <h2 className="text-md mb-4 text-center font-bold select-none">
            {qrCodeTitleText[locale]}
          </h2>
        </ChatDialogContent>
      </ChatDialog>
    </>
  );
};
