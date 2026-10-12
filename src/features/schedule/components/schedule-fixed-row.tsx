import type { CampScheduleEntryFrontendType } from '@/features/schedule/types/types';
import { kindOf, slotOf } from '@/features/schedule/utils/programme-utils';
import { formatDuration } from '@/features/schedule/utils/time-utils';
import { cn } from '@/utils/tailwindcss-override';
import { Clock, Moon, Sunrise, Utensils } from 'lucide-react';
import type React from 'react';

const iconClassName = 'text-conveniat-green h-3.5 w-3.5 shrink-0';

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
 * What frames the day without being a programme block: a meal or a fixed point as one gray
 * line, a transfer as a small note with its duration. None of them opens a detail page.
 */
export const ScheduleFixedRow: React.FC<{
  entry: CampScheduleEntryFrontendType;
  isPast: boolean;
}> = ({ entry, isPast }) => {
  const slot = slotOf(entry);

  if (kindOf(entry) === 'transfer') {
    return (
      <div
        className={cn(
          'border-b border-gray-100 py-1 pr-2 pl-7 text-[11px] text-gray-400',
          isPast && 'opacity-50',
        )}
      >
        {slot !== undefined && slot.end > slot.start && `${formatDuration(slot.end - slot.start)} `}
        {entry.title}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex items-center gap-2.5 border-b border-gray-100 bg-gray-50 px-2 py-1.5 text-xs text-gray-500',
        isPast && 'opacity-50',
      )}
    >
      <FixedRowIcon entry={entry} />
      <span className="truncate">{entry.title}</span>
      <time className="ml-auto shrink-0 tabular-nums">
        {slot !== undefined && slot.end === slot.start
          ? entry.timeslot.time.split(' - ')[0]
          : entry.timeslot.time.replace(' - ', ' – ')}
      </time>
    </div>
  );
};
