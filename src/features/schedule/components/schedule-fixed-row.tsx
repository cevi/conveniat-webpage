import {
  ScheduleTimelineItem,
  TimelineTimes,
} from '@/features/schedule/components/schedule-timeline-item';
import { programmeLabels } from '@/features/schedule/constants/schedule-labels';
import type { CampScheduleEntryFrontendType } from '@/features/schedule/types/types';
import { resolveLocation } from '@/features/schedule/utils/location-utils';
import { kindOf, quartiereOf, slotOf } from '@/features/schedule/utils/programme-utils';
import { formatDuration } from '@/features/schedule/utils/time-utils';
import type { TimelineStop, TimelineTransfer } from '@/features/schedule/utils/timeline';
import type { Locale } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { formatQuartierRange } from '@/utils/quartier-names';
import { Clock, Moon, Route, Sunrise, Utensils } from 'lucide-react';
import { useCurrentLocale } from 'next-i18n-router/client';
import React from 'react';

const iconClassName = 'h-[18px] w-[18px] shrink-0 text-green-500';

type Entry = CampScheduleEntryFrontendType;

/** A fixed point of the morning gets a sunrise, one of the late evening a moon. */
const FixedRowIcon: React.FC<{ entry: Entry }> = ({ entry }) => {
  if (kindOf(entry) === 'meal') return <Utensils className={iconClassName} aria-hidden="true" />;
  const start = slotOf(entry)?.start;
  if (start === undefined) return <Clock className={iconClassName} aria-hidden="true" />;
  if (start < 9 * 60) return <Sunrise className={iconClassName} aria-hidden="true" />;
  return start >= 21 * 60 ? (
    <Moon className={iconClassName} aria-hidden="true" />
  ) : (
    <Clock className={iconClassName} aria-hidden="true" />
  );
};

const timeRangeOf = (entry: Entry): string => entry.timeslot.time.replace(' - ', '–');

/**
 * A meal or a fixed point: one compact line on a hollow node, its end under its start. In the
 * view of the whole camp, a meal the Quartiere take one after the other is one line, with their
 * times under it: "Q1–Q3 17:30–18:00 · Q4–Q6 18:00–18:30".
 */
export const ScheduleFixedRow: React.FC<{
  stop: TimelineStop;
  isPast: boolean;
  /** "Läuft · noch 12 min", when it is running */
  runningLabel?: string | undefined;
}> = ({ stop, isPast, runningLabel }) => {
  const first = stop.slots[0];
  const [start = '', end = ''] = first.timeslot.time.split(' - ');
  const isGrouped = stop.slots.length > 1;

  return (
    <ScheduleTimelineItem
      isPast={isPast}
      time={<TimelineTimes start={start} end={isGrouped ? undefined : end} isBlock={false} />}
      node={<span className="border-rail-node bg-page h-2.5 w-2.5 rounded-full border-2" />}
    >
      <div className="flex items-start gap-2 pb-4">
        <FixedRowIcon entry={first} />
        <div className="min-w-0 flex-1">
          <div className="text-[15px] leading-5 font-medium text-green-900">{first.title}</div>
          {isGrouped && (
            <div className="mt-0.5 text-[13px] leading-[18px] text-green-700 tabular-nums">
              {stop.slots.map((entry, index) => (
                <React.Fragment key={entry.id}>
                  {index > 0 && ' · '}
                  {/* one group and its time stay together; the line breaks between groups */}
                  <span className="whitespace-nowrap">
                    <b className="font-bold text-green-900">
                      {formatQuartierRange(quartiereOf(entry).map(({ name }) => name))}
                    </b>{' '}
                    {timeRangeOf(entry)}
                  </span>
                </React.Fragment>
              ))}
            </div>
          )}
          {runningLabel !== undefined && (
            <span className="bg-live-soft text-live-text mt-1 inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-semibold">
              <span className="bg-live h-1.5 w-1.5 rounded-full" />
              {runningLabel}
            </span>
          )}
        </div>
      </div>
    </ScheduleTimelineItem>
  );
};

/**
 * The walk to the next stop, as a dashed stretch of the rail: the route icon, "15′ → Lagerplatz",
 * and on the right the time left before the next stop, "15′ frei". Where the Quartiere walk at
 * different times it says so instead of naming a duration. Screen readers get the words.
 */
export const ScheduleTransferRow: React.FC<{ transfer: TimelineTransfer; isPast: boolean }> = ({
  transfer,
  isPast,
}) => {
  const locale = useCurrentLocale(i18nConfig) as Locale;
  const place = resolveLocation(transfer.to?.location)?.title;
  const minutes = transfer.minutes === undefined ? '' : String(transfer.minutes);
  const duration = transfer.minutes === undefined ? '' : formatDuration(transfer.minutes);

  let shown: string;
  let spoken: string;
  if (transfer.perQuartier) {
    shown =
      place === undefined
        ? programmeLabels.transferPerQuartier[locale]
        : programmeLabels.transferPerQuartierTo[locale].replace('{{place}}', place);
    spoken = programmeLabels.transferPerQuartier[locale];
  } else {
    shown = (place === undefined ? programmeLabels.transferShort : programmeLabels.transferShortTo)[
      locale
    ]
      .replace('{{minutes}}', minutes)
      .replace('{{place}}', place ?? '')
      .trim();
    spoken = (place === undefined ? programmeLabels.transfer : programmeLabels.transferTo)[locale]
      .replace('{{duration}}', duration)
      .replace('{{place}}', place ?? '')
      .trim();
  }

  return (
    <ScheduleTimelineItem dashed isPast={isPast}>
      <div className="flex items-center gap-2 pt-0.5 pb-4 text-[13px] leading-[18px] text-green-700">
        <Route className="h-4 w-4 shrink-0 text-green-500" aria-hidden="true" />
        <span aria-hidden="true" className="min-w-0 flex-1 truncate tabular-nums">
          {shown}
        </span>
        <span className="sr-only">{spoken}</span>
        {transfer.freeMinutes !== undefined && (
          <span className="bg-tint text-conveniat-green shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums">
            <span aria-hidden="true">
              {programmeLabels.freeTime[locale].replace(
                '{{minutes}}',
                String(transfer.freeMinutes),
              )}
            </span>
            <span className="sr-only">
              {programmeLabels.freeTimeLong[locale].replace(
                '{{duration}}',
                formatDuration(transfer.freeMinutes),
              )}
            </span>
          </span>
        )}
      </div>
    </ScheduleTimelineItem>
  );
};
