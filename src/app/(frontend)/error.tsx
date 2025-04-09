'use client';
import React, { useEffect } from 'react';
import { HeadlineH1 } from '@/components/typography/headline-h1';
import { TeaserText } from '@/components/typography/teaser-text';
import Link from 'next/link';
import { i18nConfig, Locale, StaticTranslationString } from '@/types';
import { useCurrentLocale } from 'next-i18n-router/client';

const error: StaticTranslationString = {
  de: 'Es ist ein Fehler aufgetreten',
  en: 'Something went wrong',
  fr: "Une erreur s'est produite",
};

const errorDescription: Record<Locale, React.JSX.Element> = {
  en: (
    <>
      The page failed to load. Please check the URL or go back to the{' '}
      <Link href="/" className="font-bold text-red-600">
        home page
      </Link>
      .
    </>
  ),

  de: (
    <>
      Die Seite konnte nicht geladen werden. Bitte überprüfen Sie die URL oder gehen Sie zur{' '}
      <Link href="/" className="font-bold text-red-600">
        Startseite
      </Link>
      .
    </>
  ),

  fr: (
    <>
      La page n&#39;a pas pu être chargée. Veuillez vérifier l&#39;URL ou revenir à la{' '}
      <Link href="/" className="font-bold text-red-600">
        page d&#39;accueil
      </Link>
      .
    </>
  ),
};

/**
 * This file is responsible for converters a general runtime error page.
 */
const ErrorPage: React.FC<{
  error: Error & { digest?: string };
}> = (arguments_) => {
  const locale = useCurrentLocale(i18nConfig);

  useEffect(() => {
    console.error(arguments_.error);
    console.error(arguments_.error.stack);
  }, [arguments_]);

  return (
    <>
      <main className="mt-[96px] grow">
        <article className="mx-auto my-8 max-w-2xl px-8">
          <HeadlineH1>{error[locale as Locale]}</HeadlineH1>
          <TeaserText>{errorDescription[locale as Locale]}</TeaserText>
        </article>
      </main>
    </>
  );
};

export default ErrorPage;
