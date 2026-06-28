import { environmentVariables } from '@/config/environment-variables';
import prisma from '@/lib/db/prisma';
import type { Locale, StaticTranslationString } from '@/types/types';
import type { WidgetServerProps } from 'payload';

const title: StaticTranslationString = {
  en: 'Users on Campsite',
  de: 'Benutzer auf dem Lagerplatz',
  fr: 'Utilisateurs sur le terrain de camp',
};

const noUsersLabel: StaticTranslationString = {
  en: 'No users currently on campsite.',
  de: 'Niemand auf dem Lagerplatz.',
  fr: 'Personne sur le terrain de camp.',
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

  const presentUsers = await prisma.user.findMany({
    where: { presentAtCamp: true },
    orderBy: { name: 'asc' },
    select: { uuid: true, name: true },
  });

  const getCurrentlyPresentLabel = (): string => {
    if (locale === 'de') return 'Aktuell anwesend:';
    if (locale === 'fr') return 'Actuellement présent:';
    return 'Currently present:';
  };

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div>
        <h3>{title[locale as Locale]}</h3>
        <p className="text-conveniat-green mt-1 text-4xl font-bold">{presentCount}</p>
      </div>
      <div className="border-t border-gray-100 pt-3">
        <h4 className="mb-2 text-xs font-semibold tracking-wider text-gray-400 uppercase">
          {getCurrentlyPresentLabel()}
        </h4>
        {presentUsers.length === 0 ? (
          <p className="text-sm text-gray-400 italic">{noUsersLabel[locale as Locale]}</p>
        ) : (
          <ul className="max-h-48 space-y-1.5 overflow-y-auto pr-1">
            {presentUsers.map((u) => (
              <li key={u.uuid} className="text-sm">
                <a
                  href={`/admin/collections/users/${u.uuid}`}
                  className="text-conveniat-green font-medium transition-colors hover:text-green-800 hover:underline"
                >
                  {u.name}
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
