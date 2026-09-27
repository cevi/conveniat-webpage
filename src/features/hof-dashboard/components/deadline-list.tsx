import type { HofDashboardDeadline } from '@/features/hof-dashboard/api/hof-dashboard-data';
import { formatCountdown, formatDate, translate } from '@/features/hof-dashboard/texts';
import { daysUntil } from '@/features/hof-dashboard/utils/submission-progress';
import type { Locale } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import type React from 'react';

/** Deadlines, soonest first, with the passed ones set back in grey. */
export const DeadlineList: React.FC<{
  deadlines: Pick<HofDashboardDeadline, 'id' | 'date' | 'title'>[];
  locale: Locale;
}> = ({ deadlines, locale }) => {
  const now = new Date();
  if (deadlines.length === 0) {
    return <p className="text-sm text-gray-500">{translate('noDeadlines', locale)}</p>;
  }
  return (
    <ol className="space-y-3">
      {deadlines.map((deadline) => {
        const daysLeft = daysUntil(deadline.date, now);
        const passed = daysLeft < 0;
        return (
          <li key={deadline.id} className="flex gap-4 text-sm">
            <span
              className={cn(
                'w-24 shrink-0 font-semibold tabular-nums',
                passed ? 'text-gray-500' : 'text-gray-900',
              )}
            >
              {formatDate(deadline.date, locale)}
            </span>
            <span className="min-w-0 flex-1">
              <span className={cn('block', passed ? 'text-gray-500' : 'text-gray-900')}>
                {deadline.title}
              </span>
              <span className="text-xs text-gray-600">
                {passed ? translate('deadlinePassed', locale) : formatCountdown(daysLeft, locale)}
              </span>
            </span>
          </li>
        );
      })}
    </ol>
  );
};
