import { LinkComponent } from '@/components/ui/Link';
import { HeadlineH1 } from '@/components/ui/typography/headline-h1';
import { TeaserText } from '@/components/ui/typography/teaser-text';
import type { Locale, StaticTranslationString } from '@/types/types';
import { getLocaleFromCookies } from '@/utils/get-locale-from-cookies';
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
        <LinkComponent href="/" className="font-bold text-red-600">
          home page
        </LinkComponent>
        .
      </>
    ),
    de: (
      <>
        Die Seite, die Sie suchen, existiert nicht. Bitte überprüfen Sie die URL oder gehen Sie
        zurück zur{' '}
        <LinkComponent href="/" className="font-bold text-red-600">
          Startseite
        </LinkComponent>
        .
      </>
    ),
    fr: (
      <>
        La page que vous recherchez n&#39;existe pas. Veuillez vérifier l&#39;URL ou revenir à la{' '}
        <LinkComponent href="/" className="font-bold text-red-600">
          page d&#39;accueil
        </LinkComponent>
        .
      </>
    ),
  };
  return (
    <>
      <article className="my-8 w-full max-w-2xl px-8 max-xl:mx-auto">
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
