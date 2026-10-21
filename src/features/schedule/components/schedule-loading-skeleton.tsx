import { cn } from '@/utils/tailwindcss-override';
import type React from 'react';

const pulse = 'animate-pulse bg-quiet';

/** a row of the timeline: the time column, the rail, and what sits on it */
const TimelineRow: React.FC<{ isBlock: boolean }> = ({ isBlock }) => (
  <li className="grid grid-cols-[44px_28px_minmax(0,1fr)]">
    <div className={cn('mt-0.5 h-4 w-10 rounded', pulse)} />
    <div className="relative flex justify-center">
      <span aria-hidden="true" className="bg-rail absolute inset-y-0 w-0.5" />
      <span
        className={cn(
          'bg-page relative mt-[5px] rounded-full',
          isBlock ? 'bg-rail h-3 w-3' : 'border-rail-node h-2.5 w-2.5 border-2',
        )}
      />
    </div>
    {isBlock ? (
      <div className="border-line mb-3.5 rounded-[14px] border bg-white px-3.5 py-3">
        <div className={cn('h-3 w-32 rounded', pulse)} />
        <div className={cn('mt-2 h-5 w-2/3 rounded', pulse)} />
        <div className={cn('mt-2 h-3.5 w-40 rounded', pulse)} />
        <div className={cn('mt-1.5 h-3.5 w-28 rounded', pulse)} />
      </div>
    ) : (
      <div className="flex items-center justify-between gap-3 pb-4">
        <div className={cn('h-4 w-36 rounded', pulse)} />
        <div className={cn('h-3.5 w-14 rounded', pulse)} />
      </div>
    )}
  </li>
);

/**
 * The Programm while it loads, in the layout it loads into: the seven days, the line that
 * names the view, and a timeline of logistics rows and blocks. The route's loading screen shows the same, so nothing jumps when the data arrives.
 * The Schichteinsätze share the layout with the filter chips in place of that line, and shifts only.
 */
export const ScheduleLoadingSkeleton: React.FC<{
  showScope?: boolean;
  /** `true` for a card on the timeline, `false` for a logistics row */
  rows?: boolean[];
  chips?: string[];
}> = ({
  showScope = true,
  rows = [false, false, false, true, false, true, true],
  chips = ['w-24', 'w-32', 'w-32', 'w-20'],
}) => (
  <article className="mx-auto w-full max-w-2xl p-4 sm:p-6" aria-hidden="true">
    <div className="flex gap-1.5">
      {[1, 2, 3, 4, 5, 6, 7].map((index) => (
        <div
          key={index}
          className={cn(
            'h-[58px] min-w-0 flex-1 rounded-xl border',
            index === 1 ? 'border-transparent bg-green-200' : 'border-line bg-white',
          )}
        />
      ))}
    </div>

    {/* the Programm: the line that names the view, its filter sits in the header;
        Schichteinsätze: the filter chips */}
    {showScope ? (
      <div className="mt-4 flex h-8 items-center gap-1.5">
        <div className={cn('h-6 w-6 rounded-full', pulse)} />
        <div className={cn('h-3.5 w-16 rounded', pulse)} />
      </div>
    ) : (
      <div className="mt-4 flex gap-2 overflow-hidden">
        {chips.map((width, index) => (
          <div
            key={index}
            className={cn('border-line h-11 shrink-0 rounded-full border bg-white', width)}
          />
        ))}
      </div>
    )}

    <ol className={showScope ? 'mt-4' : 'mt-5'}>
      {rows.map((isBlock, index) => (
        <TimelineRow key={index} isBlock={isBlock} />
      ))}
    </ol>
  </article>
);
