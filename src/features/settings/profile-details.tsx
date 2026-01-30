import { Card } from '@/components/ui/card';
import { LinkComponent } from '@/components/ui/link-component';
import { environmentVariables } from '@/config/environment-variables';
import { LoginButton } from '@/features/settings/login-button';
import { LogoutButton } from '@/features/settings/logout-button';
import type { StaticTranslationString } from '@/types/types';
import { auth } from '@/utils/auth';
import { isValidNextAuthUser } from '@/utils/auth-helpers';
import { getLocaleFromCookies } from '@/utils/get-locale-from-cookies';
import { ExternalLink, Hash, LifeBuoy, LogIn, Mail, MapPin, User } from 'lucide-react';
import React from 'react';

import { SettingsRow } from '@/features/settings/components/settings-row';

const notAvailable: StaticTranslationString = {
  de: 'nicht verfügbar',
  en: 'not available',
  fr: '',
};

const guestTitle: StaticTranslationString = {
  de: 'Gast',
  en: 'Guest',
  fr: 'Invité',
};

const guestDescription: StaticTranslationString = {
  de: 'Melde dich an, um alle Funktionen zu nutzen.',
  en: 'Sign in to access all features.',
  fr: 'Connectez-vous pour accéder à toutes les fonctionnalités.',
};

const profileDetailsExplanation: StaticTranslationString = {
  de: 'Daten aus deinem Cevi.DB Account',
  en: 'Data from your Cevi.DB account',
  fr: 'Données de votre compte Cevi.DB',
};

const supportTitle: StaticTranslationString = {
  de: 'Hilfe & Support',
  en: 'Help & Support',
  fr: 'Aide & Support',
};

const contactSupportText: StaticTranslationString = {
  en: 'Contact Support',
  de: 'Support kontaktieren',
  fr: 'Contacter le support',
};

const userIdLabel: StaticTranslationString = {
  de: 'Benutzer-ID',
  en: 'User ID',
  fr: "ID d'utilisateur",
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
  const user = isValidNextAuthUser(session?.user) ? session.user : undefined;
  const isAuthenticated = !!user;

  const getDetail = (value: string | number | undefined | null): string =>
    value?.toString() ?? notAvailable[locale];

  const mailSupportLink = `mailto:${environmentVariables.APP_SUPPORT_EMAIL}?subject=${encodeURIComponent(
    supportMailSubject[locale],
  )}&body=${encodeURIComponent(
    supportMailContent[locale].replace('__ID__', getDetail(user?.uuid)),
  )}`;

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <Card contentClassName="p-6">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-100">
            {isAuthenticated ? (
              <User className="h-7 w-7 text-gray-600" />
            ) : (
              <LogIn className="h-7 w-7 text-gray-400" />
            )}
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-gray-900">
              {isAuthenticated ? getDetail(user.name) : guestTitle[locale]}
            </h2>
            <p className="text-sm text-gray-500">
              {isAuthenticated ? profileDetailsExplanation[locale] : guestDescription[locale]}
            </p>
          </div>
        </div>

        {isAuthenticated ? (
          <>
            {/* User Details List */}
            <div className="mt-6 space-y-4">
              <SettingsRow icon={Mail} title="E-Mail" subtitle={getDetail(user.email)} />

              <SettingsRow icon={MapPin} title="Hof" subtitle={getDetail(user.hof)} />

              <SettingsRow icon={MapPin} title="Quartier" subtitle={getDetail(user.quartier)} />

              <SettingsRow
                icon={Hash}
                title={userIdLabel[locale]}
                subtitle={getDetail(user.uuid)}
                subtitleClassName="font-mono text-xs text-gray-600"
              />
            </div>

            <LogoutButton />
          </>
        ) : (
          <LoginButton />
        )}
      </Card>

      {/* Support Section */}
      <Card title={supportTitle[locale]} showBorder={false} contentClassName="p-6 pt-0">
        <LinkComponent
          href={mailSupportLink}
          className="-mx-3 block rounded-lg px-3 transition-colors hover:bg-gray-50"
          hideExternalIcon
        >
          <SettingsRow
            icon={LifeBuoy}
            title={contactSupportText[locale]}
            action={<ExternalLink className="h-4 w-4 text-gray-400" />}
          />
        </LinkComponent>
      </Card>
    </div>
  );
};
