import { cn } from '@/utils/tailwindcss-override';
import type React from 'react';

const pulse = 'animate-pulse bg-quiet';

/** The schedule list while it loads: day cards, scope switch, search and a timeline. */
export const ScheduleLoadingSkeleton: React.FC = () => {
  return (
    <article className="mx-auto w-full max-w-2xl p-4 sm:p-6">
      <div className="flex items-center gap-1.5">
        <div className="w-7 shrink-0" />
        {[1, 2, 3, 4, 5].map((index) => (
          <div key={index} className={cn('h-14 min-w-0 flex-1 rounded-xl', pulse)} />
        ))}
        <div className="w-7 shrink-0" />
      </div>

      <div className={cn('mt-4 h-[42px] rounded-xl', pulse)} />

      <div className="mt-3 flex gap-2">
        <div className={cn('h-11 flex-1 rounded-xl', pulse)} />
        <div className={cn('h-11 w-11 shrink-0 rounded-xl', pulse)} />
        <div className={cn('h-11 w-11 shrink-0 rounded-xl', pulse)} />
      </div>

      <ol className="mt-5">
        {[1, 2, 3, 4].map((index) => (
          <li key={index} className="grid grid-cols-[3rem_1.25rem_minmax(0,1fr)] gap-x-2">
            <div className={cn('ml-auto h-4 w-10 rounded', pulse)} />
            <div className="flex justify-center">
              <div className="w-0.5 bg-green-100" />
            </div>
            <div className={cn('mb-3 h-24 rounded-[14px]', pulse)} />
          </li>
        ))}
      </ol>
    </article>
  );
};
