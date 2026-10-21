'use client';

import { EnrollmentAction } from '@/features/schedule/components/enrollment-action';
import { ScheduleTimelineItem } from '@/features/schedule/components/schedule-timeline-item';
import { scheduleLabels } from '@/features/schedule/constants/schedule-labels';
import { useScrollRestoration } from '@/features/schedule/hooks/use-scroll-restoration';
import type { CampScheduleEntryFrontendType } from '@/features/schedule/types/types';
import { getCategoryAccent } from '@/features/schedule/utils/category-utils';
import { resolveLocation } from '@/features/schedule/utils/location-utils';
import { formLabels, quartiereOf } from '@/features/schedule/utils/programme-utils';
import type { Locale } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { CheckCircle, Clock, MapPin, Star } from 'lucide-react';
import { useCurrentLocale } from 'next-i18n-router/client';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import type React from 'react';

/**
 * "Quartier 3 - Nord" is too long for a chip in a list row, so a Quartier named that
 * way shows as "Q3". Any other name is shown as the editors wrote it.
 */
const shortQuartierName = (name: string | undefined): string | undefined => {
  if (name === undefined) return undefined;
  const number = /^Quartier\s+(\d+)/i.exec(name)?.[1];
  return number === undefined ? name : `Q${number}`;
};

interface ScheduleRowProperties {
  entry: CampScheduleEntryFrontendType;
  isEnrolled: boolean;
  isStarred: boolean;
  /** the block is running right now */
  isNow: boolean;
  /** the block is over, on the day that is today */
  isPast: boolean;
  /** in the view of the whole camp: name the Quartiere a block is for, the user's own marked */
  quartierChips?: ReadonlySet<string> | undefined;
}

/** One programme block of the day: a card on the timeline, its node in its category's colour. */
export const ScheduleRow: React.FC<ScheduleRowProperties> = ({
  entry,
  isEnrolled,
  isStarred,
  isNow,
  isPast,
  quartierChips,
}) => {
  const locale = useCurrentLocale(i18nConfig) as Locale;
  const searchParameters = useSearchParams();
  const { saveScrollPosition } = useScrollRestoration();

  const location = resolveLocation(entry.location);
  const accent = getCategoryAccent(entry.category);
  const form = typeof entry.form === 'string' ? formLabels[entry.form] : undefined;
  const label = [accent.label, form].filter((part) => part !== undefined && part !== '');
  const [start = '', end = ''] = entry.timeslot.time.split(' - ');
  const quartiere = quartierChips === undefined ? [] : quartiereOf(entry);

  // Clone current search params and set id for offline robust navigation
  const parameters = new URLSearchParams(searchParameters.toString());
  parameters.set('id', entry.id);

  return (
    <ScheduleTimelineItem
      className={cn(isPast && 'opacity-50')}
      time={<time className="font-semibold text-gray-900">{start}</time>}
      node={
        <span
          className={cn('h-3.5 w-3.5 rounded-full border-[3px] border-[#f8fafc]', accent.bar)}
        />
      }
    >
      <div
        className={cn(
          'mb-3 overflow-hidden rounded-2xl border bg-white shadow-xs',
          isNow ? 'border-conveniat-green ring-conveniat-green/15 ring-2' : 'border-gray-200',
        )}
      >
        <Link
          href={`/app/schedule?${parameters.toString()}`}
          onClick={saveScrollPosition}
          className="block px-3.5 py-3"
        >
          {label.length > 0 && (
            <span
              className={cn(
                'inline-flex max-w-full truncate rounded-md px-2 py-0.5 text-xs font-semibold',
                accent.tint,
                accent.text,
              )}
            >
              {label.join(' · ')}
            </span>
          )}
          <h3 className="font-heading mt-1.5 flex items-center gap-1.5 text-[1.0625rem] leading-snug font-bold text-gray-900">
            <span className="truncate">{entry.title}</span>
            {isStarred && <Star className="h-4 w-4 shrink-0 fill-amber-400 text-amber-400" />}
            {isEnrolled && (
              <CheckCircle
                className="text-conveniat-green h-4 w-4 shrink-0"
                aria-label={scheduleLabels.enrolledBadge[locale]}
              />
            )}
          </h3>
          <p className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[0.8125rem] text-gray-500">
            <span className="flex items-center gap-1 tabular-nums">
              <Clock className="h-3.5 w-3.5 shrink-0" />
              {end === '' ? start : `${start} – ${end}`}
            </span>
            {location?.title && (
              <span className="flex min-w-0 items-center gap-1">
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{location.title}</span>
              </span>
            )}
          </p>
          {quartiere.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {quartiere.map(({ id, name }) => (
                <span
                  key={id}
                  className={cn(
                    'rounded-md px-1.5 py-px text-[10px] font-semibold',
                    quartierChips?.has(id) === true
                      ? 'bg-conveniat-green text-white'
                      : 'bg-gray-100 text-gray-500',
                  )}
                >
                  {shortQuartierName(name)}
                </span>
              ))}
            </div>
          )}
        </Link>

        {entry.enable_enrolment === true && (
          <div className="border-t border-gray-100 px-3.5 py-2.5">
            <EnrollmentAction courseId={entry.id} />
          </div>
        )}
      </div>
    </ScheduleTimelineItem>
  );
};
