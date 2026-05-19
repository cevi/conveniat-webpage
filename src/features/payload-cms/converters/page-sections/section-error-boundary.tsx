'use client';

import { useRouter } from 'next/navigation';
import React, { useCallback } from 'react';
import type { FallbackProps } from 'react-error-boundary';

import { SafeErrorBoundary } from '@/components/error-boundary/safe-error-boundary';
import type { Locale, StaticTranslationString } from '@/types/types';

const errorMessageText: StaticTranslationString = {
  de: 'Inhalt unvollständig',
  en: 'Content Incomplete',
  fr: 'Contenu incomplet',
};

const draftModeHint: StaticTranslationString = {
  de: 'Fehler in der Vorschau. Der Block kann nicht angezeigt werden, da Pflichtfelder fehlen. Bitte ergänze diese im CMS.',
  en: 'Error in preview. The block cannot be displayed because required fields are missing. Please complete them in the CMS.',
  fr: 'Erreur en prévisualisation. Le bloc ne peut pas être affiché car des champs obligatoires manquent. Veuillez les compléter dans le CMS.',
};

const retryText: StaticTranslationString = {
  de: 'Erneuter Versuch',
  en: 'Retry',
  fr: 'Réessayer',
};

const ErrorFallback: React.FC<{
  message: string;
  error?: Error;
  locale: Locale;
  isDraftMode?: boolean;
  resetErrorBoundary?: () => void;
  title?: string | undefined;
}> = ({ locale, message, error, isDraftMode, resetErrorBoundary, title }) => {
  return (
    <div className="flex flex-col gap-4 rounded-lg border border-gray-200 bg-gray-50 p-6 text-gray-800">
      <div className="flex items-center gap-2 text-sm font-semibold tracking-wider text-gray-500 uppercase">
        <span className="h-2 w-2 rounded-full bg-gray-400" />
        {isDraftMode ? (title ?? errorMessageText[locale]) : 'Render Error'}
      </div>

      {!isDraftMode && <div className="text-sm text-gray-600">{message}</div>}

      {isDraftMode && (
        <div className="flex flex-col gap-2">
          {error &&
            !error.message.includes('An error occurred in the Server Components render') &&
            !error.message.includes('Minified React error') && (
              <div className="text-sm font-medium text-gray-800">{error.message}</div>
            )}

          <div className="text-sm text-gray-600 italic">{draftModeHint[locale]}</div>

          {resetErrorBoundary && (
            <div className="pt-2">
              <button
                onClick={resetErrorBoundary}
                className="rounded border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                type="button"
              >
                {retryText[locale]}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

interface SectionErrorBoundaryProperties {
  children: React.ReactNode;
  locale: Locale;
  errorFallbackMessage: string;
  isDraftMode: boolean;
  forceError?: Error;
  errorTitle?: string;
}

export const SectionErrorBoundary: React.FC<SectionErrorBoundaryProperties> = ({
  children,
  locale,
  errorFallbackMessage,
  isDraftMode,
  forceError,
  errorTitle,
}) => {
  const router = useRouter();

  const renderFallback = useCallback(
    ({ error, resetErrorBoundary }: FallbackProps) => (
      <ErrorFallback
        message={errorFallbackMessage}
        error={error as Error}
        locale={locale}
        isDraftMode={isDraftMode}
        resetErrorBoundary={resetErrorBoundary}
        title={errorTitle}
      />
    ),
    [errorFallbackMessage, locale, isDraftMode, errorTitle],
  );

  const handleManualRetry = useCallback(() => {
    router.refresh();
  }, [router]);

  if (forceError) {
    return (
      <ErrorFallback
        message={errorFallbackMessage}
        error={forceError}
        locale={locale}
        isDraftMode={isDraftMode}
        resetErrorBoundary={handleManualRetry}
        title={errorTitle}
      />
    );
  }

  return (
    <SafeErrorBoundary suppressPostHog={isDraftMode} fallbackRender={renderFallback}>
      {children}
    </SafeErrorBoundary>
  );
};
