'use client';

import { isAppOffered } from '@/components/get-the-app';
import { environmentVariables } from '@/config/environment-variables';
import { useChatId } from '@/features/chat/context/chat-id-context';
import { useCurrentLocale } from '@/hooks/use-current-locale';
import { useIsDesktop } from '@/hooks/use-is-desktop';
import { fetchCeviQrCodeSvg } from '@/lib/cevi-qr-code';
import type { Locale, StaticTranslationString } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { useQuery } from '@tanstack/react-query';
import type React from 'react';

const titleText: StaticTranslationString = {
  de: 'Auf dem Handy weiterlesen',
  en: 'Continue on your phone',
  fr: 'Continuer sur ton téléphone',
};

const openChatText: StaticTranslationString = {
  de: 'Scanne den Code, um diesen Chat in der App zu öffnen. Dort bekommst du Mitteilungen.',
  en: 'Scan the code to open this chat in the app. That is where you get notifications.',
  fr: 'Scanne le code pour ouvrir ce chat dans l’app. C’est là que tu reçois les notifications.',
};

const openChatsText: StaticTranslationString = {
  de: 'Scanne den Code, um deine Chats in der App zu öffnen. Dort bekommst du Mitteilungen.',
  en: 'Scan the code to open your chats in the app. That is where you get notifications.',
  fr: 'Scanne le code pour ouvrir tes chats dans l’app. C’est là que tu reçois les notifications.',
};

const qrCodeAltText: StaticTranslationString = {
  de: 'QR-Code zu diesem Chat',
  en: 'QR code for this chat',
  fr: 'Code QR de ce chat',
};

/** Routes under `/app/chat` that the chat id context reads as an id, though they name no chat. */
const NOT_A_CHAT = new Set(['new', 'new-chat-with-user']);

/**
 * The foot of the chat list on a desktop browser: a Cevi QR code that opens the chat beside it,
 * or the chats without one, on the phone. The app lives on the phone, not on the computer the
 * user sits at, so the way there is a code to scan rather than a store link. The link carries no locale: the phone
 * opens it in its own language. Without the code, offline say, or in a deployment that offers no
 * app, the card stays away.
 */
export const ContinueOnPhoneCard: React.FC = () => {
  const locale = useCurrentLocale(i18nConfig) as Locale;
  const isDesktop = useIsDesktop();
  const openChatId = useChatId() as string | undefined;
  const chatId = openChatId !== undefined && NOT_A_CHAT.has(openChatId) ? undefined : openChatId;

  const path = chatId === undefined ? '/app/chat' : `/app/chat/${encodeURIComponent(chatId)}`;
  const url = `${environmentVariables.NEXT_PUBLIC_APP_HOST_URL}${path}`;

  const qrCode = useQuery({
    queryKey: ['ceviQrCodeSvg', url],
    meta: { persist: false },
    queryFn: () => fetchCeviQrCodeSvg(url),
    // a phone never shows the card, so it never asks for a code
    enabled: isDesktop && isAppOffered,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  if (!isDesktop || !isAppOffered || qrCode.isError) return <></>;

  return (
    <aside className="bg-quiet m-4 flex shrink-0 items-center gap-3.5 rounded-[14px] p-3.5">
      <div className="h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-white">
        {qrCode.data === undefined ? (
          <div className="bg-chip h-full w-full animate-pulse" />
        ) : (
          // an SVG loaded as an image runs neither scripts nor event handlers, whatever the
          // QR service answered, so it needs no sanitising
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(qrCode.data)}`}
            alt={qrCodeAltText[locale]}
            className="h-full w-full"
          />
        )}
      </div>
      <div className="min-w-0">
        <h2 className="text-[15px] leading-5 font-semibold text-green-900">{titleText[locale]}</h2>
        <p className="mt-1 text-[13px] leading-[18px] text-green-700">
          {chatId === undefined ? openChatsText[locale] : openChatText[locale]}
        </p>
      </div>
    </aside>
  );
};
