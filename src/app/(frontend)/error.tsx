'use client';
import { LinkComponent } from '@/components/ui/link-component';
import { HeadlineH1 } from '@/components/ui/typography/headline-h1';
import { TeaserText } from '@/components/ui/typography/teaser-text';
import type { Locale, StaticTranslationString } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { isDraftOrPreviewMode } from '@/utils/draft-mode';
import { Loader2 } from 'lucide-react';
import { useCurrentLocale } from 'next-i18n-router/client';
import posthog from 'posthog-js';
import React, { useEffect, useState } from 'react';

const errorMessage: StaticTranslationString = {
  de: 'Es ist ein Fehler aufgetreten',
  en: 'Something went wrong',
  fr: "Une erreur s'est produite",
};

const previewErrorMessage: StaticTranslationString = {
  de: 'Vorschau-Fehler',
  en: 'Preview Error',
  fr: 'Erreur de prévisualisation',
};

const previewErrorDescription: StaticTranslationString = {
  de: 'Die Seite konnte nicht geladen werden. Dies kann an einem Netzwerkproblem liegen. Bitte versuche es erneut.',
  en: 'The page could not be loaded. This may be due to a network issue. Please try again.',
  fr: "La page n'a pas pu être chargée. Cela peut être dû à un problème de réseau. Veuillez réessayer.",
};

const retryButton: StaticTranslationString = {
  de: 'Erneut versuchen',
  en: 'Try Again',
  fr: 'Réessayer',
};

const showDetailsText: StaticTranslationString = {
  de: 'Technische Details anzeigen',
  en: 'Show technical details',
  fr: 'Afficher les détails techniques',
};

const copyErrorText: StaticTranslationString = {
  de: 'Fehler kopieren',
  en: 'Copy error',
  fr: "Copier l'erreur",
};

const backToHomeHandler = (): void => {
  globalThis.location.href = '/';
};

const errorDescription: Record<Locale, React.JSX.Element> = {
  en: (
    <>
      The page failed to load. Please check the URL or go back to the{' '}
      <LinkComponent onClick={backToHomeHandler} className="font-bold text-red-600" href="">
        home page
      </LinkComponent>
      .
    </>
  ),

  de: (
    <>
      Die Seite konnte nicht geladen werden. Bitte überprüfen Sie die URL oder gehen Sie zur{' '}
      <LinkComponent onClick={backToHomeHandler} className="font-bold text-red-600" href="">
        Startseite
      </LinkComponent>
      .
    </>
  ),

  fr: (
    <>
      La page n&#39;a pas pu être chargée. Veuillez vérifier l&#39;URL ou revenir à la{' '}
      <LinkComponent onClick={backToHomeHandler} className="font-bold text-red-600" href="">
        page d&#39;accueil
      </LinkComponent>
      .
    </>
  ),
};

/**
 * This file is responsible for converters a general runtime error page.
 */
const ErrorPage: React.FC<{
  error: Error & { digest?: string };
}> = ({ error }) => {
  const locale = useCurrentLocale(i18nConfig);
  const isPreviewMode = isDraftOrPreviewMode();
  const [isRetrying, setIsRetrying] = useState(false);

  useEffect(() => {
    console.error(error);
    console.error(error.stack);
    if (!isPreviewMode) {
      posthog.captureException(error);
    }
  }, [error, isPreviewMode]);

  const handleRetry = (): void => {
    setIsRetrying(true);
    globalThis.location.reload();
  };

  // In preview mode, show a more helpful retry UI matching SectionErrorBoundary style
  if (isPreviewMode) {
    // Filter out very long module paths and internal errors
    const shouldShowErrorMessage =
      !error.message.includes('An error occurred in the Server Components render') &&
      !error.message.includes('Minified React error') &&
      !error.message.includes('was instantiated because') &&
      error.message.length < 200;

    return (
      <article className="my-4 w-full max-w-2xl px-4 max-xl:mx-auto sm:my-8 sm:px-8">
        <div className="flex flex-col gap-4 rounded-lg border border-gray-200 bg-gray-50 p-4 text-gray-800 sm:p-6">
          <div className="flex items-center gap-2 text-sm font-semibold tracking-wider text-gray-500 uppercase">
            <span className="h-2 w-2 shrink-0 rounded-full bg-gray-400" />
            {previewErrorMessage[locale as Locale]}
          </div>

          <div className="flex flex-col gap-2">
            {shouldShowErrorMessage && (
              <div className="text-sm font-medium wrap-break-word text-gray-800">
                {error.message}
              </div>
            )}

            <div className="text-sm text-gray-600 italic">
              {previewErrorDescription[locale as Locale]}
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-2">
              <button
                onClick={handleRetry}
                disabled={isRetrying}
                className="inline-flex items-center gap-2 rounded border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                type="button"
              >
                {isRetrying && <Loader2 className="h-4 w-4 animate-spin" />}
                {retryButton[locale as Locale]}
              </button>
            </div>

            <details className="mt-2 text-xs text-gray-500">
              <summary className="cursor-pointer hover:text-gray-700">
                {showDetailsText[locale as Locale]}
              </summary>
              <div className="mt-2 rounded bg-gray-100 p-3">
                <pre className="max-h-40 overflow-auto text-xs break-all whitespace-pre-wrap">
                  {error.message}
                  {error.stack !== undefined && error.stack !== '' ? `\n\n${error.stack}` : ''}
                </pre>
                <button
                  onClick={() => {
                    const fullError = `${error.message}${error.stack !== undefined && error.stack !== '' ? `\n\n${error.stack}` : ''}`;
                    void navigator.clipboard.writeText(fullError);
                  }}
                  className="mt-2 text-xs text-gray-600 underline hover:text-gray-800"
                  type="button"
                >
                  {copyErrorText[locale as Locale]}
                </button>
              </div>
            </details>
          </div>
        </div>
      </article>
    );
  }

  return (
    <>
      <article className="my-8 w-full max-w-2xl px-8 max-xl:mx-auto">
        <HeadlineH1>{errorMessage[locale as Locale]}</HeadlineH1>
        <TeaserText>{errorDescription[locale as Locale]}</TeaserText>
      </article>
    </>
  );
};

export default ErrorPage;
