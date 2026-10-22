'use client';

import { JetztSkeleton } from '@/app/(frontend)/[locale]/[design]/(app-pages)/app/dashboard/components/dashboard-skeleton';
import { selectJetzt } from '@/app/(frontend)/[locale]/[design]/(app-pages)/app/dashboard/utils/select-jetzt';
import { Card } from '@/components/ui/card';
import { SectionLabel } from '@/components/ui/section-label';
import { useScheduleEntries } from '@/context/schedule-entries-context';
import { programmeLabels } from '@/features/schedule/constants/schedule-labels';
import { useNow } from '@/features/schedule/hooks/use-now';
import type { CampScheduleEntryFrontendType } from '@/features/schedule/types/types';
import { getCategoryAccent } from '@/features/schedule/utils/category-utils';
import { resolveLocation } from '@/features/schedule/utils/location-utils';
import { slotOf } from '@/features/schedule/utils/programme-utils';
import { formatDuration, formatMinutesAsTime } from '@/features/schedule/utils/time-utils';
import { trpc } from '@/trpc/client';
import type { Locale, StaticTranslationString } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { CalendarCheck, ChevronRight, MapPin } from 'lucide-react';
import Link from 'next/link';
import type React from 'react';
import { useMemo } from 'react';

const wholeProgramme: StaticTranslationString = {
  de: 'Ganzes Programm',
  en: 'Full programme',
  fr: 'Tout le programme',
};

const nothingMoreToday: StaticTranslationString = {
  de: 'Heute steht kein Programm mehr an.',
  en: 'There is no more programme today.',
  fr: "Plus de programme aujourd'hui.",
};

/** how many rows follow the card */
const LATER_COUNT = 2;

const hrefOf = (entry: CampScheduleEntryFrontendType): string => `/app/schedule?id=${entry.id}`;

/** The block on the card: category, title, place and end, and how long it still runs. */
const LeadCard: React.FC<{
  entry: CampScheduleEntryFrontendType;
  isRunning: boolean;
  minutes: number;
  locale: Locale;
}> = ({ entry, isRunning, minutes, locale }) => {
  const accent = getCategoryAccent(entry.category);
  // guarded, because a phone can restore a cached entry with a form it does not know
  const form = (programmeLabels.form as Record<string, Record<Locale, string> | undefined>)[
    entry.form ?? ''
  ]?.[locale];
  // a category named like the block, "Rollenspiel" over "Rollenspiel", says nothing twice
  const eyebrow = [accent.label, form].filter(
    (part) => part !== undefined && part !== '' && part !== entry.title,
  );
  const slot = slotOf(entry);
  const place = resolveLocation(entry.location)?.title;
  const facts = [
    place,
    slot === undefined
      ? undefined
      : programmeLabels.until[locale].replace('{{time}}', formatMinutesAsTime(slot.end)),
  ].filter((part) => part !== undefined && part !== '');

  return (
    <Link
      href={hrefOf(entry)}
      className="border-line hover:bg-quiet block rounded-[14px] border bg-white px-4 py-3.5"
    >
      <span className="flex items-start justify-between gap-3">
        <span
          className={cn(
            'min-w-0 truncate pt-0.5 text-[13px] font-semibold',
            accent.label === '' ? 'text-green-700' : accent.text,
          )}
        >
          {eyebrow.join(' · ')}
        </span>
        <span
          className={cn(
            'inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold tabular-nums',
            isRunning ? 'bg-live-soft text-live-text' : 'bg-chip text-green-900',
          )}
        >
          {isRunning && <span className="bg-live h-1.5 w-1.5 rounded-full" aria-hidden="true" />}
          {programmeLabels[isRunning ? 'minutesLeft' : 'inMinutes'][locale].replace(
            '{{duration}}',
            formatDuration(minutes),
          )}
        </span>
      </span>
      <span className="font-heading text-heading mt-1 block text-[20px] leading-tight font-bold">
        {entry.title}
      </span>
      {facts.length > 0 && (
        <span className="mt-1.5 flex items-center gap-1 text-[13px] text-green-700 tabular-nums">
          {place !== undefined && place !== '' && (
            <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          )}
          <span className="truncate">{facts.join(' · ')}</span>
        </span>
      )}
    </Link>
  );
};

/** What runs now and what comes next, computed against the camp's clock. */
const JetztContent: React.FC<{
  entries: CampScheduleEntryFrontendType[];
  myQuartierIds: ReadonlySet<string>;
  locale: Locale;
}> = ({ entries, myQuartierIds, locale }) => {
  const now = useNow();
  const { lead, isRunning, minutes, later } = selectJetzt(entries, myQuartierIds, now, LATER_COUNT);

  if (lead === undefined) {
    return (
      // only good to know, so neutral, with its sign like every notice
      <p className="bg-quiet flex items-center gap-3 rounded-[14px] px-4 py-3.5 text-[15px] text-green-700">
        <CalendarCheck className="h-5 w-5 shrink-0 text-green-700" aria-hidden="true" />
        {nothingMoreToday[locale]}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <LeadCard entry={lead} isRunning={isRunning} minutes={minutes} locale={locale} />
      {later.length > 0 && (
        <Card as="ul" divided>
          {later.map((entry) => {
            const slot = slotOf(entry);
            return (
              <li key={entry.id}>
                <Link
                  href={hrefOf(entry)}
                  className="hover:bg-quiet flex min-h-[52px] items-center gap-3 px-4 py-2.5"
                >
                  <time className="w-12 shrink-0 text-[15px] font-bold text-green-900 tabular-nums">
                    {slot === undefined ? entry.timeslot.time : formatMinutesAsTime(slot.start)}
                  </time>
                  <span className="min-w-0 flex-1 truncate text-[15px] text-green-900">
                    {entry.title}
                  </span>
                  <ChevronRight className="h-5 w-5 shrink-0 text-green-500" aria-hidden="true" />
                </Link>
              </li>
            );
          })}
        </Card>
      )}
    </div>
  );
};

/**
 * "Jetzt" on Home: the block running now for the user's Quartier, or the next one, and what
 * follows it today, with the way to the whole programme.
 *
 * It reads the same entries as Programm, from the persisted query cache and, offline, from the
 * downloaded copy, so it renders at once and without a connection.
 */
export const DashboardNow: React.FC<{ locale: Locale }> = ({ locale }) => {
  const { entries: localEntries } = useScheduleEntries();
  const { data: scheduleEntries } = trpc.schedule.getScheduleEntries.useQuery(undefined, {
    staleTime: 1000 * 60 * 5,
    refetchOnMount: true,
    // a failed background revalidation must not throw away the cached entries, but without
    // any entries, cached or downloaded, there is nothing to show but the error
    throwOnError: (_error, query) => query.state.data === undefined && localEntries.length === 0,
  });
  const { data: myQuartiere } = trpc.schedule.getMyQuartiere.useQuery(undefined, {
    staleTime: 1000 * 60 * 5,
  });
  // the persisted query cache may hold anything an older version stored under these keys
  const myQuartierIds = useMemo(
    () =>
      new Set(
        (Array.isArray(myQuartiere) ? myQuartiere : [])
          .map((quartier) => quartier.id)
          .filter((id): id is string => typeof id === 'string'),
      ),
    [myQuartiere],
  );
  const entries =
    Array.isArray(scheduleEntries) && scheduleEntries.length > 0 ? scheduleEntries : localEntries;

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <SectionLabel>{programmeLabels.now[locale]}</SectionLabel>
        <Link
          href="/app/schedule"
          className="text-conveniat-green -my-3 flex min-h-11 items-center text-[13px] font-semibold underline-offset-2 hover:underline"
        >
          {wholeProgramme[locale]}
        </Link>
      </div>
      {scheduleEntries === undefined && localEntries.length === 0 ? (
        <JetztSkeleton />
      ) : (
        <JetztContent entries={entries} myQuartierIds={myQuartierIds} locale={locale} />
      )}
    </section>
  );
};
