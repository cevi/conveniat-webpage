import { Button } from '@/components/ui/buttons/button';
import { EmptyState } from '@/components/ui/empty-state';
import type { Locale, StaticTranslationString } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { useCurrentLocale } from 'next-i18n-router/client';
import React, { useEffect } from 'react';
import type { FallbackProps } from 'react-error-boundary';

const title: StaticTranslationString = {
  de: 'Upps! Da ist etwas schiefgelaufen.',
  en: 'Oops! Something went wrong.',
  fr: "Oups ! Quelque chose s'est mal passé.",
};

const description: StaticTranslationString = {
  de: 'Es ist ein technischer Fehler aufgetreten. Keine Sorge, deine Daten sind sicher. Bitte versuche die Seite neu zu laden.',
  en: "A technical error occurred. Don't worry, your data is safe. Please try reloading the page.",
  fr: "Une erreur technique s'est produite. Ne vous inquiétez pas, vos données sont en sécurité. Veuillez essayer de recharger la page.",
};

const reloadPage: StaticTranslationString = {
  de: 'Seite neu laden',
  en: 'Reload page',
  fr: 'Recharger la page',
};

const tryAgain: StaticTranslationString = {
  de: 'Nochmals versuchen',
  en: 'Try again',
  fr: 'Réessayer',
};

/**
 * A user-friendly error fallback component for the App Shell.
 */
export const AppErrorFallback: React.FC<FallbackProps> = ({ error, resetErrorBoundary }) => {
  const locale = useCurrentLocale(i18nConfig) as Locale;

  useEffect(() => {
    console.error(error);
    if (error instanceof Error) {
      console.error(error.stack);
    }
  }, [error]);

  return (
    <div className="flex w-full justify-center px-4 py-6">
      <EmptyState
        icon={AlertTriangle}
        title={title[locale]}
        description={description[locale]}
        className="w-full max-w-md"
        action={
          <div className="flex w-full flex-col items-center gap-5">
            {/* eslint-disable-next-line n/no-process-env */}
            {process.env.NODE_ENV === 'development' && error instanceof Error && (
              <div className="bg-quiet max-h-60 w-full overflow-auto rounded-[14px] p-3.5 text-left">
                <p className="font-mono text-xs font-bold break-words text-green-900">
                  Error: {error.message}
                </p>
                <pre className="mt-2 font-mono text-[11px] leading-snug break-all whitespace-pre-wrap text-green-700">
                  {error.stack}
                </pre>
              </div>
            )}
            <div className="flex w-64 max-w-full flex-col gap-2.5">
              <Button variant="primary" size="touch" onClick={() => globalThis.location.reload()}>
                <RefreshCw aria-hidden="true" />
                {reloadPage[locale]}
              </Button>
              <Button variant="outlined" size="touch" onClick={resetErrorBoundary}>
                {tryAgain[locale]}
              </Button>
            </div>
          </div>
        }
      />
    </div>
  );
};
