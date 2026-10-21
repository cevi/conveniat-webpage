'use client';

import {
  ScheduleFixedRow,
  ScheduleTransferRow,
} from '@/features/schedule/components/schedule-fixed-row';
import { ScheduleRow } from '@/features/schedule/components/schedule-row';
import { ScheduleNowLine } from '@/features/schedule/components/schedule-timeline-item';
import { programmeLabels } from '@/features/schedule/constants/schedule-labels';
import { useScrollToNow } from '@/features/schedule/hooks/use-scroll-to-now';
import type { CampScheduleEntryFrontendType } from '@/features/schedule/types/types';
import { isForQuartiere, quartiereOf, slotOf } from '@/features/schedule/utils/programme-utils';
import { formatDuration, formatMinutesAsTime } from '@/features/schedule/utils/time-utils';
import type { TimelineItem } from '@/features/schedule/utils/timeline';
import { buildTimeline, endOfItem, startOfItem } from '@/features/schedule/utils/timeline';
import type { Locale } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { useCurrentLocale } from 'next-i18n-router/client';
import React, { useMemo, useRef } from 'react';

type Entry = CampScheduleEntryFrontendType;

interface ScheduleListProperties {
  /** the entries of one day */
  entries: Entry[];
  enrolledIds: ReadonlySet<string>;
  starredIds: ReadonlySet<string>;
  onToggleStar: (id: string) => void;
  myQuartierIds: ReadonlySet<string>;
  /** the view of the whole camp: slots of one block, or of one meal, become one item */
  groupSlots: boolean;
  /** the day and the minutes past midnight when the list shows today, `undefined` otherwise */
  now: { dayKey: string; minutes: number } | undefined;
}

/** The slot of an item that is running now, the user's own one first. */
const runningSlotOf = (
  item: TimelineItem,
  minutes: number,
  myQuartierIds: ReadonlySet<string>,
): Entry | undefined => {
  const running = item.slots.filter((entry) => {
    const slot = slotOf(entry);
    return slot !== undefined && slot.start <= minutes && minutes < slot.end;
  });
  return (
    running.find(
      (entry) => quartiereOf(entry).length > 0 && isForQuartiere(entry, myQuartierIds),
    ) ?? running[0]
  );
};

/**
 * The programme of one day as a timeline. The day stays in order at any time: what is over is
 * dimmed in place, never moved, and the line of "now" runs through it on the day that is today.
 */
export const ScheduleList: React.FC<ScheduleListProperties> = ({
  entries,
  enrolledIds,
  starredIds,
  onToggleStar,
  myQuartierIds,
  groupSlots,
  now,
}) => {
  const locale = useCurrentLocale(i18nConfig) as Locale;
  const listReference = useRef<HTMLOListElement>(null);
  const items = useMemo(() => buildTimeline(entries, { groupSlots }), [entries, groupSlots]);
  useScrollToNow(listReference, now?.dayKey);

  const minutes = now?.minutes;
  const nowTime = minutes === undefined ? '' : formatMinutesAsTime(minutes);
  const nowLabel =
    minutes === undefined
      ? ''
      : programmeLabels.nowAt[locale].replace('{{time}}', formatMinutesAsTime(minutes));

  // the line goes before the first item that has not started yet, or through the one running
  const firstUpcoming =
    minutes === undefined ? -1 : items.findIndex((item) => startOfItem(item) > minutes);
  const lineIndex = firstUpcoming === -1 ? items.length : firstUpcoming;
  const before = items[lineIndex - 1];
  const runningBefore =
    minutes !== undefined && before !== undefined && before.type !== 'transfer'
      ? runningSlotOf(before, minutes, myQuartierIds)
      : undefined;

  return (
    <ol ref={listReference} className="pt-1">
      {items.map((item, index) => {
        const isPast = minutes !== undefined && endOfItem(item) <= minutes;
        const standaloneLine =
          minutes !== undefined && index === lineIndex && runningBefore === undefined;

        let row: React.ReactNode;
        if (item.type === 'transfer') {
          row = <ScheduleTransferRow transfer={item} isPast={isPast} />;
        } else {
          const running =
            minutes === undefined ? undefined : runningSlotOf(item, minutes, myQuartierIds);
          const runningSlot = running === undefined ? undefined : slotOf(running);
          const runningLabel =
            minutes === undefined || runningSlot === undefined
              ? undefined
              : programmeLabels.running[locale].replace(
                  '{{duration}}',
                  formatDuration(runningSlot.end - minutes),
                );
          const overlay =
            minutes !== undefined && index === lineIndex - 1 && runningSlot !== undefined ? (
              <ScheduleNowLine
                time={formatMinutesAsTime(minutes)}
                label={nowLabel}
                progress={(minutes - runningSlot.start) / (runningSlot.end - runningSlot.start)}
              />
            ) : undefined;

          row =
            item.type === 'block' ? (
              <ScheduleRow
                stop={item}
                enrolledIds={enrolledIds}
                starredIds={starredIds}
                onToggleStar={onToggleStar}
                myQuartierIds={myQuartierIds}
                showSlots={groupSlots}
                isPast={isPast}
                runningLabel={runningLabel}
                overlay={overlay}
              />
            ) : (
              <ScheduleFixedRow
                stop={item}
                isPast={isPast}
                runningLabel={runningLabel}
                overlay={overlay}
              />
            );
        }

        return (
          <React.Fragment key={item.key}>
            {standaloneLine && (
              <li>
                <ScheduleNowLine time={nowTime} label={nowLabel} />
              </li>
            )}
            {row}
          </React.Fragment>
        );
      })}
      {minutes !== undefined && lineIndex === items.length && runningBefore === undefined && (
        <li>
          <ScheduleNowLine time={nowTime} label={nowLabel} />
        </li>
      )}
    </ol>
  );
};
