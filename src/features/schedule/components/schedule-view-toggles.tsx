import { QuartierBadge, QuartierDot } from '@/components/quartier/quartier-badge';
import { segmentClassName, segmentedTrackClassName } from '@/components/ui/segmented-control';
import { programmeLabels } from '@/features/schedule/constants/schedule-labels';
import type { MyQuartier, ScheduleScope } from '@/features/schedule/hooks/use-schedule-scope';
import type { Locale } from '@/types/types';
import { quartierRufnameOf } from '@/utils/quartier-names';
import { cn } from '@/utils/tailwindcss-override';
import type React from 'react';

/**
 * Switches the programme between the user's own Quartier and the whole camp. Somebody without a
 * Quartier sees the whole camp only, so there is nothing to switch for them. The own side is
 * called by the Quartier's icon and Rufname, "Greif": the icon is the one on the Q5 chips of the
 * cards below, and a long Rufname such as Wolpertinger keeps its room. With several Quartiere it
 * is "Für mich" with a chip for each.
 */
export const ScheduleViewToggles: React.FC<{
  myQuartiere: MyQuartier[];
  scope: ScheduleScope;
  onScopeChange: (scope: ScheduleScope) => void;
  locale: Locale;
  className?: string;
}> = ({ myQuartiere, scope, onScopeChange, locale, className }) => {
  if (myQuartiere.length === 0) return <></>;
  const [onlyQuartier] = myQuartiere;
  const mineLabel =
    myQuartiere.length === 1 && onlyQuartier !== undefined && quartierRufnameOf(onlyQuartier) !== ''
      ? quartierRufnameOf(onlyQuartier)
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
          {value === 'mine' && onlyQuartier !== undefined && myQuartiere.length === 1 && (
            <QuartierDot quartier={onlyQuartier} />
          )}
          <span className="truncate">
            {value === 'mine' ? mineLabel : programmeLabels.allQuartiere[locale]}
          </span>
          {value === 'mine' &&
            myQuartiere.length > 1 &&
            myQuartiere.map((quartier) => (
              <QuartierBadge key={quartier.id} quartier={quartier} className="shrink-0" />
            ))}
        </button>
      ))}
    </div>
  );
};
