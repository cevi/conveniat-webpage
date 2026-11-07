'use client';

import { BottomSheet } from '@/components/ui/bottom-sheet';
import { buttonVariants } from '@/components/ui/buttons/button';
import { IconTile } from '@/components/ui/icon-tile';
import { environmentVariables } from '@/config/environment-variables';
import { useCurrentLocale } from '@/hooks/use-current-locale';
import { fetchCeviQrCodeSvg } from '@/lib/cevi-qr-code';
import type { Locale, StaticTranslationString } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { useQuery } from '@tanstack/react-query';
import { Bell, ExternalLink, Smartphone, WifiOff } from 'lucide-react';
import type React from 'react';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const text = {
  button: { de: 'App laden', en: 'Get the app', fr: 'Obtenir l’app' },
  title: { de: 'Die conveniat27 App', en: 'The conveniat27 app', fr: 'L’app conveniat27' },
  notifications: {
    de: 'Mitteilungen zu neuen Nachrichten',
    en: 'Notifications of new messages',
    fr: 'Notifications des nouveaux messages',
  },
  offline: {
    de: 'Programm, Karte und Chats auch ohne Netz',
    en: 'Programme, map and chats without a connection',
    fr: 'Programme, carte et chats même sans réseau',
  },
  appStore: { de: 'Im App Store laden', en: 'Get it on the App Store', fr: 'Sur l’App Store' },
  playStore: { de: 'Bei Google Play laden', en: 'Get it on Google Play', fr: 'Sur Google Play' },
  scan: {
    de: 'Scanne den Code mit dem Handy, um diese Seite in der App zu öffnen.',
    en: 'Scan the code with your phone to open this page in the app.',
    fr: 'Scanne le code avec ton téléphone pour ouvrir cette page dans l’app.',
  },
  qrCode: {
    de: 'QR-Code zu dieser Seite',
    en: 'QR code for this page',
    fr: 'Code QR de cette page',
  },
} satisfies Record<string, StaticTranslationString>;

/**
 * Whether this deployment offers its app at all: it does once it names the app in a store. A
 * deployment that no longer promotes an app, like konekta, sets neither link and offers nothing.
 */
export const isAppOffered =
  environmentVariables.NEXT_PUBLIC_APP_STORE_URL !== undefined ||
  environmentVariables.NEXT_PUBLIC_PLAY_STORE_URL !== undefined;

const GetTheAppContext = createContext<{ isShown: boolean; setIsShown: (shown: boolean) => void }>({
  isShown: false,
  setIsShown: () => {},
});

/** Holds whether the header offers the app, which the footer decides from the page. */
export const GetTheAppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isShown, setIsShown] = useState(false);
  return <GetTheAppContext value={{ isShown, setIsShown }}>{children}</GetTheAppContext>;
};

/** Whether the header offers the app on this page. */
export const useIsGetTheAppShown = (): boolean =>
  useContext(GetTheAppContext).isShown && isAppOffered;

/**
 * Offers the app in the header while it is mounted: on the app's pages in a browser. Decided by
 * the footer, which reads the page anyway, so the header itself stays free of the pathname.
 */
export const ShowGetTheAppButton: React.FC = () => {
  const { setIsShown } = useContext(GetTheAppContext);
  useEffect(() => {
    setIsShown(true);
    return (): void => setIsShown(false);
  }, [setIsShown]);
  return <></>;
};

type Platform = 'ios' | 'android' | 'other';

const readPlatform = (): Platform => {
  const userAgent = navigator.userAgent;
  if (/iPhone|iPad|iPod/.test(userAgent)) return 'ios';
  // iPadOS asks for the desktop site and calls itself a Mac, but has a touch screen
  if (/Macintosh/.test(userAgent) && navigator.maxTouchPoints > 1) return 'ios';
  if (/Android/.test(userAgent)) return 'android';
  return 'other';
};

const StoreLink: React.FC<{ href: string; label: string; isPrimary: boolean }> = ({
  href,
  label,
  isPrimary,
}) => (
  <a
    href={href}
    target="_blank"
    rel="noreferrer"
    className={cn(
      buttonVariants({ variant: isPrimary ? 'primary' : 'outlined', size: 'touch' }),
      'w-full',
    )}
  >
    <ExternalLink aria-hidden="true" />
    {label}
  </a>
);

/** A Cevi QR code of the page, for a computer, whose user carries the app on the phone. */
const PageQrCode: React.FC<{ locale: Locale }> = ({ locale }) => {
  const url = `${environmentVariables.NEXT_PUBLIC_APP_HOST_URL}${globalThis.location.pathname}`;
  const qrCode = useQuery({
    queryKey: ['ceviQrCodeSvg', url],
    meta: { persist: false },
    queryFn: () => fetchCeviQrCodeSvg(url),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    retry: 1,
  });
  if (qrCode.isError) return <></>;

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="border-line h-44 w-44 overflow-hidden rounded-[14px] border bg-white p-2">
        {qrCode.data === undefined ? (
          <div className="bg-quiet h-full w-full animate-pulse rounded-lg" />
        ) : (
          // an SVG loaded as an image runs neither scripts nor event handlers, whatever the
          // QR service answered, so it needs no sanitising
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(qrCode.data)}`}
            alt={text.qrCode[locale]}
            className="h-full w-full"
          />
        )}
      </div>
      <p className="max-w-xs text-center text-sm text-balance text-green-700">
        {text.scan[locale]}
      </p>
    </div>
  );
};

/**
 * What the app adds, and the way there: the store of the phone, or on a computer a code to scan
 * with the phone and both stores. A deployment without a store's link leaves its button out.
 */
const GetTheAppSheetContent: React.FC<{ locale: Locale }> = ({ locale }) => {
  // read once, when the sheet opens; a phone does not change what it is
  const platform = useMemo(() => readPlatform(), []);
  const appStore = environmentVariables.NEXT_PUBLIC_APP_STORE_URL;
  const playStore = environmentVariables.NEXT_PUBLIC_PLAY_STORE_URL;

  return (
    <div className="flex flex-col gap-5 pt-1">
      <ul className="flex flex-col gap-3">
        <li className="flex items-center gap-3 text-[15px] text-green-900">
          <IconTile icon={Bell} />
          {text.notifications[locale]}
        </li>
        <li className="flex items-center gap-3 text-[15px] text-green-900">
          <IconTile icon={WifiOff} />
          {text.offline[locale]}
        </li>
      </ul>

      {platform === 'other' && <PageQrCode locale={locale} />}

      <div className="flex flex-col gap-2">
        {appStore !== undefined && platform !== 'android' && (
          <StoreLink href={appStore} label={text.appStore[locale]} isPrimary={platform === 'ios'} />
        )}
        {playStore !== undefined && platform !== 'ios' && (
          <StoreLink
            href={playStore}
            label={text.playStore[locale]}
            isPrimary={platform === 'android'}
          />
        )}
      </div>
    </div>
  );
};

/** The button and its sheet; mounted only once the page offers the app, never prerendered. */
const GetTheAppSheetButton: React.FC<{ className?: string | undefined }> = ({ className }) => {
  const locale = useCurrentLocale(i18nConfig) as Locale;
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-haspopup="dialog"
        aria-label={text.button[locale]}
        title={text.button[locale]}
        className={cn(
          'hover:bg-quiet flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full text-green-900',
          className,
        )}
      >
        <Smartphone className="h-[22px] w-[22px]" aria-hidden="true" />
      </button>
      <BottomSheet open={isOpen} onOpenChange={setIsOpen} title={text.title[locale]}>
        {isOpen && <GetTheAppSheetContent locale={locale} />}
      </BottomSheet>
    </>
  );
};

/**
 * The header's way to the app, on the app's pages in a browser: a 44px icon that opens a sheet
 * with what the app adds and where to get it. It takes no room at the bottom of the screen.
 */
export const GetTheAppButton: React.FC<{ className?: string }> = ({ className }) => {
  const isShown = useIsGetTheAppShown();
  if (!isShown) return <></>;
  return <GetTheAppSheetButton className={className} />;
};
