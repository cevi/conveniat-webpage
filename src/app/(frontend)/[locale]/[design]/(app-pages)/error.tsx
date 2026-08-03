'use client';
import { HeadlineH1 } from '@/components/ui/typography/headline-h1';
import { TeaserText } from '@/components/ui/typography/teaser-text';
import type { Locale, StaticTranslationString } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { useCurrentLocale } from 'next-i18n-router/client';
import React, { useEffect, useRef, useState } from 'react';

const errorMessage: StaticTranslationString = {
  de: 'Es ist ein Fehler aufgetreten',
  en: 'Something went wrong',
  fr: "Une erreur s'est produite",
};

const errorDescription: StaticTranslationString = {
  en: 'Close the App and try again. If the problem persists, please us.',
  de: 'Schliesse die App und versuche es erneut. Wenn das Problem weiterhin besteht, kontaktiere uns.',
  fr: "Fermez l'application et réessayez. Si le problème persiste, veuillez nous contacter.",
};

const offlineMessage: StaticTranslationString = {
  de: 'Du bist offline',
  en: 'You are offline',
  fr: 'Vous êtes hors ligne',
};

const offlineDescription: StaticTranslationString = {
  de: 'Diese Seite konnte nicht geladen werden, da keine Netzwerkverbindung besteht.',
  en: 'This page could not be loaded because there is no network connection.',
  fr: 'Cette page n’a pas pu être chargée car il n’y a pas de connexion réseau.',
};

const debugCopiedMessage: StaticTranslationString = {
  de: 'Fehlerprotokoll in Zwischenablage kopiert!',
  en: 'Error log copied to clipboard!',
  fr: 'Journal d’erreur copié dans le presse-papiers !',
};

/**
 * Responsible for rendering a runtime error page with offline recovery support.
 */
const ErrorPage: React.FC<{
  error: Error & { digest?: string };
  reset?: () => void;
}> = ({ error, reset }) => {
  const locale = useCurrentLocale(i18nConfig);
  const [isOffline, setIsOffline] = React.useState(() => !navigator.onLine);
  const [copiedDebug, setCopiedDebug] = useState(false);
  const clickTimestampsReference = useRef<number[]>([]);

  useEffect(() => {
    console.error(error);
    console.error(error.stack);

    const handleOnlineStatus = (): void => {
      setIsOffline(!navigator.onLine);
    };

    globalThis.addEventListener('offline', handleOnlineStatus);
    globalThis.addEventListener('online', handleOnlineStatus);

    return (): void => {
      globalThis.removeEventListener('offline', handleOnlineStatus);
      globalThis.removeEventListener('online', handleOnlineStatus);
    };
  }, [error]);

  const handleRetry = (): void => {
    if (reset) {
      reset();
    } else {
      globalThis.location.reload();
    }
  };

  const handleTitleClick = (): void => {
    const now = Date.now();
    const recentClicks = [...clickTimestampsReference.current, now].filter(
      (timestamp) => now - timestamp < 2000,
    );
    clickTimestampsReference.current = recentClicks;

    if (recentClicks.length >= 5) {
      clickTimestampsReference.current = [];
      const currentUrl = globalThis.location.href;
      const userAgent = navigator.userAgent;
      const isOnline = navigator.onLine ? 'Online' : 'Offline';

      const debugInfo = [
        '--- ERROR DEBUG LOG ---',
        `Timestamp: ${new Date().toISOString()}`,
        `URL: ${currentUrl}`,
        `User Agent: ${userAgent}`,
        `Online Status: ${isOnline}`,
        `Error Name: ${error.name}`,
        `Error Message: ${error.message}`,
        `Error Digest: ${error.digest ?? 'N/A'}`,
        `Stack Trace:\n${error.stack ?? 'No stack trace available'}`,
      ].join('\n');

      void navigator.clipboard.writeText(debugInfo).then(() => {
        setCopiedDebug(true);
        setTimeout(() => {
          setCopiedDebug(false);
        }, 3000);
      });
    }
  };

  const isActuallyOffline =
    isOffline || error.message.includes('offline') || error.message.includes('fetch');

  const lang = (locale ?? 'de') as Locale;

  return (
    <main className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center">
      <article className="my-8 w-full max-w-2xl px-8 max-xl:mx-auto">
        <HeadlineH1 className="cursor-pointer select-none" onClick={handleTitleClick}>
          {isActuallyOffline
            ? offlineMessage[lang] || offlineMessage.de
            : errorMessage[lang] || errorMessage.de}
        </HeadlineH1>
        <div className="mt-4">
          <TeaserText>
            {isActuallyOffline
              ? offlineDescription[lang] || offlineDescription.de
              : errorDescription[lang] || errorDescription.de}
          </TeaserText>
        </div>
        {copiedDebug && (
          <div className="bg-conveniat-green/10 text-conveniat-green mt-4 inline-block rounded-md px-4 py-2 text-sm font-medium transition-all">
            {debugCopiedMessage[lang] || debugCopiedMessage.de}
          </div>
        )}
        <div className="mt-8 flex justify-center">
          <button
            className="bg-conveniat-green hover:bg-conveniat-green/90 cursor-pointer rounded-lg px-6 py-3 font-semibold text-white transition active:scale-95"
            onClick={handleRetry}
            type="button"
          >
            Erneut versuchen
          </button>
        </div>
      </article>
    </main>
  );
};

export default ErrorPage;
