'use client';

import { EnrollmentAction } from '@/features/schedule/components/enrollment-action';
import { scheduleLabels } from '@/features/schedule/constants/schedule-labels';
import { useScrollRestoration } from '@/features/schedule/hooks/use-scroll-restoration';
import type { CampScheduleEntryFrontendType } from '@/features/schedule/types/types';
import { getCategoryAccent } from '@/features/schedule/utils/category-utils';
import { resolveLocation } from '@/features/schedule/utils/location-utils';
import { formLabels, quartiereOf } from '@/features/schedule/utils/programme-utils';
import { useCurrentLocale } from '@/hooks/use-current-locale';
import type { Locale } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { CheckCircle, Star } from 'lucide-react';
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

/** One programme block of the compact list: two lines behind a bar in its category's colour. */
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
    <div
      className={cn(
        'relative border-b border-gray-100',
        isNow && 'bg-conveniat-green/5',
        isPast && 'opacity-50',
      )}
    >
      <Link
        href={`/app/schedule?${parameters.toString()}`}
        onClick={saveScrollPosition}
        className="flex items-center gap-3 px-2 py-2.5"
      >
        <span className={cn('w-2 shrink-0 self-stretch rounded-full', accent.bar)} />
        <div className="min-w-0 flex-1">
          <h3 className="flex items-center gap-1.5 text-sm font-semibold text-gray-900">
            <span className="truncate">{entry.title}</span>
            {isStarred && <Star className="h-3 w-3 shrink-0 fill-amber-400 text-amber-400" />}
            {isEnrolled && (
              <CheckCircle
                className="text-conveniat-green h-3.5 w-3.5 shrink-0"
                aria-label={scheduleLabels.enrolledBadge[locale]}
              />
            )}
          </h3>
          <p className="mt-0.5 truncate text-xs text-gray-500">
            {label.length > 0 && (
              <span className={cn('font-semibold', accent.text)}>{label.join(' · ')}</span>
            )}
            {label.length > 0 && location?.title ? ' · ' : ''}
            {location?.title}
          </p>
          {quartiere.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
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
        </div>
        <time className="shrink-0 text-right text-xs leading-tight font-semibold text-gray-700 tabular-nums">
          {start}
          <span className="block font-normal text-gray-400">{end}</span>
        </time>
      </Link>

      {entry.enable_enrolment === true && (
        <div className="px-2 pb-2.5 pl-7">
          <EnrollmentAction courseId={entry.id} />
        </div>
      )}
    </div>
  );
};
