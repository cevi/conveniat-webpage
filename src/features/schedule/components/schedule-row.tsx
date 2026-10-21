'use client';

import { QuartierGroupBadge } from '@/components/quartier/quartier-badge';
import { EnrollmentAction } from '@/features/schedule/components/enrollment-action';
import { ProgrammeStarButton } from '@/features/schedule/components/programme-star-button';
import {
  ScheduleTimelineItem,
  TimelineTimes,
} from '@/features/schedule/components/schedule-timeline-item';
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
import { cn } from '@/utils/tailwindcss-override';
import { CheckCircle } from 'lucide-react';
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
}

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

  /**
   * Opens the block on this same page, without the router. The page draws the block from the
   * programme already on the phone, but a router navigation to it with another `id` still waited
   * for the server before showing anything, a pause on every tap over camp wifi. `pushState`
   * updates `useSearchParams` all the same, and back returns to the list where it was.
   * A click that asks for a new tab or window keeps the link's own behaviour.
   */
  const openBlock = (event: React.MouseEvent<HTMLAnchorElement>): void => {
    saveScrollPosition();
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return;
    }
    event.preventDefault();
    globalThis.history.pushState(undefined, '', event.currentTarget.href);
  };

  const meta = [
    location?.title,
    !isGrouped && slot !== undefined && slot.end > slot.start
      ? formatDuration(slot.end - slot.start)
      : undefined,
  ].filter((part): part is string => part !== undefined && part !== '');

  return (
    <ScheduleTimelineItem
      isPast={isPast}
      time={<TimelineTimes start={start} end={isGrouped ? undefined : end} isBlock />}
      node={
        <span
          className={cn('ring-page h-3 w-3 rounded-full ring-2', accent.bar)}
          aria-hidden="true"
        />
      }
    >
      <div
        className={cn(
          // the link fills the card, which clips it: the card shows its focus
          'has-[>a:focus-visible]:focus-ring relative mb-3.5 overflow-hidden rounded-[14px] border transition-colors',
          runningLabel === undefined
            ? 'border-line has-[>a:hover]:border-rail'
            : 'border-live-line',
          isPast ? 'bg-quiet border-transparent' : 'bg-white',
        )}
      >
        <Link
          href={hrefOf(primary)}
          onClick={openBlock}
          className="block py-3 pr-12 pl-3.5 focus-visible:outline-none"
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
          {/* the place and how long, in one line: the start and end are in the time column */}
          {meta.length > 0 && (
            <p className="mt-1 truncate text-[13px] leading-[18px] text-green-700 tabular-nums">
              {meta.join(' · ')}
            </p>
          )}
          {showSlots && !isGrouped && quartiereOf(primary).length > 0 && (
            <span className="mt-2 flex">
              <QuartierGroupBadge quartiere={quartiereOf(primary)} myQuartierIds={myQuartierIds} />
            </span>
          )}
          {runningLabel !== undefined && (
            <span className="bg-live-soft text-live-text mt-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold">
              <span className="bg-live h-1.5 w-1.5 rounded-full" />
              {runningLabel}
            </span>
          )}
        </Link>

        <ProgrammeStarButton
          // its reminder is the one asked about when the star comes off
          entryId={starredSlots[0]?.id ?? primary.id}
          isStarred={starredSlots.length > 0}
          // the star is the block's: off clears every starred slot, on stars the user's own
          onToggle={() => {
            for (const { id } of starredSlots.length > 0 ? starredSlots : [primary]) {
              onToggleStar(id);
            }
          }}
          // an enrolled block stays a favourite, as on its page
          isLocked={isEnrolled}
          className="absolute top-1 right-1"
        />

        {showSlots && isGrouped && (
          <ul className="flex flex-col gap-[6px] px-[12px] pb-[12px]">
            {stop.slots.map((entry) => {
              const mine = isMine(entry);
              return (
                <li key={entry.id}>
                  <Link
                    href={hrefOf(entry)}
                    onClick={openBlock}
                    // px, not rem: the root font is larger on desktop. The Quartiere of a slot
                    // are one chip, so the row keeps to one line beside its time.
                    className={cn(
                      'flex min-h-[44px] items-center gap-[12px] rounded-[10px] border px-[10px] py-[6px] transition-colors',
                      mine ? 'border-tint-line bg-tint' : 'hover:bg-quiet border-transparent',
                    )}
                  >
                    <span className="flex min-w-0 flex-1">
                      <QuartierGroupBadge
                        quartiere={quartiereOf(entry)}
                        myQuartierIds={myQuartierIds}
                      />
                    </span>
                    <span className="shrink-0 text-[13px] font-semibold whitespace-nowrap text-green-900 tabular-nums">
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
