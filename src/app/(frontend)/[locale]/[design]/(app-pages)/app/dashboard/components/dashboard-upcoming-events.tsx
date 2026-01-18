'use client';

import { SubheadingH2 } from '@/components/ui/typography/subheading-h2';
import type { CampScheduleEntryFrontendType } from '@/features/schedule/types/types';
import { getCategoryDisplayData } from '@/features/schedule/utils/category-utils';
import { useStar } from '@/hooks/use-star';
import type { Locale, StaticTranslationString } from '@/types/types';
import { formatScheduleDateTime } from '@/utils/format-schedule-date-time';
import { cn } from '@/utils/tailwindcss-override';
import { Calendar, ChevronRight, Clock, MapPin } from 'lucide-react';
import Link from 'next/link';
import type React from 'react';

const upcomingProgramElementsTitle: StaticTranslationString = {
  en: 'My Program Today',
  de: 'Mein Programm heute',
  fr: "Mon programme aujourd'hui",
};

const moreEventsTitle: StaticTranslationString = {
  en: 'Explore program',
  de: 'Programm entdecken',
  fr: 'Programme explorer',
};

const noStarredItemsText: StaticTranslationString = {
  en: 'Your schedule is open!',
  de: 'Dein Programm ist noch leer!',
  fr: 'Ton programme est encore vide !',
};

const exploreProgramText: StaticTranslationString = {
  en: 'Plan your adventure now.',
  de: 'Plane jetzt dein Abenteuer.',
  fr: 'Planifie ton aventure dès maintenant.',
};

const EventCard: React.FC<{
  entry: CampScheduleEntryFrontendType;
  locale: Locale;
}> = ({ entry, locale }) => {
  const location = entry.location;
  const { formattedDate, time } = formatScheduleDateTime(
    locale,
    entry.timeslot.date,
    entry.timeslot.time,
  );

  const categoryData = getCategoryDisplayData(entry.category);

  return (
    <Link
      href={`/app/schedule/${entry.id}`}
      className="group block cursor-pointer overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-all duration-200 hover:border-gray-300 hover:shadow-md active:scale-[0.99]"
    >
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            {/* Category Tag */}
            {categoryData.label && (
              <div className="mb-2">
                <span
                  className={cn(
                    'rounded-full border px-2.5 py-0.5 text-[10px] font-bold tracking-wide uppercase',
                    categoryData.className,
                  )}
                >
                  {categoryData.label}
                </span>
              </div>
            )}

            <h3 className="group-hover:text-conveniat-green mb-1 text-base leading-snug font-semibold text-gray-900 transition-colors">
              {entry.title}
            </h3>

            {/* Info Row: Date, Time & Location */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-500">
              <div className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                <span className="font-medium text-gray-700">{formattedDate}</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                <span className="font-medium text-gray-700">{time}</span>
              </div>
              {typeof location === 'object' && location.title !== '' && (
                <div className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  <span className="font-medium">{location.title}</span>
                </div>
              )}
            </div>
          </div>

          {/* Right side: chevron */}
          <div className="flex items-center">
            <ChevronRight className="h-5 w-5 text-gray-300 transition-colors group-hover:text-gray-500" />
          </div>
        </div>
      </div>
    </Link>
  );
};

const MoreEventsCard: React.FC<{ locale: Locale }> = ({ locale }) => {
  return (
    <Link href="/app/schedule" className="block p-2 text-center">
      <div className="text-sm font-semibold text-gray-700">{moreEventsTitle[locale]}</div>
    </Link>
  );
};

const NoStarredItemsCard: React.FC<{ locale: Locale }> = ({ locale }) => {
  return (
    <Link href="/app/schedule" className="block w-full">
      <div className="flex h-24 w-full flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-gray-300 bg-gray-50 p-4 transition-colors hover:bg-gray-100">
        <p className="text-sm font-semibold text-gray-700">{noStarredItemsText[locale]}</p>
        <p className="text-xs text-gray-500">{exploreProgramText[locale]}</p>
      </div>
    </Link>
  );
};

interface DashboardUpcomingEventsProperties {
  scheduleEvents: CampScheduleEntryFrontendType[];
  locale: Locale;
}

export const DashboardUpcomingEvents: React.FC<DashboardUpcomingEventsProperties> = ({
  scheduleEvents,
  locale,
}) => {
  const { starredEntries } = useStar();

  // We need "today" in the context of the user or the event? Usually user's local time.
  const today = new Date();

  const upcomingStarredEvents = scheduleEvents.filter((entry) => {
    // Check if starred
    if (!starredEntries.has(entry.id)) {
      return false;
    }

    // Check if it is today
    // entry.timeslot.date is typically an ISO string.
    const entryDate = new Date(entry.timeslot.date);

    // Compare year, month, day
    return (
      entryDate.getDate() === today.getDate() &&
      entryDate.getMonth() === today.getMonth() &&
      entryDate.getFullYear() === today.getFullYear()
    );
  });

  // TODO: Sort matched events by time? Server already sorts them.
  // Take top 3
  const displayEvents = upcomingStarredEvents.slice(0, 3);

  return (
    <div>
      <SubheadingH2 className="mt-12 mb-4 text-center">
        {upcomingProgramElementsTitle[locale]}
      </SubheadingH2>
      <div className="space-y-3">
        {displayEvents.length > 0 ? (
          displayEvents.map((entry) => <EventCard key={entry.id} entry={entry} locale={locale} />)
        ) : (
          <NoStarredItemsCard locale={locale} />
        )}
        <MoreEventsCard locale={locale} />
      </div>
    </div>
  );
};
