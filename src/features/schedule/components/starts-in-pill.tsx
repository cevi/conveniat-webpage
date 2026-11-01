'use client';

import { reminderLabels } from '@/features/schedule/constants/reminder-labels';
import { programmeLabels } from '@/features/schedule/constants/schedule-labels';
import { useNow } from '@/features/schedule/hooks/use-now';
import { slotOf } from '@/features/schedule/utils/programme-utils';
import { dayKeyOf, formatDuration } from '@/features/schedule/utils/time-utils';
import type { Locale } from '@/types/types';
import { campInstantOf } from '@/utils/camp-clock';
import { cn } from '@/utils/tailwindcss-override';
import type React from 'react';

/** How long before its start a block says how soon it starts; earlier, the time says enough. */
const SOON_MINUTES = 60;

const MINUTE = 60_000;

/**
 * "Startet in 18 min" shortly before a block, "Läuft · noch 12 min" while it runs, nothing
 * otherwise. Counted on the camp's clock, so a phone in another timezone reads the same.
 */
export const StartsInPill: React.FC<{
  timeslot: { date: string; time: string };
  locale: Locale;
}> = ({ timeslot, locale }) => {
  const now = useNow();
  const slot = slotOf({ timeslot });
  const dayKey = dayKeyOf(timeslot.date);
  if (slot === undefined || dayKey === '') return <></>;
  const start = campInstantOf(dayKey, slot.start);
  const end = campInstantOf(dayKey, slot.end);
  if (start === undefined || end === undefined) return <></>;

  const untilStart = Math.ceil((start.getTime() - now.getTime()) / MINUTE);
  const untilEnd = Math.ceil((end.getTime() - now.getTime()) / MINUTE);
  const isRunning = untilStart <= 0 && untilEnd > 0;
  if (!isRunning && (untilStart <= 0 || untilStart > SOON_MINUTES)) return <></>;

  const text = isRunning
    ? programmeLabels.running[locale].replace('{{duration}}', formatDuration(untilEnd))
    : reminderLabels.startsIn[locale].replace('{{duration}}', formatDuration(untilStart));
  return (
    // orange only while it runs: it means "now", as on Home
    <span
      className={cn(
        'inline-flex h-7 items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold tabular-nums',
        isRunning ? 'bg-live-soft text-live-text' : 'bg-chip text-green-900',
      )}
    >
      {isRunning && <span className="bg-live h-1.5 w-1.5 rounded-full" aria-hidden="true" />}
      {text}
    </span>
  );
};
