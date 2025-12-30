import { LinkComponent } from '@/components/ui/link-component';
import { environmentVariables } from '@/config/environment-variables';
import { LoginButton } from '@/features/settings/login-button';
import { LogoutButton } from '@/features/settings/logout-button';
import type { HitobitoNextAuthUser } from '@/types/hitobito-next-auth-user';
import type { StaticTranslationString } from '@/types/types';
import { auth } from '@/utils/auth';
import { getLocaleFromCookies } from '@/utils/get-locale-from-cookies';
import React from 'react';

const notAvailable: StaticTranslationString = {
  de: 'nicht verfügbar',
  en: 'not available',
  fr: '',
};

const profileDetailsTitle: StaticTranslationString = {
  de: 'conveniat27 App - Einstellungen',
  en: 'conveniat27 App - Settings',
  fr: 'conveniat27 App - Paramètres',
};

const profileDetailsExplanation: StaticTranslationString = {
  de: 'Diese Informationen werden von deinem Cevi.DB Account abgerufen.',
  en: 'This information is pulled from your Cevi.DB account.',
  fr: 'Ces informations sont extraites de votre compte Cevi.DB.',
};

const supportInformationText: StaticTranslationString = {
  en: 'Your user ID may be required for support requests.',
  de: 'Deine Benutzer-ID kann für Support-Anfragen erforderlich sein.',
  fr: 'Votre identifiant utilisateur peut être requis pour les demandes de support.',
};

const contactSupportText: StaticTranslationString = {
  en: 'Contact the application support.',
  de: 'Kontaktiere den Applikations-Support.',
  fr: "Contactez le support de l'application.",
};

const userIdLabel: StaticTranslationString = {
  de: 'Benutzer-ID:',
  en: 'User ID:',
  fr: "ID d'utilisateur:",
};

const supportMailLabel: StaticTranslationString = {
  de: 'Support E-Mail:',
  en: 'Support Email:',
  fr: 'Email de support:',
};

const supportMailContent: StaticTranslationString = {
  de: 'Guten Tag,\nIch habe ein App-Problem.\nMeine Benutzer ID: __ID__\n\n[Bitte beschreibe hier dein Problem]',
  en: 'Hello,\nI have an app issue.\nMy user ID: __ID__\n\n[Please describe your issue here]',
  fr: "Bonjour,\nJ'ai un problème avec l'application.\nMon ID utilisateur: __ID__\n\n[Veuillez décrire votre problème ici]",
};

const supportMailSubject: StaticTranslationString = {
  de: '[conveniat27 App] Support Anfrage',
  en: '[conveniat27 App] Support Request',
  fr: '[conveniat27 App] Demande de support',
};

export const ProfileDetails: React.FC = async () => {
  const locale = await getLocaleFromCookies();
  const session = await auth();
  const user = session?.user as HitobitoNextAuthUser | undefined;
  const isAuthenticated = !!user;

  const getDetail = (value: string | number | undefined | null): string =>
    value?.toString() ?? notAvailable[locale];

  const mailSupportLink = `mailto:${environmentVariables.APP_SUPPORT_EMAIL}?subject=${encodeURIComponent(
    supportMailSubject[locale],
  )}&body=${encodeURIComponent(
    supportMailContent[locale].replace('__ID__', getDetail(user?.uuid)),
  )}`;

  return (
    <div className="rounded-lg border-2 border-gray-200 bg-white p-6 md:p-8">
      <h2 className="text-conveniat-green mb-6 text-2xl font-bold">
        {profileDetailsTitle[locale]}
      </h2>

      {isAuthenticated ? (
        <>
          <p className="mb-8 text-sm text-gray-600">
            <small>{profileDetailsExplanation[locale]}</small>
          </p>

          <div className="space-y-2">
            {/* Email */}
            <div className="flex items-center">
              <strong className="w-24 text-gray-700">E-Mail:</strong>
              <span className="text-gray-900">{getDetail(user.email)}</span>
            </div>

            {/* Name */}
            <div className="flex items-center">
              <strong className="w-24 text-gray-700">Name:</strong>
              <span className="text-gray-900">{getDetail(user.name)}</span>
            </div>

            {/* Hof */}
            <div className="flex items-center">
              <strong className="w-24 text-gray-700">Hof:</strong>
              <span className="text-gray-900">{getDetail(user.hof)}</span>
            </div>

            {/* Quartier */}
            <div className="flex items-center">
              <strong className="w-24 text-gray-700">Quartier:</strong>
              <span className="text-gray-900">{getDetail(user.quartier)}</span>
            </div>
          </div>

          <LogoutButton />

          <hr className="my-2 mt-12 border-gray-200" />

          <p className="mb-8 text-sm text-gray-600">
            <small>{supportInformationText[locale]}</small>
          </p>

          {/* UUID */}
          <div className="flex items-center">
            <strong className="w-24 text-gray-700">{userIdLabel[locale]}</strong>
            <span className="text-gray-900">{getDetail(user.uuid)}</span>
          </div>
        </>
      ) : (
        <LoginButton />
      )}

      <hr className="my-2 mt-12 border-gray-200" />

      <p className="mb-8 text-sm text-gray-600">
        <small>{contactSupportText[locale]}</small>
      </p>

      <div className="flex items-center">
        <strong className="w-24 text-gray-700">{supportMailLabel[locale]}</strong>
        <LinkComponent className="font-bold text-red-600" href={mailSupportLink} openInNewTab>
          {environmentVariables.APP_SUPPORT_EMAIL}
        </LinkComponent>
      </div>
    </div>
  );
};
