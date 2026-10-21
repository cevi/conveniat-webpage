import { programmeLabels } from '@/features/schedule/constants/schedule-labels';
import type { ScheduleScope } from '@/features/schedule/hooks/use-schedule-scope';
import { shortQuartierName } from '@/features/schedule/utils/programme-utils';
import type { Locale } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { Star } from 'lucide-react';
import type React from 'react';

/**
 * The row above the timeline: the user's own Quartier or the whole camp, and only the favourites.
 * Somebody without a Quartier sees the whole camp only, so the switch is left out for them.
 */
export const ScheduleViewToggles: React.FC<{
  myQuartiere: { id: string; name: string }[];
  scope: ScheduleScope;
  onScopeChange: (scope: ScheduleScope) => void;
  starredOnly: boolean;
  onStarredOnlyChange: (starredOnly: boolean) => void;
  locale: Locale;
}> = ({ myQuartiere, scope, onScopeChange, starredOnly, onStarredOnlyChange, locale }) => (
  <div className="mb-3 flex items-center gap-2">
    {myQuartiere.length > 0 ? (
      <div
        role="group"
        aria-label={programmeLabels.view[locale]}
        className="flex h-11 min-w-0 flex-1 rounded-xl bg-[#EEF1EE] p-[3px]"
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
    ) : (
      <div className="flex-1" />
    )}

    <button
      type="button"
      aria-pressed={starredOnly}
      aria-label={programmeLabels.favouritesOnly[locale]}
      onClick={() => onStarredOnlyChange(!starredOnly)}
      className={cn(
        'flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-xl border transition-colors',
        starredOnly
          ? 'border-amber-700 bg-amber-50 text-amber-700'
          : 'border-green-100 bg-white text-green-700',
      )}
    >
      <Star className={cn('h-5 w-5', starredOnly && 'fill-amber-700')} aria-hidden="true" />
    </button>
  </div>
);
