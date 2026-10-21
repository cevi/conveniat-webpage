import { cn } from '@/utils/tailwindcss-override';
import type React from 'react';

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
  /** drawn over the item, such as the line of "now" through a block that is running */
  overlay?: React.ReactNode;
  children: React.ReactNode;
}> = ({ time, node, dashed = false, isPast = false, className, overlay, children }) => (
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
    {overlay}
  </li>
);

/**
 * The time it is now, as a line across the time column and the rail. Placed between two items,
 * or, at `progress`, through the item that is running; it stops at a card's edge so it never
 * crosses its text.
 */
export const ScheduleNowLine: React.FC<{
  time: string;
  label: string;
  progress?: number;
}> = ({ time, label, progress }) => (
  <div
    role="img"
    aria-label={label}
    data-now-line
    className={cn(
      'pointer-events-none z-10 grid items-center',
      progress === undefined
        ? 'relative -mt-2 mb-2 h-4 grid-cols-[44px_28px_1fr]'
        : 'absolute left-0 -translate-y-1/2 grid-cols-[44px_28px_8px]',
    )}
    style={progress === undefined ? undefined : { top: `${Math.round(progress * 100)}%` }}
  >
    <span className="bg-live -ml-1 justify-self-start rounded-md px-1 py-px text-[11px] leading-4 font-bold text-white tabular-nums">
      {time}
    </span>
    <span className="bg-live h-2.5 w-2.5 justify-self-center rounded-full" />
    <span className="bg-live h-0.5" />
  </div>
);
