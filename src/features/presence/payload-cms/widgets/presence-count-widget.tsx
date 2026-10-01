import { environmentVariables } from '@/config/environment-variables';
import { DashboardStatCard } from '@/features/payload-cms/payload-cms/widgets/dashboard-stat-card';
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
  en: 'View present users',
  de: 'Personen anzeigen',
  fr: 'Voir les personnes',
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
  let presentCount = 0;
  try {
    presentCount = await prisma.user.count({
      where: { presentAtCamp: true },
    });
  } catch (error) {
    console.warn('[PresenceCounterWidget] Could not query present users count:', error);
  }

  return (
    <DashboardStatCard
      title={title[locale as Locale]}
      stats={[{ value: presentCount }]}
      footer={
        <Link href="/admin/globals/campsite-presence">{viewDetailsLabel[locale as Locale]}</Link>
      }
    />
  );
}
