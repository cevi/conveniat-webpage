import { LogoutButton } from '@/features/settings/logout-button';
import type { HitobitoNextAuthUser } from '@/types/hitobito-next-auth-user';
import type { StaticTranslationString } from '@/types/types';
import { auth } from '@/utils/auth-helpers';
import { getLocaleFromCookies } from '@/utils/get-locale-from-cookies';
import React from 'react';

const notAvailable: StaticTranslationString = {
  de: 'nicht verfügbar',
  en: 'not available',
  fr: '',
};

const profileDetailsTitle: StaticTranslationString = {
  de: 'conveniat27 Account',
  en: 'conveniat27 Account',
  fr: 'conveniat27 Compte',
};

const profileDetailsExplanation: StaticTranslationString = {
  de: 'Diese Informationen werden von deinem Cevi.DB Account abgerufen.',
  en: 'This information is pulled from your Cevi.DB account.',
  fr: 'Ces informations sont extraites de votre compte Cevi.DB.',
};

export const ProfileDetails: React.FC = async () => {
  const locale = await getLocaleFromCookies();
  const session = await auth();
  const user = session?.user as HitobitoNextAuthUser | undefined;

  const getDetail = (value: string | number | undefined | null): string =>
    value?.toString() ?? notAvailable[locale];

  return (
    <div className="rounded-lg border-2 border-gray-200 bg-white p-6 md:p-8">
      <h2 className="text-conveniat-green mb-6 text-2xl font-bold">
        {profileDetailsTitle[locale]}
      </h2>

      <p className="mb-8 text-sm text-gray-600">
        <small>{profileDetailsExplanation[locale]}</small>
      </p>

      <div className="space-y-2">
        {/* Email */}
        <div className="flex items-center">
          <strong className="w-24 text-gray-700">E-Mail:</strong>
          <span className="text-gray-900">{getDetail(user?.email)}</span>
        </div>

        {/* Name */}
        <div className="flex items-center">
          <strong className="w-24 text-gray-700">Name:</strong>
          <span className="text-gray-900">{getDetail(user?.name)}</span>
        </div>

        {/* Hof */}
        <div className="flex items-center">
          <strong className="w-24 text-gray-700">Hof:</strong>
          <span className="text-gray-900">{getDetail(user?.hof)}</span>
        </div>

        {/* Quartier */}
        <div className="flex items-center">
          <strong className="w-24 text-gray-700">Quartier:</strong>
          <span className="text-gray-900">{getDetail(user?.quartier)}</span>
        </div>
      </div>

      <LogoutButton />
    </div>
  );
};
