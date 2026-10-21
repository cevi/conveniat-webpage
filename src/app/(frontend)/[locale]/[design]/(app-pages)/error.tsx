'use client';
import { Button } from '@/components/ui/buttons/button';
import { IconTile } from '@/components/ui/icon-tile';
import type { Locale, StaticTranslationString } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { attemptStaleBundleRecovery } from '@/utils/chunk-error-recovery';
import { retryButtonTranslation } from '@/utils/shared-translations';
import { AlertTriangle, RefreshCw, WifiOff } from 'lucide-react';
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
    if (Date.now() - (stored.lastAttemptAt ?? 0) > 30 * 1000) return 0;
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

let clearRetryTimeout: ReturnType<typeof setTimeout>;

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
    // If this component just remounted (failed reset), cancel the pending clear from the unmount.
    clearTimeout(clearRetryTimeout);

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
        .catch((error_: unknown) => console.error('Failed to capture error with PostHog', error_))
        // A chunk this bundle needs but the current deployment no longer serves makes this
        // boundary a dead end: `reset()` re-renders the same missing module and the retry
        // button gets the user nowhere. Reload onto the current build instead - after the
        // report above, so the skew stays visible in PostHog.
        .finally(() => {
          attemptStaleBundleRecovery(error);
        });
    }

    const handleOnlineStatus = (): void => {
      setIsOffline(!navigator.onLine);
    };

    globalThis.addEventListener('offline', handleOnlineStatus);
    globalThis.addEventListener('online', handleOnlineStatus);

    return (): void => {
      globalThis.removeEventListener('offline', handleOnlineStatus);
      globalThis.removeEventListener('online', handleOnlineStatus);

      // If we don't remount within 100ms, recovery succeeded (or user navigated away).
      // Clear the retry counter so the next error starts fresh.
      clearRetryTimeout = setTimeout(() => {
        writeRetryCount(buildErrorSignature(error), 0);
      }, 100);
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
    <main className="flex min-h-[60vh] w-full items-center justify-center px-4 py-6">
      <article className="border-line flex w-full max-w-md flex-col items-center rounded-[14px] border bg-white px-6 py-8 text-center">
        <IconTile icon={isActuallyOffline ? WifiOff : AlertTriangle} size="lg" />
        <h1
          className="font-heading text-heading mt-4 cursor-pointer text-lg font-bold select-none"
          onClick={handleTitleClick}
        >
          {isActuallyOffline
            ? offlineMessage[lang] || offlineMessage.de
            : errorMessage[lang] || errorMessage.de}
        </h1>
        <p className="mt-1.5 max-w-xs text-[15px] leading-normal text-green-700">
          {isActuallyOffline
            ? offlineDescription[lang] || offlineDescription.de
            : errorDescription[lang] || errorDescription.de}
        </p>
        {copiedDebug && (
          <p className="bg-tint mt-4 rounded-lg px-3 py-2 text-[13px] font-semibold text-green-900">
            {debugCopiedMessage[lang] || debugCopiedMessage.de}
          </p>
        )}
        <Button
          variant="primary"
          size="touch"
          className="mt-5 w-64 max-w-full"
          onClick={handleRetry}
        >
          <RefreshCw aria-hidden="true" />
          {retryButtonTranslation[lang]}
        </Button>
      </article>
    </main>
  );
};

export default ErrorPage;
