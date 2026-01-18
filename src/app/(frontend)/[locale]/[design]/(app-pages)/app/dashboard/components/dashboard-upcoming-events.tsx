'use client';

import { CallToAction } from '@/components/ui/buttons/call-to-action';
import { Card } from '@/components/ui/card';
import type { CampScheduleEntryFrontendType } from '@/features/schedule/types/types';
import { getCategoryDisplayData } from '@/features/schedule/utils/category-utils';
import { useStar } from '@/hooks/use-star';
import type { Locale, StaticTranslationString } from '@/types/types';
import { formatScheduleDateTime } from '@/utils/format-schedule-date-time';
import { cn } from '@/utils/tailwindcss-override';
import { ChevronRight, Clock, MapPin } from 'lucide-react';
import Link from 'next/link';
import type React from 'react';

const upcomingProgramElementsTitle: StaticTranslationString = {
  en: 'My Program Today',
  de: 'Programm von heute',
  fr: "Programme de aujourd'hui",
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
  const { time } = formatScheduleDateTime(locale, entry.timeslot.date, entry.timeslot.time);

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

const SpotIllustration: React.FC = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 200 200"
    className="mx-auto mb-4 h-auto w-32"
    style={{ width: '100%', height: 'auto', maxWidth: '160px' }}
  >
    <g fill="none" stroke="#47564c" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round">
      {/* Base Ring */}
      <ellipse cx="100" cy="175" rx="25" ry="8" />
      <path d="M100 175 L100 167" strokeWidth="4" />

      {/* Pole */}
      <path d="M100 167 L100 35" strokeWidth="5" />

      {/* Top Knob */}
      <circle cx="100" cy="25" r="8" fill="white" strokeWidth="4" />
      <path d="M103 22 Q105 24 104 27" strokeWidth="2" />

      {/* Top Sign (Right) */}
      <g transform="translate(100, 70) rotate(-6)">
        <path d="M-55 -20 L55 -20 L80 0 L55 20 L-55 20 Z" fill="white" strokeWidth="5" />
        <path d="M-25 0 L-10 0" strokeWidth="4" strokeLinecap="round" />
        <path d="M10 0 L30 0" strokeWidth="4" strokeLinecap="round" />
      </g>

      {/* Bottom Sign (Left) */}
      <g transform="translate(100, 125) rotate(4)">
        <path d="M55 -20 L-55 -20 L-80 0 L-55 20 L55 20 Z" fill="white" strokeWidth="5" />
        <path d="M-30 0 L-10 0" strokeWidth="4" strokeLinecap="round" />
        <path d="M10 0 L25 0" strokeWidth="4" strokeLinecap="round" />
      </g>

      {/* Sparkles (Filled Crosses) */}
      <g fill="#47564c" stroke="none">
        <path d="M150 45 L154 41 L158 45 L154 49 Z" />
        <path d="M40 110 L44 106 L48 110 L44 114 Z" />
        <path d="M160 130 L163 127 L166 130 L163 133 Z" />
      </g>
    </g>
  </svg>
);

const NoStarredItemsCard: React.FC<{ locale: Locale }> = ({ locale }) => {
  return (
    <div className="flex w-full flex-col items-center justify-center py-4">
      <SpotIllustration />
      <p className="text-sm font-semibold text-gray-700">{noStarredItemsText[locale]}</p>
      <p className="text-xs text-gray-500">{exploreProgramText[locale]}</p>
    </div>
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
  const isEmpty = displayEvents.length === 0;

  return (
    <Card
      title={upcomingProgramElementsTitle[locale]}
      showBorder={false}
      contentClassName="p-6 pt-0"
    >
      <div className="space-y-3">
        {isEmpty ? (
          <NoStarredItemsCard locale={locale} />
        ) : (
          displayEvents.map((entry) => <EventCard key={entry.id} entry={entry} locale={locale} />)
        )}
        <div className="flex justify-center">
          {isEmpty ? (
            <CallToAction href="/app/schedule" useMargin={false}>
              {moreEventsTitle[locale]}
            </CallToAction>
          ) : (
            <Link
              href="/app/schedule"
              className="font-heading text-md mt-2 font-bold text-red-700 transition-colors hover:text-red-800"
            >
              {moreEventsTitle[locale]}
            </Link>
          )}
        </div>
      </div>
    </Card>
  );
};
