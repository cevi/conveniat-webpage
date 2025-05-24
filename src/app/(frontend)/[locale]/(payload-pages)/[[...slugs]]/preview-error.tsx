'use client';

import { HeadlineH1 } from '@/components/ui/typography/headline-h1';
import { ParagraphText } from '@/components/ui/typography/paragraph-text';
import { TeaserText } from '@/components/ui/typography/teaser-text';
import type { Locale } from '@/types/types';
import { i18nConfig } from '@/types/types';
import * as jwt from 'jsonwebtoken';
import { useCurrentLocale } from 'next-i18n-router/client';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import type React from 'react';

interface StaticTranslationString {
  en: string;
  de: string;
  fr: string;
}

const previewTokenInvalidText: StaticTranslationString = {
  en: 'The preview token is invalid.',
  de: 'Das Vorschau-Token ist ungültig.',
  fr: "Le jeton d'aperçu n'est pas valide.",
};

const urlDoesNotMatchText: StaticTranslationString = {
  en: 'URL does not match',
  de: 'URL stimmt nicht überein',
  fr: "l'URL ne correspond pas",
};

const previewForUrlText: StaticTranslationString = {
  en: 'Preview for URL:',
  de: 'Vorschau für URL:',
  fr: "Aperçu pour l'URL :",
};

const issuedAtText: StaticTranslationString = {
  en: 'Issued At:',
  de: 'Ausgestellt am:',
  fr: 'Délivré le :',
};

const expiresAtText: StaticTranslationString = {
  en: 'Expires At:',
  de: 'Ablaufdatum:',
  fr: 'Expire le :',
};

const expiredParenthesisText: StaticTranslationString = {
  en: ' (expired)',
  de: ' (abgelaufen)',
  fr: ' (expiré)',
};

const notAvailableText: StaticTranslationString = {
  en: 'N/A',
  de: 'Nicht verfügbar',
  fr: 'Non disponible',
};

const error403TitleText: StaticTranslationString = {
  en: '403 - Preview is Not Available',
  de: '403 - Vorschau nicht verfügbar',
  fr: '403 - Aperçu non disponible',
};

const requestingPreviewModeText: StaticTranslationString = {
  en: "You are requesting a page in preview mode! However, the page is not available. This might be due to the fact that the page's URL has changed or the preview token has expired.",
  de: 'Du forderst eine Seite im Vorschaumodus an! Die Seite ist jedoch nicht verfügbar. Dies könnte daran liegen, dass sich die URL der Seite geändert hat oder das Vorschau-Token abgelaufen ist.',
  fr: "Vous demandez une page en mode aperçu! Cependant, la page n'est pas disponible. Cela peut être dû au fait que l'URL de la page a changé ou que le jeton d'aperçu a expiré.",
};

const pageNotAvailableP1Text: StaticTranslationString = {
  en: 'Go back to the ',
  de: 'Gehen Sie zurück zur ',
  fr: 'Retournez à la ',
};

const homePageLinkText: StaticTranslationString = {
  en: 'home page',
  de: 'Startseite',
  fr: "page d'accueil",
};

const pageNotAvailableP2Text: StaticTranslationString = {
  en: ' or request a new preview token.',
  de: ' oder fordern Sie ein neues Vorschau-Token an.',
  fr: " ou demandez un nouveau jeton d'aperçu.",
};

const backToHomeHandler = (): void => {
  globalThis.location.href = '/';
};

const dateStringFormat: Intl.DateTimeFormatOptions = {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
};

interface DecodedToken {
  iat: number | string;
  exp: number | string;
  url: string;
}

interface PreviewTokenAnalysisProperties {
  validPreviewToken: boolean;
  previewTokenExpired: boolean;
  decoded: DecodedToken | null;
}

const PreviewTokenAnalysis: React.FC<PreviewTokenAnalysisProperties> = ({
  validPreviewToken,
  previewTokenExpired,
  decoded,
}) => {
  const locale = useCurrentLocale(i18nConfig) as Locale;
  const { slugs } = useParams();

  const currentLocaleForDate = {
    en: 'en-US',
    de: 'de-DE',
    fr: 'fr-FR',
  }[locale];

  const iatDate =
    decoded?.iat === undefined
      ? notAvailableText[locale]
      : new Date(Number(decoded.iat) * 1000).toLocaleString(currentLocaleForDate, dateStringFormat);
  const expDate =
    decoded?.exp === undefined
      ? notAvailableText[locale]
      : new Date(Number(decoded.exp) * 1000).toLocaleString(currentLocaleForDate, dateStringFormat);

  if (!validPreviewToken) {
    return (
      <div className="my-8 mx-0 border-t-[4px] border-t-red-800 bg-red-100 p-6 md:mx-12">
        <ParagraphText className="text-red-700">{previewTokenInvalidText[locale]}</ParagraphText>
      </div>
    );
  }

  const url = `/${locale}/${typeof slugs === 'object' ? slugs.join('/') : slugs}`;
  const doesUrlMatch = decoded?.url === undefined || url === decoded.url;

  return (
    <div className="my-8 mx-0 border-t-[4px] border-t-red-800 bg-red-100 p-6 md:mx-12">
      {decoded && (
        <ul className="mt-4 list-disc pl-5">
          <li>
            <strong>{previewForUrlText[locale]}</strong>{' '}
            {doesUrlMatch ? (
              <>{decoded.url}</>
            ) : (
              <span className="text-red-700">
                {decoded.url} ({urlDoesNotMatchText[locale]})
              </span>
            )}
          </li>
          <li>
            <strong>{issuedAtText[locale]}</strong> {iatDate}
          </li>
          <li>
            <strong>{expiresAtText[locale]}</strong>{' '}
            {previewTokenExpired ? (
              <span className="text-red-700">
                {expDate}
                {expiredParenthesisText[locale]}
              </span>
            ) : (
              expDate
            )}
          </li>
        </ul>
      )}
    </div>
  );
};

const PreviewErrorMessage: React.FC = () => {
  const locale = useCurrentLocale(i18nConfig) as Locale;
  const searchParameters = useSearchParams();

  const previewToken = searchParameters.get('preview-token') ?? '';
  const decoded = jwt.decode(previewToken) as unknown as {
    iat: number | string;
    exp: number | string;
    url: string;
  } | null;

  const isValidPreviewToken = decoded !== null && typeof decoded === 'object';
  const isPreviewTokenExpired =
    decoded?.exp !== undefined && new Date() > new Date(Number(decoded.exp) * 1000);

  return (
    <main className="mt-[96px] grow">
      <article className="mx-auto my-8 max-w-2xl px-8">
        <HeadlineH1>{error403TitleText[locale]}</HeadlineH1>
        <TeaserText>{requestingPreviewModeText[locale]}</TeaserText>

        <TeaserText>
          {pageNotAvailableP1Text[locale]}
          <Link onClick={backToHomeHandler} className="font-bold text-red-600" href={''}>
            {' '}
            {homePageLinkText[locale]}
          </Link>
          {pageNotAvailableP2Text[locale]}
        </TeaserText>

        <PreviewTokenAnalysis
          validPreviewToken={isValidPreviewToken}
          previewTokenExpired={isPreviewTokenExpired}
          decoded={decoded}
        />
      </article>
    </main>
  );
};

export const PreviewError: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const searchParameters = useSearchParams();

  const requestedAsPreview = searchParameters.get('preview') === 'true';
  if (requestedAsPreview) {
    return <PreviewErrorMessage />;
  }

  // it's a 404 error
  return <>{children}</>;
};
