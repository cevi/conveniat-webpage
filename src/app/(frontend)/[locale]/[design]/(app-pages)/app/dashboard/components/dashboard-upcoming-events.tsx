'use client';

import { DashboardUpcomingEventsSkeleton } from '@/app/(frontend)/[locale]/[design]/(app-pages)/app/dashboard/components/dashboard-upcoming-events-skeleton';
import { Button } from '@/components/ui/buttons/button';
import { EmptyState } from '@/components/ui/empty-state';
import { SectionLabel } from '@/components/ui/section-label';
import { programmeLabels } from '@/features/schedule/constants/schedule-labels';
import { getCategoryAccent } from '@/features/schedule/utils/category-utils';
import type { DashboardEvent } from '@/features/schedule/utils/dashboard-events';
import { selectTodaysDashboardEvents } from '@/features/schedule/utils/dashboard-events';
import {
  formatDuration,
  formatMinutesAsTime,
  parseTimeslot,
} from '@/features/schedule/utils/time-utils';
import { useStar } from '@/hooks/use-star';
import { trpc } from '@/trpc/client';
import type { Locale, StaticTranslationString } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { CalendarHeart, ChevronRight, Clock, MapPin } from 'lucide-react';
import Link from 'next/link';
import type React from 'react';

const upcomingProgramElementsTitle: StaticTranslationString = {
  en: 'My Program Today',
  de: 'Programm von heute',
  fr: "Programme d'aujourd'hui",
};

const moreEventsTitle: StaticTranslationString = {
  en: 'Explore program',
  de: 'Programm entdecken',
  fr: 'Explorer le programme',
};

const noStarredItemsText: StaticTranslationString = {
  en: 'Your schedule is open',
  de: 'Dein Programm ist noch leer',
  fr: 'Ton programme est encore vide',
};

const exploreProgramText: StaticTranslationString = {
  en: 'Star programme blocks, and what is on for you today shows up here.',
  de: 'Markiere Programmpunkte mit dem Stern, dann steht hier, was heute für dich ansteht.',
  fr: "Ajoute des activités à tes favoris avec l'étoile : tu verras ici ce qui t'attend aujourd'hui.",
};

const helperShiftBadgeText: StaticTranslationString = {
  en: 'Helper shift',
  de: 'Schichteinsatz',
  fr: 'Service',
};

/** how many of today's entries the card shows before deferring to the full program */
const MAX_DISPLAYED_EVENTS = 3;

/**
 * One of today's entries, in the words of the programme's timeline cards: start time, category,
 * title, "bis 17:30 · 30 min" and the place.
 */
const EventRow: React.FC<{
  event: DashboardEvent;
  locale: Locale;
  /** minutes since midnight, to tell a running entry */
  currentMinutes: number;
}> = ({ event, locale, currentMinutes }) => {
  const { location } = event;
  const slot = parseTimeslot(event.time);

  const accent = getCategoryAccent(event.category);
  // a shift without a category would be indistinguishable from a program block otherwise
  // the same line the programme's cards show, "Lagersport · Hofprogramm"; guarded, because a
  // phone can restore a cached entry from before the form was sent, or a form it does not know
  const form = (programmeLabels.form as Record<string, Record<Locale, string> | undefined>)[
    event.form ?? ''
  ]?.[locale];
  const eyebrow =
    accent.label === '' && event.isShift
      ? helperShiftBadgeText[locale]
      : [accent.label, form].filter((part) => part !== undefined && part !== '').join(' · ');
  const isRunning = slot !== undefined && slot.start <= currentMinutes && currentMinutes < slot.end;

  return (
    <li>
      <Link href={event.href} className="hover:bg-page flex min-h-11 gap-3 px-3.5 py-3">
        <time className="w-12 shrink-0 pt-px text-[15px] font-bold text-green-900 tabular-nums">
          {slot === undefined ? event.time : formatMinutesAsTime(slot.start)}
        </time>
        <span className="min-w-0 flex-1">
          {eyebrow !== '' && (
            <span
              className={cn(
                'block text-xs font-semibold',
                accent.label === '' ? 'text-green-700' : accent.text,
              )}
            >
              {eyebrow}
            </span>
          )}
          <span className="mt-0.5 block truncate text-[17px] leading-[22px] font-[650] text-green-900">
            {event.title}
          </span>
          <span className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[13px] leading-[18px] text-green-700">
            {slot !== undefined && slot.end > slot.start && (
              <span className="flex items-center gap-1 tabular-nums">
                <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                {programmeLabels.until[locale].replace(
                  '{{time}}',
                  formatMinutesAsTime(slot.end),
                )} · {formatDuration(slot.end - slot.start)}
              </span>
            )}
            {location !== undefined && location.title !== '' && (
              <span className="flex min-w-0 items-center gap-1">
                <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span className="truncate">{location.title}</span>
              </span>
            )}
          </span>
          {isRunning && (
            <span className="bg-live-soft text-live-text mt-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold">
              <span className="bg-live h-1.5 w-1.5 rounded-full" />
              {programmeLabels.running[locale].replace(
                '{{duration}}',
                formatDuration(slot.end - currentMinutes),
              )}
            </span>
          )}
        </span>
        <ChevronRight className="h-5 w-5 shrink-0 self-center text-green-500" aria-hidden="true" />
      </Link>
    </li>
  );
};

interface DashboardUpcomingEventsProperties {
  locale: Locale;
}

/**
 * "My Program Today" section of the dashboard.
 *
 * The schedule entries are loaded client side through the persisted
 * react-query cache so that the section renders instantly from the last known
 * data when navigating back to the dashboard (and while offline) and is
 * seamlessly updated once the background revalidation completes.
 */
export const DashboardUpcomingEvents: React.FC<DashboardUpcomingEventsProperties> = ({
  locale,
}) => {
  const { starredEntries } = useStar();

  const { data: scheduleEvents } = trpc.schedule.getScheduleEntriesForDashboard.useQuery(
    { locale },
    {
      // keep the cached entries for a minute before revalidating in the background
      staleTime: 60 * 1000,
      refetchOnMount: true,
      // a failed background revalidation must not throw away the cached entries,
      // but without any entries there is nothing to show but the error
      throwOnError: (_error, query) => query.state.data === undefined,
    },
  );

  /**
   * The helper shifts are a secondary source for this card: a user without a single shift is
   * the normal case, so none of the three queries may take the section down or hold up the
   * program blocks - they all degrade to "no shifts to show".
   *
   * All three are part of the offline pre-fetch, so they are served from the persisted cache
   * on a cold, offline dashboard just like the schedule entries above.
   */
  const shiftQueryOptions = {
    staleTime: 60 * 1000,
    refetchOnMount: true,
    throwOnError: false,
  } as const;

  const { data: shifts } = trpc.schedule.getHelperShifts.useQuery(undefined, shiftQueryOptions);
  const { data: enrolledShiftIds } = trpc.shifts.getMyShiftEnrollments.useQuery(
    undefined,
    shiftQueryOptions,
  );
  const { data: organisedShiftIds } = trpc.shifts.getMyOrganisedShifts.useQuery(
    undefined,
    shiftQueryOptions,
  );

  // no cached entries available yet (first ever visit) -> show the skeleton
  if (scheduleEvents === undefined) {
    return <DashboardUpcomingEventsSkeleton locale={locale} />;
  }

  // the user's local time, which is both the day they mean by "today" and the point the card
  // measures "what is still ahead of me" against
  const now = new Date();

  const displayEvents = selectTodaysDashboardEvents({
    scheduleEntries: scheduleEvents,
    starredEntryIds: starredEntries,
    shifts: shifts ?? [],
    enrolledShiftIds: enrolledShiftIds ?? [],
    organisedShiftIds: organisedShiftIds ?? [],
    now,
    limit: MAX_DISPLAYED_EVENTS,
  });

  return (
    <section className="space-y-2">
      <SectionLabel>{upcomingProgramElementsTitle[locale]}</SectionLabel>
      {displayEvents.length === 0 ? (
        <EmptyState
          icon={CalendarHeart}
          title={noStarredItemsText[locale]}
          description={exploreProgramText[locale]}
          action={
            <Button asChild variant="primary" size="touch">
              <Link href="/app/schedule">{moreEventsTitle[locale]}</Link>
            </Button>
          }
        />
      ) : (
        <div className="border-line overflow-hidden rounded-[14px] border bg-white">
          <ul className="divide-line divide-y">
            {displayEvents.map((event) => (
              <EventRow
                key={event.id}
                event={event}
                locale={locale}
                currentMinutes={now.getHours() * 60 + now.getMinutes()}
              />
            ))}
          </ul>
          <Link
            href="/app/schedule"
            className="border-line text-conveniat-green hover:bg-page flex min-h-11 items-center justify-center gap-1 border-t px-3.5 text-[15px] font-semibold"
          >
            {moreEventsTitle[locale]}
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      )}
    </section>
  );
};
