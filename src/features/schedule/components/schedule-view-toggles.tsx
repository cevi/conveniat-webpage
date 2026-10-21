import { programmeLabels } from '@/features/schedule/constants/schedule-labels';
import type { ScheduleScope } from '@/features/schedule/hooks/use-schedule-scope';
import type { Locale } from '@/types/types';
import { shortQuartierName } from '@/utils/quartier-names';
import { cn } from '@/utils/tailwindcss-override';
import type React from 'react';

/**
 * Switches the programme between the user's own Quartier and the whole camp. Somebody without a
 * Quartier sees the whole camp only, so there is nothing to switch for them.
 */
export const ScheduleViewToggles: React.FC<{
  myQuartiere: { id: string; name: string }[];
  scope: ScheduleScope;
  onScopeChange: (scope: ScheduleScope) => void;
  locale: Locale;
}> = ({ myQuartiere, scope, onScopeChange, locale }) => {
  if (myQuartiere.length === 0) return <></>;
  return (
    <div
      role="group"
      aria-label={programmeLabels.view[locale]}
      className="bg-quiet mb-3 flex h-11 rounded-xl p-[3px]"
    >
      {(['mine', 'all'] as const).map((value) => (
        <button
          key={value}
          type="button"
          aria-current={scope === value ? 'true' : undefined}
          onClick={() => onScopeChange(value)}
          className={cn(
            'flex min-w-0 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-[9px] px-2 text-sm font-semibold transition-colors',
            scope === value ? 'bg-white text-green-900 shadow-xs' : 'text-green-700',
          )}
        >
          <span className="truncate">
            {value === 'mine'
              ? programmeLabels.forMe[locale]
              : programmeLabels.allQuartiere[locale]}
          </span>
          {value === 'mine' &&
            myQuartiere.map(({ id, name }) => (
              <span
                key={id}
                className="bg-conveniat-green shrink-0 rounded-md px-1.5 py-0.5 text-[11px] leading-4 font-bold text-white"
              >
                {shortQuartierName(name)}
              </span>
            ))}
        </button>
      ))}
    </div>
  );
};
