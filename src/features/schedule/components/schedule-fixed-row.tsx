import { ScheduleTimelineItem } from '@/features/schedule/components/schedule-timeline-item';
import { programmeLabels } from '@/features/schedule/constants/schedule-labels';
import type { CampScheduleEntryFrontendType } from '@/features/schedule/types/types';
import { kindOf, slotOf } from '@/features/schedule/utils/programme-utils';
import { formatDuration } from '@/features/schedule/utils/time-utils';
import type { Locale } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { Clock, Moon, Sunrise, Utensils } from 'lucide-react';
import { useCurrentLocale } from 'next-i18n-router/client';
import type React from 'react';

const iconClassName = 'h-4 w-4 shrink-0 text-green-400';

/** A fixed point of the morning gets a sunrise, one of the late evening a moon. */
const FixedRowIcon: React.FC<{ entry: CampScheduleEntryFrontendType }> = ({ entry }) => {
  if (kindOf(entry) === 'meal') return <Utensils className={iconClassName} />;
  const start = slotOf(entry)?.start;
  if (start === undefined) return <Clock className={iconClassName} />;
  if (start < 9 * 60) return <Sunrise className={iconClassName} />;
  return start >= 21 * 60 ? (
    <Moon className={iconClassName} />
  ) : (
    <Clock className={iconClassName} />
  );
};

/**
 * What frames the day without being a programme block: a meal or a fixed point as a quiet
 * stop on the rail, a transfer as a dashed stretch of it with its duration. None of them
 * opens a detail page.
 */
export const ScheduleFixedRow: React.FC<{
  entry: CampScheduleEntryFrontendType;
  isPast: boolean;
}> = ({ entry, isPast }) => {
  const locale = useCurrentLocale(i18nConfig) as Locale;
  const slot = slotOf(entry);
  const [start = '', end = ''] = entry.timeslot.time.split(' - ');

  if (kindOf(entry) === 'transfer') {
    return (
      <ScheduleTimelineItem dashed className={cn(isPast && 'opacity-50')}>
        <div className="pb-4 text-xs leading-5 text-gray-400">
          {slot !== undefined &&
            slot.end > slot.start &&
            `${formatDuration(slot.end - slot.start)} `}
          {entry.title}
        </div>
      </ScheduleTimelineItem>
    );
  }

  return (
    <ScheduleTimelineItem
      className={cn(isPast && 'opacity-50')}
      time={<time className="text-gray-500">{start}</time>}
      node={<span className="h-3 w-3 rounded-full border-2 border-green-300 bg-[#f8fafc]" />}
    >
      <div className="flex items-center gap-2 pb-4 text-sm leading-5 text-gray-600">
        <FixedRowIcon entry={entry} />
        <span className="truncate">{entry.title}</span>
        {slot !== undefined && slot.end !== slot.start && (
          <time className="ml-auto shrink-0 text-[0.8125rem] text-gray-400 tabular-nums">
            {programmeLabels.until[locale].replace('{{time}}', end)}
          </time>
        )}
      </div>
    </ScheduleTimelineItem>
  );
};
