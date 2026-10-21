'use client';

import { BottomSheet } from '@/components/ui/bottom-sheet';
import { segmentClassName, segmentedTrackClassName } from '@/components/ui/segmented-control';
import { APP_USER_AGENT, QR_CODE_BACKEND_URL } from '@/config/constants';
import { environmentVariables } from '@/config/environment-variables';
import { useChatInviteUrl } from '@/features/chat/hooks/use-chat-invite-url';
import { readChatInvitePath } from '@/features/chat/utils/chat-invite-link';
import { isRateLimitError } from '@/features/chat/utils/send-errors';
import { splitDisplayName } from '@/features/chat/utils/split-display-name';
import { QRCodeImage } from '@/features/payload-cms/payload-cms/components/qr-code/qr-code-image';
import { useQrScanner } from '@/hooks/use-qr-scanner';
import type { Locale, StaticTranslationString } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { useQuery } from '@tanstack/react-query';
import { QrCode, ScanLine } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useCurrentLocale } from 'next-i18n-router/client';
import { useRouter, useSearchParams } from 'next/navigation';
import type React from 'react';
import { useCallback, useState } from 'react';

/** What the sheet shows: the own code, or the camera to read someone else's. */
export type ChatQrTab = 'mine' | 'scan';

/** The search parameter that opens the sheet, e.g. `/app/chat?qr=mine` from Home. */
const QR_PARAMETER = 'qr';

const text = {
  title: { de: 'QR-Code', fr: 'Code QR', en: 'QR code' },
  myCode: { de: 'Mein Code', fr: 'Mon code', en: 'My code' },
  scan: { de: 'Code scannen', fr: 'Scanner un code', en: 'Scan a code' },
  hint: {
    de: 'Lass diesen Code scannen, um einen Chat mit dir zu starten.',
    fr: 'Fais scanner ce code pour démarrer un chat avec toi.',
    en: 'Let someone scan this code to start a chat with you.',
  },
  qrError: {
    de: 'Der QR-Code konnte nicht geladen werden. Bitte versuche es später erneut.',
    fr: 'Impossible de charger le code QR. Veuillez réessayer plus tard.',
    en: 'The QR code could not be loaded. Please try again later.',
  },
  aim: {
    de: 'Richte die Kamera auf den Code einer anderen Person.',
    fr: 'Dirige la caméra vers le code d’une autre personne.',
    en: 'Point the camera at someone else’s code.',
  },
  starting: { de: 'Kamera startet …', fr: 'La caméra démarre …', en: 'Starting the camera …' },
  notAChatCode: {
    de: 'Dieser Code startet keinen Chat. Scanne den Code aus «Mein Code» einer anderen Person.',
    fr: 'Ce code ne démarre pas de chat. Scanne le code « Mon code » d’une autre personne.',
    en: 'This code does not start a chat. Scan the “My code” of someone else.',
  },
  denied: {
    de: 'Die App darf die Kamera nicht benutzen. Erlaube es in den Einstellungen des Browsers oder scanne den Code mit der Kamera-App.',
    fr: 'L’app n’a pas accès à la caméra. Autorise-la dans les réglages du navigateur ou scanne le code avec l’app caméra.',
    en: 'The app may not use the camera. Allow it in the browser settings or scan the code with the camera app.',
  },
  unsupported: {
    de: 'Dieser Browser kann keine QR-Codes lesen. Scanne den Code mit der Kamera-App deines Telefons.',
    fr: 'Ce navigateur ne lit pas les codes QR. Scanne le code avec l’app caméra de ton téléphone.',
    en: 'This browser cannot read QR codes. Scan the code with your phone’s camera app.',
  },
} satisfies Record<string, StaticTranslationString>;

/** Renders a QR code for `text` through the Cevi QR code backend. */
const fetchQrCodeSvg = async (value: string): Promise<string> => {
  const response = await fetch(`${QR_CODE_BACKEND_URL}/svg`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': APP_USER_AGENT,
    },
    body: JSON.stringify({
      text: value,
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
 * The QR code itself. It mounts with the sheet, so each opening shows a new single-use code,
 * and stays mounted while the scanner is shown, so switching back does not mint another one.
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
    : text.qrError[locale];

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="border-line flex items-center justify-center rounded-2xl border bg-white p-4">
        <QRCodeImage
          qrImageSrc={qrImage.data}
          copied={false}
          isLoading={!isError && qrImage.data === undefined}
          locale={locale}
          isError={isError}
        />
      </div>
      {isError && <p className="px-2 text-center text-[13px] text-green-700">{errorText}</p>}
    </div>
  );
};

/** The own code, the name it belongs to and what to do with it. */
const MyCode: React.FC<{ locale: Locale; hidden: boolean }> = ({ locale, hidden }) => {
  const { data: session } = useSession();
  const { primary, secondary } = splitDisplayName(session?.user.name ?? '');

  return (
    <div hidden={hidden} className="flex flex-col items-center gap-1 pt-5 text-center">
      <ChatInviteQrCode locale={locale} />
      {primary !== '' && (
        <p className="font-heading text-heading mt-3 text-lg font-extrabold">{primary}</p>
      )}
      {secondary !== undefined && <p className="text-[13px] text-green-700">{secondary}</p>}
      <p className="mt-3 max-w-xs text-[15px] text-green-700">{text.hint[locale]}</p>
    </div>
  );
};

/** The hosts a chat code may link to: this app, its configured host and the short domain. */
const inviteOrigins = (): string[] => [
  globalThis.location.origin,
  environmentVariables.NEXT_PUBLIC_APP_HOST_URL,
  ...(environmentVariables.NEXT_PUBLIC_ENABLE_CON27_SHORT_URLS ? ['https://con27.ch'] : []),
];

/**
 * The live camera; mounted only while "Code scannen" is chosen, so the camera is off
 * otherwise. A chat code opens its chat, anything else is refused with a hint.
 */
const ChatScanner: React.FC<{ locale: Locale; onScanned: (path: string) => void }> = ({
  locale,
  onScanned,
}) => {
  const [refused, setRefused] = useState(false);
  const onResult = useCallback(
    (value: string): boolean => {
      const path = readChatInvitePath(value, inviteOrigins());
      if (path === undefined) {
        setRefused(true);
        return false;
      }
      onScanned(path);
      return true;
    },
    [onScanned],
  );
  const { state, videoReference } = useQrScanner(onResult);

  if (state === 'unsupported' || state === 'denied') {
    return (
      <div className="flex flex-col items-center gap-3 px-2 pt-8 pb-4 text-center text-[15px] text-green-700">
        <ScanLine className="text-rail-node h-10 w-10" aria-hidden="true" />
        {state === 'denied' ? text.denied[locale] : text.unsupported[locale]}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 pt-5">
      <div className="relative overflow-hidden rounded-2xl bg-gray-950">
        <video
          ref={videoReference}
          className="aspect-square w-full object-cover"
          muted
          playsInline
        />
        <div className="pointer-events-none absolute inset-10 rounded-2xl border-4 border-white/80" />
      </div>
      <p aria-live="polite" className="text-center text-[15px] text-green-700">
        {state === 'starting' && text.starting[locale]}
        {state === 'scanning' && (refused ? text.notAChatCode[locale] : text.aim[locale])}
      </p>
    </div>
  );
};

/**
 * The QR code sheet: the own code to show, or the camera to read someone else's. Used by the
 * "Mein Code" button of the chat list and by "QR-Code scannen" when starting a chat.
 */
export const ChatQrSheet: React.FC<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tab: ChatQrTab;
  onTabChange: (tab: ChatQrTab) => void;
}> = ({ open, onOpenChange, tab, onTabChange }) => {
  const locale = useCurrentLocale(i18nConfig) as Locale;
  const router = useRouter();

  const onScanned = useCallback(
    (path: string): void => {
      onOpenChange(false);
      router.push(path);
    },
    [onOpenChange, router],
  );

  const tabs: { value: ChatQrTab; label: string; icon: typeof QrCode }[] = [
    { value: 'mine', label: text.myCode[locale], icon: QrCode },
    { value: 'scan', label: text.scan[locale], icon: ScanLine },
  ];

  return (
    <BottomSheet open={open} onOpenChange={onOpenChange} title={text.title[locale]}>
      <div role="group" aria-label={text.title[locale]} className={segmentedTrackClassName}>
        {tabs.map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            type="button"
            aria-pressed={tab === value}
            onClick={() => onTabChange(value)}
            className={cn(segmentClassName(tab === value), 'flex-1 gap-2 text-sm font-semibold')}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
            {label}
          </button>
        ))}
      </div>

      {/* the sheet's content mounts with every opening, and with it a new code */}
      <MyCode locale={locale} hidden={tab !== 'mine'} />
      {tab === 'scan' && <ChatScanner locale={locale} onScanned={onScanned} />}
    </BottomSheet>
  );
};

const toTab = (value: string | null): ChatQrTab | undefined =>
  value === 'mine' || value === 'scan' ? value : undefined;

/**
 * The "Mein Code" button of the chat list and the sheet it opens. A link to `/app/chat?qr=mine`
 * or `?qr=scan` opens the sheet as well; closing it drops the parameter again, so a reload or
 * the back button does not bring it back.
 */
export const QRCodeClientComponent: React.FC = () => {
  const locale = useCurrentLocale(i18nConfig) as Locale;
  const searchParameters = useSearchParams();
  const requestedTab = toTab(searchParameters.get(QR_PARAMETER));
  const [isOpenedHere, setIsOpenedHere] = useState(false);
  const [chosenTab, setChosenTab] = useState<ChatQrTab | undefined>();

  const onOpenChange = useCallback(
    (open: boolean): void => {
      setIsOpenedHere(open);
      if (open) return;
      setChosenTab(undefined);
      if (requestedTab === undefined) return;
      const url = new URL(globalThis.location.href);
      url.searchParams.delete(QR_PARAMETER);
      // the native history call keeps Next's router in sync without a round trip
      globalThis.history.replaceState(undefined, '', url);
    },
    [requestedTab],
  );

  return (
    <>
      <button
        type="button"
        onClick={() => onOpenChange(true)}
        aria-haspopup="dialog"
        aria-label={text.myCode[locale]}
        className="hover:bg-quiet flex h-11 w-11 cursor-pointer items-center justify-center rounded-full text-green-900"
      >
        <QrCode className="h-[22px] w-[22px]" aria-hidden="true" />
      </button>

      <ChatQrSheet
        open={isOpenedHere || requestedTab !== undefined}
        onOpenChange={onOpenChange}
        tab={chosenTab ?? requestedTab ?? 'mine'}
        onTabChange={setChosenTab}
      />
    </>
  );
};
