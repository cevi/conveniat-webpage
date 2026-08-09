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

/** Number of unsuccessful retries after which the error log is copied to the clipboard. */
const RETRIES_BEFORE_DEBUG_COPY = 5;

/** sessionStorage key holding the retry counter, so it survives `reset()` and full reloads. */
const RETRY_COUNTER_KEY = 'conveniat-error-retry-counter';

/**
 * Identifies the failure the user is currently stuck on. A different error (or a different page)
 * starts the retry count over, so the clipboard shortcut only triggers on repeated failures of
 * the *same* problem.
 */
const buildErrorSignature = (error: Error & { digest?: string }): string =>
  [globalThis.location.pathname, error.name, error.message, error.digest ?? ''].join('|');

/**
 * Reads the retry count for this failure. Attempts older than five minutes are discarded so a
 * stale counter from an earlier session cannot trigger the shortcut on the first click.
 */
const readRetryCount = (signature: string): number => {
  try {
    const raw = sessionStorage.getItem(RETRY_COUNTER_KEY);
    if (raw === null) return 0;
    const stored = JSON.parse(raw) as {
      signature?: string;
      count?: number;
      lastAttemptAt?: number;
    };
    if (stored.signature !== signature) return 0;
    if (Date.now() - (stored.lastAttemptAt ?? 0) > 5 * 60 * 1000) return 0;
    return typeof stored.count === 'number' ? stored.count : 0;
  } catch {
    return 0;
  }
};

const writeRetryCount = (signature: string, count: number): void => {
  try {
    sessionStorage.setItem(
      RETRY_COUNTER_KEY,
      JSON.stringify({ signature, count, lastAttemptAt: Date.now() }),
    );
  } catch {
    /* sessionStorage can be unavailable (private mode) - the shortcut is best effort */
  }
};

const buildDebugInfo = (error: Error & { digest?: string }, retryCount: number): string =>
  [
    '--- ERROR DEBUG LOG ---',
    `Timestamp: ${new Date().toISOString()}`,
    `URL: ${globalThis.location.href}`,
    `User Agent: ${navigator.userAgent}`,
    `Online Status: ${navigator.onLine ? 'Online' : 'Offline'}`,
    `Display Mode: ${globalThis.matchMedia('(display-mode: standalone)').matches ? 'standalone (PWA)' : 'browser'}`,
    `Failed Retries: ${retryCount}`,
    `Error Name: ${error.name}`,
    `Error Message: ${error.message}`,
    `Error Digest: ${error.digest ?? 'N/A'}`,
    `Stack Trace:\n${error.stack ?? 'No stack trace available'}`,
  ].join('\n');

/**
 * Copies text to the clipboard, falling back to a hidden textarea. iOS WebViews reject the async
 * Clipboard API in some configurations, and this shortcut exists precisely for devices whose
 * console we cannot reach.
 */
const copyToClipboard = async (text: string): Promise<void> => {
  try {
    await navigator.clipboard.writeText(text);
    return;
  } catch {
    /* fall through to the legacy path */
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.append(textarea);
  textarea.select();
  // eslint-disable-next-line @typescript-eslint/no-deprecated
  document.execCommand('copy');
  textarea.remove();
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

    // Report to PostHog: this boundary swallows the error, so it never reaches PostHog's
    // uncaught-exception autocapture and would otherwise be invisible in production.
    if (navigator.onLine) {
      void import('posthog-js')
        .then(({ default: posthog }) => {
          posthog.captureException(error, {
            context: 'app-pages-error-boundary',
            pathname: globalThis.location.pathname,
            digest: error.digest ?? 'N/A',
          });
        })
        .catch((error_: unknown) => console.error('Failed to capture error with PostHog', error_));
    }

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

  const showDebugCopied = (): void => {
    setCopiedDebug(true);
    setTimeout(() => {
      setCopiedDebug(false);
    }, 3000);
  };

  const handleRetry = (): void => {
    const signature = buildErrorSignature(error);
    const attempt = readRetryCount(signature) + 1;

    // The user is stuck on the same error: hand them the stack trace instead of retrying again.
    if (attempt >= RETRIES_BEFORE_DEBUG_COPY) {
      writeRetryCount(signature, 0);
      void copyToClipboard(buildDebugInfo(error, attempt)).then(showDebugCopied);
      return;
    }

    writeRetryCount(signature, attempt);

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

    if (recentClicks.length >= RETRIES_BEFORE_DEBUG_COPY) {
      clickTimestampsReference.current = [];
      void copyToClipboard(buildDebugInfo(error, readRetryCount(buildErrorSignature(error)))).then(
        showDebugCopied,
      );
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
