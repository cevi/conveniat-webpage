import { HeadlineH1 } from '@/components/ui/typography/headline-h1';
import { TeaserText } from '@/components/ui/typography/teaser-text';
import type { Locale, StaticTranslationString } from '@/types/types';
import { getLocaleFromCookies } from '@/utils/get-locale-from-cookies';
import Link from 'next/link';
import React from 'react';

const error404: StaticTranslationString = {
  de: '404 - Seite nicht gefunden',
  en: '404 - Page Not Found',
  fr: '404 - Page non trouvée',
};

/**
 * This file is responsible for converters a general 404 error page.
 */
export const NotFound: React.FC = async () => {
  const locale = await getLocaleFromCookies();

  const error404Description: Record<Locale, React.JSX.Element> = {
    en: (
      <>
        The page you are looking for does not exist. Please check the URL or go back to the{' '}
        <Link href="/" className="font-bold text-red-600">
          home page
        </Link>
        .
      </>
    ),
    de: (
      <>
        Die Seite, die Sie suchen, existiert nicht. Bitte überprüfen Sie die URL oder gehen Sie
        zurück zur{' '}
        <Link href="/" className="font-bold text-red-600">
          Startseite
        </Link>
        .
      </>
    ),
    fr: (
      <>
        La page que vous recherchez n&#39;existe pas. Veuillez vérifier l&#39;URL ou revenir à la{' '}
        <Link href="/" className="font-bold text-red-600">
          page d&#39;accueil
        </Link>
        .
      </>
    ),
  };
  return (
    <>
      <article className="max-xl:mx-auto w-full my-8 max-w-2xl px-8">
        <HeadlineH1>{error404[locale]}</HeadlineH1>
        <TeaserText>{error404Description[locale]}</TeaserText>
      </article>
    </>
  );
};

export const NotFoundPage: React.FC = () => {
  return (
    <>
      <NotFound />
    </>
  );
};

export default NotFoundPage;
