'use client';
import { HeadlineH1 } from '@/components/ui/typography/headline-h1';
import { TeaserText } from '@/components/ui/typography/teaser-text';
import type { Locale, StaticTranslationString } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { useCurrentLocale } from 'next-i18n-router/client';
import React, { useEffect } from 'react';

import Link from 'next/link';

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

/**
 * Responsible for rendering a runtime error page with offline recovery support.
 */
const ErrorPage: React.FC<{
  error: Error & { digest?: string };
  reset?: () => void;
}> = ({ error, reset }) => {
  const locale = useCurrentLocale(i18nConfig);
  const [isOffline, setIsOffline] = React.useState(
    () => typeof navigator !== 'undefined' && !navigator.onLine,
  );

  useEffect(() => {
    console.error(error);
    console.error(error.stack);

    const handleOnlineStatus = (): void => {
      if (typeof navigator !== 'undefined') {
        setIsOffline(!navigator.onLine);
      }
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

  const isActuallyOffline =
    isOffline || error.message.includes('offline') || error.message.includes('fetch');

  const lang = (locale ?? 'de') as Locale;

  return (
    <main className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center">
      <article className="my-8 w-full max-w-2xl px-8 max-xl:mx-auto">
        <HeadlineH1>
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
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <button
            className="rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700 active:scale-95"
            onClick={handleRetry}
            type="button"
          >
            Erneut versuchen
          </button>
          <Link
            className="rounded-lg border border-white/20 bg-white/5 px-6 py-3 font-semibold text-white transition hover:bg-white/10"
            href="/app/dashboard"
          >
            Zur Hauptseite
          </Link>
        </div>
      </article>
    </main>
  );
};

export default ErrorPage;
