'use client';

import { QRCodeImage } from '@/features/payload-cms/payload-cms/components/qr-code/qr-code-image';
import type { Locale, StaticTranslationString } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { useCurrentLocale } from 'next-i18n-router/client';
import React, { useState } from 'react';

import { APP_USER_AGENT, QR_CODE_BACKEND_URL } from '@/config/constants';
import {
  ChatDialog,
  ChatDialogContent,
  ChatDialogHeader,
  ChatDialogTitle,
} from '@/features/chat/components/ui/chat-dialog';
import { useChatInviteUrl } from '@/features/chat/hooks/use-chat-invite-url';
import { isRateLimitError } from '@/features/chat/utils/send-errors';
import { FormSubmit } from '@payloadcms/ui';
import { useQuery } from '@tanstack/react-query';
import { QrCode } from 'lucide-react';

const qrCodeTitleText: StaticTranslationString = {
  de: 'Scannen lassen, um einen Chat zu starten.',
  fr: 'Faites-le scanner pour démarrer une discussion.',
  en: 'Let it be scanned to start a chat.',
};

const qrCodeErrorText: StaticTranslationString = {
  de: 'Der QR-Code konnte nicht geladen werden. Bitte versuche es später erneut.',
  fr: 'Impossible de charger le code QR. Veuillez réessayer plus tard.',
  en: 'The QR code could not be loaded. Please try again later.',
};

/** Renders a QR code for `text` through the Cevi QR code backend. */
const fetchQrCodeSvg = async (text: string): Promise<string> => {
  const response = await fetch(`${QR_CODE_BACKEND_URL}/svg`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': APP_USER_AGENT,
    },
    body: JSON.stringify({
      text,
      options: { color_scheme: 'cevi' },
    }),
  });
  if (!response.ok) {
    throw new Error(`QR code fetch failed: ${response.status}`);
  }
  const rawSvg = await response.text();
  return rawSvg
    .replaceAll(/b(['"])([\s\S]*?)\1/g, (_, _q: string, p1: string) => {
      return p1
        .replaceAll(String.raw`\n`, '\n')
        .replaceAll(String.raw`\'`, "'")
        .replaceAll(String.raw`\"`, '"');
    })
    .replaceAll('ns0:', '');
};

/**
 * The QR code itself. Lives inside the dialog content, which mounts on every opening, so
 * each opening shows a new single-use code.
 */
const ChatInviteQrCode: React.FC<{ locale: Locale }> = ({ locale }) => {
  const inviteUrl = useChatInviteUrl();

  const qrImage = useQuery({
    queryKey: ['qrCodeSvgImage', inviteUrl.data],
    meta: { persist: false },
    queryFn: () => fetchQrCodeSvg(inviteUrl.data ?? ''),
    enabled: inviteUrl.data !== undefined,
    gcTime: 0,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  const isError = inviteUrl.isError || qrImage.isError;
  // the rate limit's message is already in the user's language and says how long to wait
  const errorText = isRateLimitError(inviteUrl.error)
    ? inviteUrl.error.message
    : qrCodeErrorText[locale];

  return (
    <div className="flex flex-col items-center gap-3 p-2">
      <QRCodeImage
        qrImageSrc={qrImage.data}
        copied={false}
        isLoading={!isError && qrImage.data === undefined}
        locale={locale}
        isError={isError}
      />
      {isError && <p className="px-2 text-center text-xs text-red-500">{errorText}</p>}
    </div>
  );
};

export const QRCodeClientComponent: React.FC = () => {
  const locale = useCurrentLocale(i18nConfig) as Locale;
  const [open, setOpen] = useState(false);

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

          <ChatInviteQrCode locale={locale} />

          <h2 className="text-md mb-4 text-center font-bold select-none">
            {qrCodeTitleText[locale]}
          </h2>
        </ChatDialogContent>
      </ChatDialog>
    </>
  );
};
