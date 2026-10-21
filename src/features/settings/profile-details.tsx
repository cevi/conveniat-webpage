import { IconTile } from '@/components/ui/icon-tile';
import { LinkComponent } from '@/components/ui/link-component';
import { SectionLabel } from '@/components/ui/section-label';
import { environmentVariables } from '@/config/environment-variables';
import { CeviDatabaseGroupSync } from '@/features/settings/cevi-db-group-sync';
import { LoginButton } from '@/features/settings/login-button';
import { LogoutButton } from '@/features/settings/logout-button';
import type { StaticTranslationString } from '@/types/types';
import { auth } from '@/utils/auth';
import { isValidNextAuthUser } from '@/utils/auth-helpers';
import { getLocaleFromCookies } from '@/utils/get-locale-from-cookies';
import { ExternalLink, Hash, LifeBuoy, LogIn, Mail, MapPin, Tent } from 'lucide-react';
import React from 'react';

import {
  describeHofRoles,
  getHofDirectory,
  type HofRole,
} from '@/features/payload-cms/payload-cms/utils/hof-directory';
import { SettingsCard, SettingsRow } from '@/features/settings/components/settings-row';
import { ProfileAvatar } from '@/features/settings/profile-avatar';
import prisma from '@/lib/db/prisma';
import { getFeatureFlag } from '@/lib/db/redis';
import { FEATURE_HIDE_HOF_AND_QUARTIER } from '@/lib/feature-flags';
import { profilePictureUrlOrUndefined } from '@/utils/profile-picture-url';
import { createLogger } from '@/utils/server-logger';
import config from '@payload-config';
import { getPayload } from 'payload';

const logger = createLogger('settings:profile-details');

const notAvailable: StaticTranslationString = {
  de: 'nicht verfügbar',
  en: 'not available',
  fr: 'non disponible',
};

const noHofYet: StaticTranslationString = {
  de: 'Noch keinem Hof zugeteilt',
  en: 'Not assigned to a Hof yet',
  fr: 'Pas encore attribué à un Hof',
};

const noQuartierYet: StaticTranslationString = {
  de: 'Dein Hof ist noch keinem Quartier zugeteilt',
  en: 'Your Hof is not assigned to a Quartier yet',
  fr: "Ton Hof n'est pas encore attribué à un Quartier",
};

/** Ids of related documents, whether Payload returned them as ids or as documents. */
const idsOf = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.flatMap((entry: unknown) => {
        if (typeof entry === 'string') return [entry];
        if (typeof entry === 'object' && entry !== null && 'id' in entry) {
          return typeof entry.id === 'string' ? [entry.id] : [];
        }
        return [];
      })
    : [];

/**
 * The Höfe of the logged-in user, from their registration, each with its Quartier and whether
 * they are its AVP. Undefined when they cannot be read, so the page says so instead of claiming
 * the user has no Hof.
 */
const findHofRolesOfUser = async (userId: string): Promise<HofRole[] | undefined> => {
  try {
    const payload = await getPayload({ config });
    const [user, directory] = await Promise.all([
      payload.findByID({
        collection: 'users',
        id: userId,
        depth: 0,
        select: { hoefe: true, avpHoefe: true },
      }),
      getHofDirectory(payload),
    ]);
    return describeHofRoles(idsOf(user.hoefe), idsOf(user.avpHoefe), directory);
  } catch (error: unknown) {
    logger.warn('Could not read the Höfe of the user', { error, 'user.id': userId });
    return undefined;
  }
};

/** "Cevi Uster (AVP), Züri 11" and their Quartiere, each once. */
const describeHofRolesForProfile = (roles: HofRole[]): { hoefe: string; quartiere: string } => ({
  hoefe: roles.map(({ hof, isAvp }) => (isAvp ? `${hof} (AVP)` : hof)).join(', '),
  quartiere: [
    ...new Set(roles.map(({ quartier }) => quartier).filter((name) => name !== undefined)),
  ].join(', '),
});

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
  let session;
  try {
    session = await auth();
  } catch {
    // Gracefully handle auth lookup errors when offline or db unavailable
  }
  const user = isValidNextAuthUser(session?.user) ? session.user : undefined;
  const isAuthenticated = !!user;

  const getDetail = (value: string | number | undefined | null): string =>
    value?.toString() ?? notAvailable[locale];

  const mailSupportLink = `mailto:${environmentVariables.APP_SUPPORT_EMAIL}?subject=${encodeURIComponent(
    supportMailSubject[locale],
  )}&body=${encodeURIComponent(
    supportMailContent[locale].replace('__ID__', getDetail(user?.uuid)),
  )}`;

  let hideHofAndQuartier = false;
  try {
    hideHofAndQuartier = await getFeatureFlag(FEATURE_HIDE_HOF_AND_QUARTIER);
  } catch {
    // Default to false if Redis is unreachable
  }
  const shouldShowHofAndQuartier = isAuthenticated && !hideHofAndQuartier;
  const hofRoles = shouldShowHofAndQuartier ? await findHofRolesOfUser(user.uuid) : undefined;
  const hofSummary = hofRoles === undefined ? undefined : describeHofRolesForProfile(hofRoles);
  const hofText = (): string => {
    if (hofSummary === undefined) return notAvailable[locale];
    return hofSummary.hoefe === '' ? noHofYet[locale] : hofSummary.hoefe;
  };
  const quartierText = (): string => {
    if (hofSummary === undefined) return notAvailable[locale];
    if (hofSummary.hoefe === '') return noHofYet[locale];
    return hofSummary.quartiere === '' ? noQuartierYet[locale] : hofSummary.quartiere;
  };

  let pictureUrl: string | undefined;
  if (isAuthenticated) {
    try {
      const own = await prisma.user.findUnique({
        where: { uuid: user.uuid },
        select: { profilePictureVersion: true },
      });
      pictureUrl = profilePictureUrlOrUndefined(user.uuid, own?.profilePictureVersion);
    } catch {
      // the initials stand in, e.g. while the database is unreachable
    }
  }

  return (
    <div className="space-y-6">
      {/* Profile: who is logged in and what Cevi.DB knows about them */}
      <div className="space-y-3">
        <SettingsCard>
          <div className="p-4">
            {isAuthenticated ? (
              <ProfileAvatar
                userId={user.uuid}
                name={user.name}
                pictureUrl={pictureUrl}
                locale={locale}
              >
                <div className="min-w-0 flex-1">
                  <h2 className="font-heading text-heading text-lg leading-tight font-bold">
                    {getDetail(user.name)}
                  </h2>
                  <p className="mt-0.5 text-[13px] text-green-700">
                    {profileDetailsExplanation[locale]}
                  </p>
                </div>
              </ProfileAvatar>
            ) : (
              <div className="flex items-center gap-4">
                <IconTile icon={LogIn} size="lg" />
                <div className="min-w-0 flex-1">
                  <h2 className="font-heading text-heading text-lg leading-tight font-bold">
                    {guestTitle[locale]}
                  </h2>
                  <p className="mt-0.5 text-[13px] text-green-700">{guestDescription[locale]}</p>
                </div>
              </div>
            )}
          </div>

          {isAuthenticated && (
            <SettingsRow icon={Mail} title="E-Mail" subtitle={getDetail(user.email)} />
          )}
          {shouldShowHofAndQuartier && <SettingsRow icon={Tent} title="Hof" subtitle={hofText()} />}
          {shouldShowHofAndQuartier && (
            <SettingsRow icon={MapPin} title="Quartier" subtitle={quartierText()} />
          )}
          {isAuthenticated && (
            <SettingsRow
              icon={Hash}
              title={userIdLabel[locale]}
              subtitle={getDetail(user.uuid)}
              subtitleClassName="font-mono text-xs"
            />
          )}
          {isAuthenticated && <CeviDatabaseGroupSync />}
        </SettingsCard>

        {isAuthenticated ? <LogoutButton /> : <LoginButton />}
      </div>

      {/* Support Section */}
      <section>
        <SectionLabel className="mb-2 px-1">{supportTitle[locale]}</SectionLabel>
        <SettingsCard>
          <LinkComponent
            href={mailSupportLink}
            className="hover:bg-quiet block transition-colors"
            hideExternalIcon
          >
            <SettingsRow
              icon={LifeBuoy}
              title={contactSupportText[locale]}
              action={<ExternalLink className="h-5 w-5 text-green-500" aria-hidden="true" />}
            />
          </LinkComponent>
        </SettingsCard>
      </section>
    </div>
  );
};
