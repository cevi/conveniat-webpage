import { programmeLabels } from '@/features/schedule/constants/schedule-labels';
import type { ScheduleScope } from '@/features/schedule/hooks/use-schedule-scope';
import type { Locale } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import type React from 'react';

/** Switches the programme between the user's own Quartier and the whole camp. */
export const ScheduleScopeSwitch: React.FC<{
  myQuartiere: { id: string; name: string }[];
  scope: ScheduleScope;
  onScopeChange: (scope: ScheduleScope) => void;
  locale: Locale;
}> = ({ myQuartiere, scope, onScopeChange, locale }) => {
  const options: { value: ScheduleScope; label: string }[] = [
    { value: 'mine', label: myQuartiere.map(({ name }) => name).join(' / ') },
    { value: 'all', label: programmeLabels.wholeCamp[locale] },
  ];

  return (
    <div className="mb-3 flex rounded-xl bg-gray-100 p-1">
      {options.map(({ value, label }) => (
        <button
          key={value}
          type="button"
          aria-pressed={scope === value}
          onClick={() => onScopeChange(value)}
          className={cn(
            'min-w-0 flex-1 cursor-pointer truncate rounded-lg px-2 py-1.5 text-xs font-semibold transition-colors',
            scope === value ? 'text-conveniat-green bg-white shadow-xs' : 'text-gray-500',
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
};
