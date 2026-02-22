import { LinkComponent } from '@/components/ui/link-component';
import { HeadlineH1 } from '@/components/ui/typography/headline-h1';
import { TeaserText } from '@/components/ui/typography/teaser-text';
import type { Locale, StaticTranslationString } from '@/types/types';
import { getLocaleFromCookies } from '@/utils/get-locale-from-cookies';
import type React from 'react';

const errorForbidden: StaticTranslationString = {
  de: '403 - Kein Zugriff',
  en: '403 - Access Denied',
  fr: '403 - Accès refusé',
};

const errorForbiddenDescription: Record<Locale, React.JSX.Element> = {
  en: (
    <>
      You do not have permission to view this page. If you believe this is an error, please contact
      the administrator or go back to the{' '}
      <LinkComponent href="/" className="font-bold text-red-600">
        home page
      </LinkComponent>
      .
    </>
  ),
  de: (
    <>
      Dein Nutzer hat keinen Zugriff auf diese Seite. Wenn du denkst, dass dies ein Fehler ist,
      kontaktiere bitte den Administrator oder gehe zurück zur{' '}
      <LinkComponent href="/" className="font-bold text-red-600">
        Startseite
      </LinkComponent>
      .
    </>
  ),
  fr: (
    <>
      Vous n&#39;avez pas l&#39;autorisation de voir cette page. Si vous pensez qu&#39;il s&#39;agit
      d&#39;une erreur, veuillez contacter l&#39;administrateur ou revenir à la{' '}
      <LinkComponent href="/" className="font-bold text-red-600">
        page d&#39;accueil
      </LinkComponent>
      .
    </>
  ),
};

export const Forbidden = async ({
  locale: localePromise,
}: {
  locale?: Promise<Locale>;
}): Promise<React.JSX.Element> => {
  let locale = await localePromise;
  locale ??= await getLocaleFromCookies();

  return (
    <>
      <article className="my-8 w-full max-w-2xl px-8 max-xl:mx-auto">
        <HeadlineH1>{errorForbidden[locale]}</HeadlineH1>
        <TeaserText>{errorForbiddenDescription[locale]}</TeaserText>
      </article>
    </>
  );
};

export const ForbiddenPage = (): React.JSX.Element => {
  return (
    <>
      <Forbidden />
    </>
  );
};

export default ForbiddenPage;
