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
  className?: string;
  children: React.ReactNode;
}> = ({ time, node, dashed = false, className, children }) => (
  <li className={cn('group/item grid grid-cols-[3rem_1.25rem_minmax(0,1fr)] gap-x-2', className)}>
    <div className="text-right text-sm leading-5 tabular-nums">{time}</div>
    <div className="relative flex justify-center">
      <span
        aria-hidden="true"
        className={cn(
          'absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 group-first/item:top-2.5 group-last/item:bottom-auto group-last/item:h-2.5',
          dashed
            ? 'bg-[repeating-linear-gradient(to_bottom,#CFD0D2_0_3px,transparent_3px_7px)]'
            : 'bg-green-100',
        )}
      />
      {node !== undefined && <span className="relative mt-1 flex">{node}</span>}
    </div>
    <div className="min-w-0">{children}</div>
  </li>
);
