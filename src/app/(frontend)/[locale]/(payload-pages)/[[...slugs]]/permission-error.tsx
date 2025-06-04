'use client';
import { LinkComponent } from '@/components/ui/link-component';
import { HeadlineH1 } from '@/components/ui/typography/headline-h1';
import { TeaserText } from '@/components/ui/typography/teaser-text';
import type { Locale } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { useCurrentLocale } from 'next-i18n-router/client';
import type React from 'react';

interface StaticTranslationString {
  en: string;
  de: string;
  fr: string;
}

const error401TitleText: StaticTranslationString = {
  en: '401 - No Permission',
  de: '401 - Keine Berechtigung',
  fr: '401 - Pas de permission',
};
const requestingPageText: StaticTranslationString = {
  en: "You are requesting a page in for which you don't have permissions.",
  de: 'Sie fordern eine Seite an, für die Sie keine Berechtigung haben.',
  fr: "Vous demandez une page pour laquelle vous n'avez pas les permissions.",
};

const pageNotAvailableP1Text: StaticTranslationString = {
  en: 'Go back to the ',
  de: 'Geh zurück zur ',
  fr: 'Retournez à la ',
};

const homePageLinkText: StaticTranslationString = {
  en: 'home page',
  de: 'Startseite',
  fr: "page d'accueil",
};

const backToHomeHandler = (): void => {
  globalThis.location.href = '/';
};

export const PermissionError: React.FC = () => {
  const locale = useCurrentLocale(i18nConfig) as Locale;

  return (
    <>
      <main>
        <article className="max-xl:mx-auto-auto my-8 w-full max-w-2xl px-8">
          <HeadlineH1>{error401TitleText[locale]}</HeadlineH1>
          <TeaserText>{requestingPageText[locale]}</TeaserText>

          <TeaserText>
            {pageNotAvailableP1Text[locale]}
            <LinkComponent onClick={backToHomeHandler} className="font-bold text-red-600" href={''}>
              {' '}
              {homePageLinkText[locale]}
            </LinkComponent>
            {'.'}
          </TeaserText>
        </article>
      </main>
    </>
  );
};
