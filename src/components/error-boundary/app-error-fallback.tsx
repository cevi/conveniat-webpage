import { Button } from '@/components/ui/buttons/button';
import type { Locale, StaticTranslationString } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { useCurrentLocale } from 'next-i18n-router/client';
import React from 'react';
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

  return (
    <div className="flex min-h-[400px] w-full flex-col items-center justify-center p-6 text-center">
      <div className="mb-6 rounded-full bg-red-50 p-4">
        <AlertTriangle className="h-12 w-12 text-red-500" />
      </div>
      <h2 className="font-heading mb-2 text-2xl font-bold text-gray-900">{title[locale]}</h2>
      <p className="font-body mb-8 max-w-md text-gray-600">{description[locale]}</p>

      {/* eslint-disable-next-line n/no-process-env */}
      {process.env.NODE_ENV === 'development' && error instanceof Error && (
        <div className="mb-8 w-full max-w-2xl overflow-auto rounded-lg bg-gray-100 p-4 text-left">
          <p className="mb-2 font-mono text-xs font-bold text-red-700">Error: {error.message}</p>
          <pre className="font-mono text-[10px] text-gray-700">{error.stack}</pre>
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button
          variant="default"
          size="lg"
          className="gap-2 bg-red-600 hover:bg-red-700"
          onClick={() => globalThis.location.reload()}
        >
          <RefreshCw className="h-5 w-5" />
          {reloadPage[locale]}
        </Button>
        <Button variant="outline" size="lg" onClick={resetErrorBoundary}>
          {tryAgain[locale]}
        </Button>
      </div>
    </div>
  );
};
