'use client';

import { GreetingSkeleton } from '@/app/(frontend)/[locale]/[design]/(app-pages)/app/dashboard/components/dashboard-skeleton';
import { QuartierDot } from '@/components/quartier/quartier-badge';
import { useNow } from '@/features/schedule/hooks/use-now';
import { displayNamesOf } from '@/features/settings/utils/display-names';
import { trpc } from '@/trpc/client';
import { HitobitoNextAuthUserSchema } from '@/types/hitobito-next-auth-user';
import type { Locale, StaticTranslationString } from '@/types/types';
import type { QuartierLabel } from '@/utils/quartier-names';
import { useSession } from 'next-auth/react';
import type React from 'react';

const hello: StaticTranslationString = {
  de: 'Hallo {{name}}',
  en: 'Hello {{name}}',
  fr: 'Salut {{name}}',
};

const welcome: StaticTranslationString = {
  de: 'Willkommen',
  en: 'Welcome',
  fr: 'Bienvenue',
};

type GreetedQuartier = { id: string; name: string } & QuartierLabel;

const dateLocales: Record<Locale, string> = { de: 'de-CH', en: 'en-GB', fr: 'fr-CH' };

/**
 * "Sa., 24. Juli · Quartier 5 - Greif", each Quartier behind its icon, on the camp's clock;
 * renders only in the browser.
 */
const TodayLine: React.FC<{ locale: Locale; quartiere: GreetedQuartier[] }> = ({
  locale,
  quartiere,
}) => {
  const now = useNow();
  const date = new Intl.DateTimeFormat(dateLocales[locale], {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
    timeZone: 'Europe/Zurich',
  }).format(now);
  return (
    <p className="mt-1 flex min-h-[22px] flex-wrap items-center gap-x-1.5 text-[15px] text-green-700">
      <span>{date}</span>
      {quartiere.map((quartier) => (
        <span key={quartier.id} className="inline-flex items-center gap-1.5">
          <span aria-hidden="true">·</span>
          <QuartierDot quartier={quartier} />
          {quartier.name}
        </span>
      ))}
    </p>
  );
};

/**
 * The top of Home: who is greeted, by their Ceviname or first name, and today with their
 * Quartier. A guest is welcomed without a name and without a Quartier.
 */
export const DashboardGreeting: React.FC<{ locale: Locale }> = ({ locale }) => {
  const { data: session, status } = useSession();
  const parsedUser = HitobitoNextAuthUserSchema.safeParse(session?.user);
  const user = parsedUser.success ? parsedUser.data : undefined;

  const { data: myQuartiere } = trpc.schedule.getMyQuartiere.useQuery(undefined, {
    staleTime: 1000 * 60 * 5,
    enabled: user !== undefined,
  });
  // the persisted query cache may hold anything an older version stored under this key
  const quartiere = (Array.isArray(myQuartiere) ? myQuartiere : []).flatMap(
    (entry): GreetedQuartier[] =>
      typeof entry.id === 'string' && typeof entry.name === 'string' && entry.name !== ''
        ? [entry]
        : [],
  );

  // the session is only known in the browser; until then the line keeps its place
  if (status === 'loading') {
    return <GreetingSkeleton />;
  }

  return (
    <div>
      <h2 className="font-heading text-heading text-[28px] leading-[1.15] font-extrabold">
        {user === undefined
          ? welcome[locale]
          : hello[locale].replace('{{name}}', displayNamesOf(user.name, user.nickname).callName)}
      </h2>
      <TodayLine locale={locale} quartiere={user === undefined ? [] : quartiere} />
    </div>
  );
};
