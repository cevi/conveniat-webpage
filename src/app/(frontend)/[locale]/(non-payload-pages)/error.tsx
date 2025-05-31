'use client';
import { HeadlineH1 } from '@/components/ui/typography/headline-h1';
import { TeaserText } from '@/components/ui/typography/teaser-text';
import type { Locale, StaticTranslationString } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { useCurrentLocale } from 'next-i18n-router/client';
import React, { useEffect } from 'react';

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

/**
 * This file is responsible for converters a general runtime error page.
 */
const ErrorPage: React.FC<{
  error: Error & { digest?: string };
}> = ({ error }) => {
  const locale = useCurrentLocale(i18nConfig);

  useEffect(() => {
    console.error(error);
    console.error(error.stack);
  }, [error]);

  return (
    <>
      <main className="mt-[96px] grow">
        <article className="mx-auto w-full my-8 max-w-2xl px-8">
          <HeadlineH1>{errorMessage[locale as Locale]}</HeadlineH1>
          <TeaserText>{errorDescription[locale as Locale]}</TeaserText>
        </article>
      </main>
    </>
  );
};

export default ErrorPage;
