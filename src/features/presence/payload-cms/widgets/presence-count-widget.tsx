import { environmentVariables } from '@/config/environment-variables';
import prisma from '@/lib/db/prisma';
import type { Locale, StaticTranslationString } from '@/types/types';
import Link from 'next/link';
import type { WidgetServerProps } from 'payload';

const title: StaticTranslationString = {
  en: 'Users on Campsite',
  de: 'Benutzer auf dem Lagerplatz',
  fr: 'Utilisateurs sur le terrain de camp',
};

const viewDetailsLabel: StaticTranslationString = {
  en: 'View present users →',
  de: 'Personen anzeigen →',
  fr: 'Voir les personnes →',
};

export default async function PresenceCounterWidget({
  req,
}: WidgetServerProps): Promise<React.ReactElement | null> {
  const showPresence = environmentVariables.FEATURE_ENABLE_PRESENCE_TRACKING;
  if (!showPresence) {
    // eslint-disable-next-line unicorn/no-null
    return null;
  }

  const { locale } = req;
  const presentCount = await prisma.user.count({
    where: { presentAtCamp: true },
  });

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div>
        <h3>{title[locale as Locale]}</h3>
        <p className="text-conveniat-green mt-1 text-4xl font-bold">{presentCount}</p>
      </div>
      <div className="border-t border-gray-100 pt-3">
        <Link
          href="/admin/globals/campsite-presence"
          className="text-conveniat-green text-sm font-medium transition-colors hover:text-green-800 hover:underline"
        >
          {viewDetailsLabel[locale as Locale]}
        </Link>
      </div>
    </div>
  );
}
