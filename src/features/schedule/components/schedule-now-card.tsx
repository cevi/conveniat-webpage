import { programmeLabels } from '@/features/schedule/constants/schedule-labels';
import type { CampScheduleEntryFrontendType } from '@/features/schedule/types/types';
import { getCategoryAccent } from '@/features/schedule/utils/category-utils';
import { resolveLocation } from '@/features/schedule/utils/location-utils';
import type { NowAndNext } from '@/features/schedule/utils/programme-utils';
import { formLabels, kindOf } from '@/features/schedule/utils/programme-utils';
import { formatDuration } from '@/features/schedule/utils/time-utils';
import type { Locale } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { Clock, MapPin } from 'lucide-react';
import Link from 'next/link';
import type React from 'react';

type Entry = CampScheduleEntryFrontendType;

const startOf = (entry: Entry): string => entry.timeslot.time.split(' - ')[0] ?? '';

/** "Lagersport · RP" for a programme block, nothing for a meal or a fixed point. */
const labelOf = (entry: Entry): string =>
  [
    getCategoryAccent(entry.category).label,
    typeof entry.form === 'string' ? formLabels[entry.form] : undefined,
  ]
    .filter((part) => part !== undefined && part !== '')
    .join(' · ');

const TimeAndPlace: React.FC<{ entry: Entry }> = ({ entry }) => {
  const location = resolveLocation(entry.location);
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-sm text-white/90">
      <span className="flex items-center gap-1">
        <Clock className="h-3.5 w-3.5" />
        {entry.timeslot.time.replace(' - ', ' – ')}
      </span>
      {location?.title && (
        <span className="flex items-center gap-1">
          <MapPin className="h-3.5 w-3.5" />
          {location.title}
        </span>
      )}
    </div>
  );
};

/**
 * What is on right now and what comes after it, above the list of today. Between two blocks
 * it turns into "up next" with a countdown and what to bring, so people know where to go.
 */
export const ScheduleNowCard: React.FC<{
  nowAndNext: NowAndNext<Entry>;
  locale: Locale;
  /** where the detail page of an entry is, with the current filters kept */
  hrefOf: (entry: Entry) => string;
}> = ({ nowAndNext, locale, hrefOf }) => {
  const { current, next, progress, minutesLeft, minutesUntilNext } = nowAndNext;
  const headline = current ?? next;
  if (headline === undefined) return <></>;

  const isRunning = current !== undefined;
  const after = isRunning ? next : undefined;
  const bring = isRunning ? [] : (headline.bring ?? []).map(({ item }) => item);

  const eyebrow = isRunning
    ? [programmeLabels.now[locale], labelOf(headline)]
    : [
        programmeLabels.upNext[locale],
        programmeLabels.inMinutes[locale].replace('{{duration}}', formatDuration(minutesUntilNext)),
      ];

  const body = (
    <>
      <div className="flex items-center gap-1.5 text-[10px] font-bold tracking-wider text-white/85 uppercase">
        <span
          className={cn('h-1.5 w-1.5 rounded-full', isRunning ? 'bg-emerald-300' : 'bg-amber-300')}
        />
        {eyebrow.filter((part) => part !== '').join(' · ')}
      </div>
      <h2 className="font-heading mt-1.5 mb-1 text-lg leading-tight font-bold">{headline.title}</h2>
      <TimeAndPlace entry={headline} />

      {isRunning && (
        <>
          <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/25">
            <div
              className="h-full bg-white"
              style={{ width: `${Math.round(Math.min(1, Math.max(0, progress)) * 100)}%` }}
            />
          </div>
          <div className="mt-1.5 text-xs text-white/85">
            {programmeLabels.minutesLeft[locale].replace(
              '{{duration}}',
              formatDuration(minutesLeft),
            )}
          </div>
        </>
      )}

      {bring.length > 0 && (
        <div className="mt-2 text-xs text-white/85">
          {programmeLabels.bring[locale]}: {bring.join(', ')}
        </div>
      )}
    </>
  );

  return (
    <div className="bg-conveniat-green mb-3 rounded-2xl text-white">
      {kindOf(headline) === 'program' ? (
        <Link href={hrefOf(headline)} className="block px-4 pt-3.5 pb-3">
          {body}
        </Link>
      ) : (
        <div className="px-4 pt-3.5 pb-3">{body}</div>
      )}

      {after !== undefined && (
        <div className="mx-4 flex items-center gap-2.5 border-t border-white/20 py-2.5 text-xs">
          <div className="min-w-0 flex-1">
            <div className="text-white/80">{programmeLabels.afterwards[locale]}</div>
            <div className="truncate text-sm font-semibold">{after.title}</div>
            <div className="truncate text-white/80">{resolveLocation(after.location)?.title}</div>
          </div>
          <time className="font-semibold tabular-nums">{startOf(after)}</time>
        </div>
      )}
    </div>
  );
};
