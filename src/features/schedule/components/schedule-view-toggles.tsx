import { segmentClassName, segmentedTrackClassName } from '@/components/ui/segmented-control';
import { programmeLabels } from '@/features/schedule/constants/schedule-labels';
import type { ScheduleScope } from '@/features/schedule/hooks/use-schedule-scope';
import type { Locale } from '@/types/types';
import { quartierNicknameOf, shortQuartierName } from '@/utils/quartier-names';
import { cn } from '@/utils/tailwindcss-override';
import type React from 'react';

/**
 * Switches the programme between the user's own Quartier and the whole camp. Somebody without a
 * Quartier sees the whole camp only, so there is nothing to switch for them. The own side is
 * called by the Quartier's name, "Greif Q5"; with several Quartiere it is "Für mich".
 */
export const ScheduleViewToggles: React.FC<{
  myQuartiere: { id: string; name: string }[];
  scope: ScheduleScope;
  onScopeChange: (scope: ScheduleScope) => void;
  locale: Locale;
  className?: string;
}> = ({ myQuartiere, scope, onScopeChange, locale, className }) => {
  if (myQuartiere.length === 0) return <></>;
  const [onlyQuartier] = myQuartiere;
  const mineLabel =
    myQuartiere.length === 1 && quartierNicknameOf(onlyQuartier?.name) !== ''
      ? quartierNicknameOf(onlyQuartier?.name)
      : programmeLabels.forMe[locale];
  return (
    <div
      role="group"
      aria-label={programmeLabels.view[locale]}
      className={cn(segmentedTrackClassName, className)}
    >
      {(['mine', 'all'] as const).map((value) => (
        <button
          key={value}
          type="button"
          aria-pressed={scope === value}
          onClick={() => onScopeChange(value)}
          className={cn(
            segmentClassName(scope === value),
            'flex-1 gap-1.5 px-2 text-sm font-semibold',
          )}
        >
          <span className="truncate">
            {value === 'mine' ? mineLabel : programmeLabels.allQuartiere[locale]}
          </span>
          {value === 'mine' &&
            myQuartiere.map(({ id, name }) => (
              <span
                key={id}
                className="bg-chip shrink-0 rounded-md px-1.5 py-0.5 text-[11px] leading-4 font-bold text-green-700"
              >
                {shortQuartierName(name)}
              </span>
            ))}
        </button>
      ))}
    </div>
  );
};
