'use client';
import React from 'react';
import { HeadlineH1 } from '@/components/typography/headline-h1';
import { TeaserText } from '@/components/typography/teaser-text';
import Link from 'next/link';
import { i18nConfig, Locale } from '@/types';
import { useCurrentLocale } from 'next-i18n-router/client';

/**
 * This file is responsible for converters a general runtime error page.
 */
const ErrorPage: React.FC = () => {
  const locale = useCurrentLocale(i18nConfig);

  const error: Record<Locale, string> = {
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

  return (
    <article className="mx-auto my-8 max-w-2xl px-8">
      <HeadlineH1>{error[locale as Locale]}</HeadlineH1>
      <TeaserText>{errorDescription[locale as Locale]}</TeaserText>
    </article>
  );
};

export default ErrorPage;
