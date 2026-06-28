import { environmentVariables } from '@/config/environment-variables';
import prisma from '@/lib/db/prisma';
import type { Locale, StaticTranslationString } from '@/types/types';
import type { WidgetServerProps } from 'payload';

const title: StaticTranslationString = {
  en: 'Users on Campsite',
  de: 'Benutzer auf dem Lagerplatz',
  fr: 'Utilisateurs sur le terrain de camp',
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
    <div className="card">
      <h3>{title[locale as Locale]}</h3>
      <p className="text-conveniat-green font-bold">{presentCount}</p>
    </div>
  );
}
