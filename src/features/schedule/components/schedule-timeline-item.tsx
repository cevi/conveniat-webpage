import { cn } from '@/utils/tailwindcss-override';
import type React from 'react';

/**
 * The time column of a stop: when it starts, and under it, smaller, when it ends. A block's
 * start is bold, a meal's or a fixed point's regular. Saying the end here keeps it off the card.
 */
export const TimelineTimes: React.FC<{
  start: string;
  end?: string | undefined;
  isBlock: boolean;
}> = ({ start, end, isBlock }) => (
  <span className="flex flex-col">
    <time className={isBlock ? 'font-bold text-green-900' : 'text-green-700'}>{start}</time>
    {end !== undefined && end !== '' && end !== start && (
      <time className="text-[12px] leading-4 text-green-500">{end}</time>
    )}
  </span>
);

/**
 * One stop on the timeline of a day: the start time, a node on the rail and what happens.
 *
 * Every item draws its own piece of the rail, so the rail needs no measuring: the first item
 * starts it at its node and the last item ends it there. A transfer draws its piece dashed,
 * which reads as "on the way" without a row of its own.
 */
export const ScheduleTimelineItem: React.FC<{
  time?: React.ReactNode;
  node?: React.ReactNode;
  dashed?: boolean;
  /**
   * Over: only the node on the rail fades. Text keeps its contrast, which dimming the whole item
   * took below 4.5:1; the card says "past" with its quiet surface instead.
   */
  isPast?: boolean;
  className?: string;
  children: React.ReactNode;
}> = ({ time, node, dashed = false, isPast = false, className, children }) => (
  <li className={cn('group/item relative grid grid-cols-[44px_28px_minmax(0,1fr)]', className)}>
    <div className="text-[15px] leading-5 tabular-nums">{time}</div>
    <div className="relative flex justify-center">
      <span
        aria-hidden="true"
        className={cn(
          'absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 group-first/item:top-2.5 group-last/item:bottom-auto group-last/item:h-2.5',
          dashed
            ? 'bg-[repeating-linear-gradient(to_bottom,#C3CBC5_0_4px,transparent_4px_8px)]'
            : 'bg-rail',
        )}
      />
      {node !== undefined && (
        <span className={cn('relative mt-[5px] flex', isPast && 'opacity-40 grayscale')}>
          {node}
        </span>
      )}
    </div>
    <div className="min-w-0">{children}</div>
  </li>
);

/**
 * The time it is now: a line across the whole width of the timeline, between the item that
 * started last and the next one. It never runs through a card, where it would cross its text;
 * the running card says "Läuft" itself.
 */
export const ScheduleNowLine: React.FC<{ time: string; label: string }> = ({ time, label }) => (
  <div
    role="img"
    aria-label={label}
    data-now-line
    className="pointer-events-none relative -mt-1 mb-3 grid h-5 grid-cols-[44px_28px_minmax(0,1fr)] items-center"
  >
    <span className="text-live text-[13px] leading-5 font-bold tabular-nums">{time}</span>
    {/* the rail runs on behind the dot */}
    <span className="relative flex h-full justify-center">
      <span className="bg-rail absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2" />
      <span className="bg-live ring-page relative h-2.5 w-2.5 self-center rounded-full ring-2" />
    </span>
    <span className="bg-live -ml-3.5 h-0.5" />
  </div>
);
