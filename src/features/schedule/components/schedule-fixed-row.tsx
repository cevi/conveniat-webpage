import { ScheduleTimelineItem } from '@/features/schedule/components/schedule-timeline-item';
import { programmeLabels } from '@/features/schedule/constants/schedule-labels';
import type { CampScheduleEntryFrontendType } from '@/features/schedule/types/types';
import { resolveLocation } from '@/features/schedule/utils/location-utils';
import { kindOf, quartiereOf, slotOf } from '@/features/schedule/utils/programme-utils';
import { formatDuration } from '@/features/schedule/utils/time-utils';
import type { TimelineStop, TimelineTransfer } from '@/features/schedule/utils/timeline';
import type { Locale } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { formatQuartierRange } from '@/utils/quartier-names';
import { cn } from '@/utils/tailwindcss-override';
import { ArrowDown, Clock, Moon, Sunrise, Utensils } from 'lucide-react';
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
 * A meal or a fixed point: one compact line on a hollow node, "bis 12:30" on the right. In the
 * view of the whole camp, a meal the Quartiere take one after the other is one line, with their
 * times under it: "Q1–Q3 17:30–18:00 · Q4–Q6 18:00–18:30".
 */
export const ScheduleFixedRow: React.FC<{
  stop: TimelineStop;
  isPast: boolean;
  /** "Läuft · noch 12 min", when it is running */
  runningLabel?: string | undefined;
  overlay?: React.ReactNode;
}> = ({ stop, isPast, runningLabel, overlay }) => {
  const locale = useCurrentLocale(i18nConfig) as Locale;
  const first = stop.slots[0];
  const slot = slotOf(first);
  const [start = '', end = ''] = first.timeslot.time.split(' - ');
  const isGrouped = stop.slots.length > 1;

  return (
    <ScheduleTimelineItem
      className={cn(isPast && 'opacity-55')}
      time={<time className="text-green-700">{start}</time>}
      node={<span className="border-rail-node bg-page h-2.5 w-2.5 rounded-full border-2" />}
      overlay={overlay}
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
        {!isGrouped && slot !== undefined && slot.end !== slot.start && (
          <time className="shrink-0 text-[13px] leading-5 text-green-500 tabular-nums">
            {programmeLabels.until[locale].replace('{{time}}', end)}
          </time>
        )}
      </div>
    </ScheduleTimelineItem>
  );
};

/**
 * The walk to the next stop, as a dashed stretch of the rail: "15 min Verschiebung → Lagerplatz".
 * Where the Quartiere walk at different times it says so instead of naming a duration.
 */
export const ScheduleTransferRow: React.FC<{ transfer: TimelineTransfer; isPast: boolean }> = ({
  transfer,
  isPast,
}) => {
  const locale = useCurrentLocale(i18nConfig) as Locale;
  const place = resolveLocation(transfer.to?.location)?.title;
  const duration = transfer.minutes === undefined ? '' : formatDuration(transfer.minutes);

  let text: string = programmeLabels.transferPerQuartier[locale];
  if (!transfer.perQuartier) {
    text = (place === undefined ? programmeLabels.transfer : programmeLabels.transferTo)[locale]
      .replace('{{duration}}', duration)
      .replace('{{place}}', place ?? '')
      .trim();
  }

  return (
    <ScheduleTimelineItem dashed className={cn(isPast && 'opacity-55')}>
      <div className="flex items-center gap-1.5 pt-0.5 pb-4 text-[13px] leading-[18px] text-green-500">
        <ArrowDown className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span>{text}</span>
      </div>
    </ScheduleTimelineItem>
  );
};
