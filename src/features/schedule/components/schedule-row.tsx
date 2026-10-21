'use client';

import { StarButton } from '@/components/star/star';
import { EnrollmentAction } from '@/features/schedule/components/enrollment-action';
import { ScheduleTimelineItem } from '@/features/schedule/components/schedule-timeline-item';
import { programmeLabels, scheduleLabels } from '@/features/schedule/constants/schedule-labels';
import { useScrollRestoration } from '@/features/schedule/hooks/use-scroll-restoration';
import type { CampScheduleEntryFrontendType } from '@/features/schedule/types/types';
import { getCategoryAccent } from '@/features/schedule/utils/category-utils';
import { resolveLocation } from '@/features/schedule/utils/location-utils';
import { isForQuartiere, quartiereOf, slotOf } from '@/features/schedule/utils/programme-utils';
import { formatDuration } from '@/features/schedule/utils/time-utils';
import type { TimelineStop } from '@/features/schedule/utils/timeline';
import type { Locale } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { shortQuartierName } from '@/utils/quartier-names';
import { cn } from '@/utils/tailwindcss-override';
import { CheckCircle, Clock, MapPin } from 'lucide-react';
import { useCurrentLocale } from 'next-i18n-router/client';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import type React from 'react';

type Entry = CampScheduleEntryFrontendType;

interface ScheduleRowProperties {
  stop: TimelineStop;
  enrolledIds: ReadonlySet<string>;
  starredIds: ReadonlySet<string>;
  onToggleStar: (id: string) => void;
  /** the user's Quartiere: their slot of a block is the one the card opens and highlights */
  myQuartierIds: ReadonlySet<string>;
  /** in the view of the whole camp: the Quartiere of the block, one row per slot if it has several */
  showSlots: boolean;
  /** the block is over, on the day that is today */
  isPast: boolean;
  /** "Läuft · noch 18 min", when it is running */
  runningLabel?: string | undefined;
  overlay?: React.ReactNode;
}

/** "Q5", filled when it is the user's own Quartier. */
const QuartierChip: React.FC<{ name: string | undefined; isMine: boolean }> = ({
  name,
  isMine,
}) => (
  <span
    className={cn(
      'rounded-md px-1.5 py-0.5 text-xs font-bold',
      isMine ? 'bg-conveniat-green text-white' : 'bg-chip text-green-900',
    )}
  >
    {shortQuartierName(name)}
  </span>
);

/** One block on the timeline: a card, its node in the category's colour. */
export const ScheduleRow: React.FC<ScheduleRowProperties> = ({
  stop,
  enrolledIds,
  starredIds,
  onToggleStar,
  myQuartierIds,
  showSlots,
  isPast,
  runningLabel,
  overlay,
}) => {
  const locale = useCurrentLocale(i18nConfig) as Locale;
  const searchParameters = useSearchParams();
  const { saveScrollPosition } = useScrollRestoration();

  const isMine = (entry: Entry): boolean =>
    myQuartierIds.size > 0 && quartiereOf(entry).length > 0 && isForQuartiere(entry, myQuartierIds);
  const primary = stop.slots.find((entry) => isMine(entry)) ?? stop.slots[0];

  const location = resolveLocation(primary.location);
  const accent = getCategoryAccent(primary.category);
  // guarded: a phone can restore a form this version does not know
  const form = (programmeLabels.form as Record<string, Record<Locale, string> | undefined>)[
    primary.form ?? ''
  ]?.[locale];
  const eyebrow = [accent.label, form].filter((part) => part !== undefined && part !== '');
  const starredSlots = stop.slots.filter(({ id }) => starredIds.has(id));
  const isEnrolled = stop.slots.some(({ id }) => enrolledIds.has(id));
  const [start = ''] = stop.slots[0].timeslot.time.split(' - ');
  const [, end = ''] = primary.timeslot.time.split(' - ');
  const slot = slotOf(primary);
  const isGrouped = stop.slots.length > 1;

  const hrefOf = (entry: Entry): string => {
    const parameters = new URLSearchParams(searchParameters.toString());
    parameters.set('id', entry.id);
    return `/app/schedule?${parameters.toString()}`;
  };

  return (
    <ScheduleTimelineItem
      isPast={isPast}
      time={<time className="font-bold text-green-900">{start}</time>}
      node={
        <span
          className={cn('ring-page h-3 w-3 rounded-full ring-2', accent.bar)}
          aria-hidden="true"
        />
      }
      overlay={overlay}
    >
      <div
        className={cn(
          'relative mb-3.5 overflow-hidden rounded-[14px] border',
          runningLabel === undefined ? 'border-line' : 'border-live-line',
          isPast ? 'bg-quiet border-transparent' : 'bg-white',
        )}
      >
        <Link
          href={hrefOf(primary)}
          onClick={saveScrollPosition}
          className="block py-3 pr-12 pl-3.5"
        >
          {eyebrow.length > 0 && (
            <div className={cn('text-xs font-semibold', accent.text)}>{eyebrow.join(' · ')}</div>
          )}
          <h3 className="mt-0.5 flex items-center gap-1.5 text-[17px] leading-[22px] font-[650] text-green-900">
            <span className="truncate">{primary.title}</span>
            {isEnrolled && (
              <CheckCircle
                className="text-conveniat-green h-4 w-4 shrink-0"
                aria-label={scheduleLabels.enrolledBadge[locale]}
              />
            )}
          </h3>
          <p className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[13px] leading-[18px] text-green-700">
            {!isGrouped && slot !== undefined && slot.end > slot.start && (
              <span className="flex items-center gap-1 tabular-nums">
                <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                {programmeLabels.until[locale].replace('{{time}}', end)} ·{' '}
                {formatDuration(slot.end - slot.start)}
              </span>
            )}
            {location?.title !== undefined && location.title !== '' && (
              <span className="flex min-w-0 items-center gap-1">
                <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span className="truncate">{location.title}</span>
              </span>
            )}
          </p>
          {showSlots && !isGrouped && quartiereOf(primary).length > 0 && (
            <span className="mt-2 flex flex-wrap gap-1">
              {quartiereOf(primary).map(({ id, name }) => (
                <QuartierChip key={id} name={name} isMine={myQuartierIds.has(id)} />
              ))}
            </span>
          )}
          {runningLabel !== undefined && (
            <span className="bg-live-soft text-live-text mt-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold">
              <span className="bg-live h-1.5 w-1.5 rounded-full" />
              {runningLabel}
            </span>
          )}
        </Link>

        <StarButton
          id={primary.id}
          isStared={starredSlots.length > 0}
          // the star is the block's: off clears every starred slot, on stars the user's own
          toggleStar={() => {
            for (const { id } of starredSlots.length > 0 ? starredSlots : [primary]) {
              onToggleStar(id);
            }
          }}
          // an enrolled block stays a favourite, as on its page
          isLocked={isEnrolled}
          className="absolute top-1 right-1"
        />

        {showSlots && isGrouped && (
          <ul className="flex flex-col gap-1.5 px-2.5 pb-2.5">
            {stop.slots.map((entry) => {
              const mine = isMine(entry);
              return (
                <li key={entry.id}>
                  <Link
                    href={hrefOf(entry)}
                    onClick={saveScrollPosition}
                    className={cn(
                      'flex min-h-11 items-center gap-1 rounded-[10px] border px-2.5',
                      mine ? 'border-tint-line bg-tint' : 'border-transparent',
                    )}
                  >
                    {quartiereOf(entry).map(({ id, name }) => (
                      <QuartierChip key={id} name={name} isMine={myQuartierIds.has(id)} />
                    ))}
                    <span className="ml-auto text-[13px] font-semibold text-green-900 tabular-nums">
                      {entry.timeslot.time.replace(' - ', '–')}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}

        {primary.enable_enrolment === true && (
          <div className="border-line border-t px-3.5 py-2.5">
            <EnrollmentAction courseId={primary.id} />
          </div>
        )}
      </div>
    </ScheduleTimelineItem>
  );
};
