import { Button } from '@/components/ui/buttons/button';
import { EmptyState } from '@/components/ui/empty-state';
import { LinkComponent } from '@/components/ui/link-component';
import { HeadlineH1 } from '@/components/ui/typography/headline-h1';
import { TeaserText } from '@/components/ui/typography/teaser-text';
import type { Locale, StaticTranslationString } from '@/types/types';
import { getLocaleFromCookies } from '@/utils/get-locale-from-cookies';
import { renderInAppDesign } from '@/utils/render-in-app-design';
import { SearchX } from 'lucide-react';
import Link from 'next/link';
import React from 'react';

const error404: StaticTranslationString = {
  de: '404 - Seite nicht gefunden',
  en: '404 - Page Not Found',
  fr: '404 - Page non trouvée',
};

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
      Die Seite, die Sie suchen, existiert nicht. Bitte überprüfen Sie die URL oder gehen Sie zurück
      zur{' '}
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

const appTitle: StaticTranslationString = {
  de: 'Seite nicht gefunden',
  en: 'Page not found',
  fr: 'Page introuvable',
};

const appDescription: StaticTranslationString = {
  de: 'Diese Seite gibt es nicht oder nicht mehr. Vielleicht war der Link veraltet.',
  en: 'This page does not exist, or no longer does. The link may be out of date.',
  fr: "Cette page n'existe pas ou plus. Le lien est peut-être périmé.",
};

const toHome: StaticTranslationString = {
  de: 'Zur Startseite',
  en: 'Go to Home',
  fr: "Aller à l'accueil",
};

/**
 * The 404 page. In the app it is an empty state with the way back to Home, so a dead link does
 * not leave the app; the website keeps its own page.
 */
export const NotFound: React.FC<{
  locale?: Promise<Locale>;
}> = async ({ locale: localePromise }) => {
  // fetch locale from cookies if not provided
  let locale = await localePromise;
  locale ??= await getLocaleFromCookies();

  if (await renderInAppDesign()) {
    return (
      <div className="flex w-full justify-center px-4 py-6">
        <EmptyState
          icon={SearchX}
          title={appTitle[locale]}
          description={appDescription[locale]}
          action={
            <Button asChild variant="primary" size="touch">
              <Link href="/app/dashboard">{toHome[locale]}</Link>
            </Button>
          }
        />
      </div>
    );
  }

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
