import type { HofDashboardDeadline } from '@/features/hof-dashboard/api/hof-dashboard-data';
import { StatusPill } from '@/features/hof-dashboard/components/dashboard-ui';
import {
  formatDate,
  formatTimeLeft,
  translate,
  translateCount,
} from '@/features/hof-dashboard/texts';
import { daysUntil } from '@/features/hof-dashboard/utils/submission-progress';
import type { Locale } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import type React from 'react';

/** How many forms are due on a day, and how many of them still ask something of the Hof. */
export interface DueOnDay {
  forms: number;
  open: number;
}

/** What is due per day, as `daysUntil` counts it, from where each form stands. */
export const dueByDay = (
  forms: readonly { deadline: string | undefined; open: boolean }[],
  now: Date,
): Map<number, DueOnDay> => {
  const due = new Map<number, DueOnDay>();
  for (const form of forms) {
    if (form.deadline === undefined) continue;
    const day = daysUntil(form.deadline, now);
    const counted = due.get(day) ?? { forms: 0, open: 0 };
    due.set(day, { forms: counted.forms + 1, open: counted.open + (form.open ? 1 : 0) });
  }
  return due;
};

/** One day on a timeline: its deadlines, or only today's marker. */
interface TimelineDay {
  date: string;
  daysLeft: number;
  titles: string[];
}

/** The deadlines by calendar day, soonest first. */
const byDay = (
  deadlines: readonly Pick<HofDashboardDeadline, 'date' | 'title'>[],
  now: Date,
): TimelineDay[] => {
  const days = new Map<number, TimelineDay>();
  for (const deadline of deadlines) {
    const daysLeft = daysUntil(deadline.date, now);
    const day = days.get(daysLeft) ?? { date: deadline.date, daysLeft, titles: [] };
    day.titles.push(deadline.title);
    days.set(daysLeft, day);
  }
  return [...days.values()].toSorted((a, b) => a.daysLeft - b.daysLeft);
};

type NodeKind = 'current' | 'future' | 'passed';

/** Passed, the one that stands out, or still to come. */
const nodeKind = (day: TimelineDay, current: TimelineDay | undefined): NodeKind => {
  if (day === current) return 'current';
  return day.daysLeft < 0 ? 'passed' : 'future';
};

/** The dot of a day: today or the next one filled, a day to come hollow, one passed small and grey. */
const Node: React.FC<{ kind: NodeKind }> = ({ kind }) => (
  <span aria-hidden className="relative z-10 flex h-5 w-5 shrink-0 items-center justify-center">
    <span
      className={cn(
        'rounded-full',
        kind === 'current' && 'bg-conveniat-green ring-tint-line h-3.5 w-3.5 ring-4',
        kind === 'future' && 'border-rail-node h-3.5 w-3.5 border-2 bg-white',
        kind === 'passed' && 'h-2.5 w-2.5 bg-gray-300',
      )}
    />
  </span>
);

/** What is due on a day: how much is still open, or that all of it is done. */
const DueLine: React.FC<{ due: DueOnDay | undefined; locale: Locale }> = ({ due, locale }) => {
  if (due === undefined || due.forms === 0) return <></>;
  if (due.open > 0) {
    return (
      <p className="text-sm text-green-600">
        {translateCount(due.open, 'openCountOne', 'openCountMany', locale)}
      </p>
    );
  }
  return (
    <p className="pt-1">
      <StatusPill tone="done">{translate('doneGroup', locale)}</StatusPill>
    </p>
  );
};

/**
 * The camp's deadlines as a timeline down the page, with today marked where it falls. What
 * has passed is left out unless something due then is still open, so the first line is what
 * matters now. `due` says per day, as `daysUntil` counts it, what is due then.
 */
export const DeadlineTimeline: React.FC<{
  deadlines: readonly Pick<HofDashboardDeadline, 'date' | 'title'>[];
  due?: ReadonlyMap<number, DueOnDay>;
  locale: Locale;
}> = ({ deadlines, due, locale }) => {
  const now = new Date();
  const days = byDay(deadlines, now).filter(
    (day) => day.daysLeft >= 0 || (due?.get(day.daysLeft)?.open ?? 0) > 0,
  );
  if (!days.some((day) => day.daysLeft === 0)) {
    const today: TimelineDay = { date: now.toISOString(), daysLeft: 0, titles: [] };
    const at = days.findIndex((day) => day.daysLeft > 0);
    days.splice(at === -1 ? days.length : at, 0, today);
  }

  return (
    <ol>
      {days.map((day, index) => {
        const isToday = day.daysLeft === 0;
        const passed = day.daysLeft < 0;
        return (
          <li key={day.daysLeft} className="relative flex gap-3 pb-6 last:pb-0">
            {index < days.length - 1 && (
              <span aria-hidden className="bg-rail absolute top-5 bottom-0 left-[9.5px] w-px" />
            )}
            <Node kind={nodeKind(day, isToday ? day : undefined)} />
            <div className="min-w-0 flex-1 space-y-0.5" aria-current={isToday ? 'date' : undefined}>
              <p className={cn('text-sm', passed ? 'text-danger-text' : 'text-green-700')}>
                <span className="text-heading font-semibold tabular-nums">
                  {isToday
                    ? translate('todayOn', locale, { date: formatDate(day.date, locale) })
                    : formatDate(day.date, locale)}
                </span>
                {!isToday && ` · ${formatTimeLeft(day.daysLeft, locale)}`}
              </p>
              {day.titles.map((title) => (
                <p key={title} className="text-base text-balance text-green-900">
                  {title}
                </p>
              ))}
              <DueLine due={due?.get(day.daysLeft)} locale={locale} />
            </div>
          </li>
        );
      })}
    </ol>
  );
};

/**
 * An area's deadlines across the page, the next one filled: what comes when, at a glance over
 * the area's forms. Scrolls sideways when there are more than fit.
 */
export const DeadlineStrip: React.FC<{
  deadlines: readonly Pick<HofDashboardDeadline, 'date' | 'title'>[];
  due?: ReadonlyMap<number, DueOnDay>;
  locale: Locale;
}> = ({ deadlines, due, locale }) => {
  const days = byDay(deadlines, new Date());
  if (days.length === 0) {
    return <p className="text-sm text-green-600">{translate('noDeadlines', locale)}</p>;
  }
  const next = days.find((day) => day.daysLeft >= 0);
  return (
    <ol className="grid auto-cols-[minmax(8rem,1fr)] grid-flow-col overflow-x-auto pb-1">
      {days.map((day, index) => {
        const passed = day.daysLeft < 0;
        return (
          <li key={day.daysLeft} className="min-w-0 space-y-1 pr-5">
            <div className="flex items-center gap-2">
              <Node kind={nodeKind(day, next)} />
              {index < days.length - 1 && (
                <span
                  aria-hidden
                  className={cn('h-px flex-1', passed ? 'bg-gray-300' : 'bg-rail')}
                />
              )}
            </div>
            <p className={cn('text-sm font-semibold', passed ? 'text-gray-500' : 'text-green-700')}>
              <span className="tabular-nums">{formatDate(day.date, locale)}</span> ·{' '}
              {formatTimeLeft(day.daysLeft, locale)}
            </p>
            {day.titles.map((title) => (
              <p
                key={title}
                className={cn(
                  'text-sm font-semibold text-balance',
                  passed ? 'text-gray-500' : 'text-heading',
                )}
              >
                {title}
              </p>
            ))}
            <DueLine due={due?.get(day.daysLeft)} locale={locale} />
          </li>
        );
      })}
    </ol>
  );
};
