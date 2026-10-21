import { IconTile } from '@/components/ui/icon-tile';
import { SectionLabel } from '@/components/ui/section-label';
import { CeviDatabaseGroupSync } from '@/features/settings/cevi-db-group-sync';
import { LoginButton } from '@/features/settings/login-button';
import { LogoutButton } from '@/features/settings/logout-button';
import { displayNamesOf } from '@/features/settings/utils/display-names';
import type { HitobitoNextAuthUser } from '@/types/hitobito-next-auth-user';
import type { StaticTranslationString } from '@/types/types';
import { getCachedSession } from '@/utils/auth';
import { isValidNextAuthUser } from '@/utils/auth-helpers';
import { getLocaleFromCookies } from '@/utils/get-locale-from-cookies';
import { LogIn } from 'lucide-react';
import React from 'react';

import {
  describeHofRoles,
  getHofDirectory,
  type HofRole,
} from '@/features/payload-cms/payload-cms/utils/hof-directory';
import { SettingsCard, SettingsFactRow } from '@/features/settings/components/settings-row';
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
  de: 'Daten aus deinem Cevi.DB-Account',
  en: 'Data from your Cevi.DB account',
  fr: 'Données de ton compte Cevi.DB',
};

const myCampTitle: StaticTranslationString = {
  de: 'Mein Lager',
  en: 'My camp',
  fr: 'Mon camp',
};

const factLabels = {
  hof: { de: 'Hof', en: 'Hof', fr: 'Hof' },
  quartier: { de: 'Quartier', en: 'Quartier', fr: 'Quartier' },
  email: { de: 'E-Mail', en: 'Email', fr: 'E-mail' },
} satisfies Record<string, StaticTranslationString>;

/** The logged-in user from the session, or undefined for a guest and when it cannot be read. */
const sessionUser = async (): Promise<HitobitoNextAuthUser | undefined> => {
  try {
    const session = await getCachedSession();
    return isValidNextAuthUser(session?.user) ? session.user : undefined;
  } catch {
    // Gracefully handle auth lookup errors when offline or db unavailable
    return undefined;
  }
};

/** "Abmelden" at the foot of the settings, for a logged-in user. */
export const LogoutSection: React.FC = async () => {
  const user = await sessionUser();
  return user === undefined ? <></> : <LogoutButton />;
};

/**
 * The profile at the top of the settings: the avatar and the names from Cevi.DB, then "Mein
 * Lager" with the Hof, the Quartier, the e-mail address and the groups. A guest gets the way to
 * log in instead.
 */
export const ProfileDetails: React.FC = async () => {
  const locale = await getLocaleFromCookies();
  const user = await sessionUser();

  if (user === undefined) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <IconTile icon={LogIn} size="lg" />
          <div className="min-w-0 flex-1">
            <h2 className="font-heading text-heading text-xl leading-tight font-extrabold">
              {guestTitle[locale]}
            </h2>
            <p className="mt-0.5 text-[13px] text-green-700">{guestDescription[locale]}</p>
          </div>
        </div>
        <LoginButton />
      </div>
    );
  }

  const getDetail = (value: string | number | undefined | null): string =>
    value?.toString() ?? notAvailable[locale];

  let hideHofAndQuartier = false;
  try {
    hideHofAndQuartier = await getFeatureFlag(FEATURE_HIDE_HOF_AND_QUARTIER);
  } catch {
    // Default to false if Redis is unreachable
  }
  const hofRoles = hideHofAndQuartier ? undefined : await findHofRolesOfUser(user.uuid);
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
  try {
    const own = await prisma.user.findUnique({
      where: { uuid: user.uuid },
      select: { profilePictureVersion: true },
    });
    pictureUrl = profilePictureUrlOrUndefined(user.uuid, own?.profilePictureVersion);
  } catch {
    // the initials stand in, e.g. while the database is unreachable
  }

  const { ceviName, fullName } = displayNamesOf(user.name, user.nickname);

  return (
    <div className="space-y-6">
      <ProfileAvatar userId={user.uuid} name={user.name} pictureUrl={pictureUrl} locale={locale}>
        <div className="min-w-0 flex-1">
          <h2 className="font-heading text-heading text-xl leading-tight font-extrabold break-words">
            {ceviName ?? fullName}
          </h2>
          {ceviName !== undefined && (
            <p className="mt-0.5 text-[15px] text-green-900">{fullName}</p>
          )}
          <p className="mt-0.5 text-[13px] text-green-700">{profileDetailsExplanation[locale]}</p>
        </div>
      </ProfileAvatar>

      <section>
        <SectionLabel className="mb-2 px-1">{myCampTitle[locale]}</SectionLabel>
        <SettingsCard>
          {!hideHofAndQuartier && (
            <SettingsFactRow label={factLabels.hof[locale]} value={hofText()} />
          )}
          {!hideHofAndQuartier && (
            <SettingsFactRow label={factLabels.quartier[locale]} value={quartierText()} />
          )}
          <SettingsFactRow label={factLabels.email[locale]} value={getDetail(user.email)} />
          <CeviDatabaseGroupSync />
        </SettingsCard>
      </section>
    </div>
  );
};
