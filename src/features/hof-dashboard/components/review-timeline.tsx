import type { HofDashboardEntry } from '@/features/hof-dashboard/api/hof-dashboard-data';
import { LABEL_CLASS } from '@/features/hof-dashboard/components/dashboard-ui';
import { formatDateTime, translate } from '@/features/hof-dashboard/texts';
import { entrySteps, type TimelineStep } from '@/features/hof-dashboard/utils/review-steps';
import type { Locale } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import type React from 'react';

const STEP_DOT: Record<TimelineStep['tone'], string> = {
  version: 'bg-gray-300',
  review: 'bg-gray-500',
  revision: 'bg-amber-600',
  accepted: 'bg-conveniat-green',
};

/** Steps of a history on a rail, each with who did it and when, and its comment quoted. */
export const Timeline: React.FC<{ steps: readonly TimelineStep[]; locale: Locale }> = ({
  steps,
  locale,
}) => (
  <ol>
    {steps.map((step, index) => (
      <li key={`${step.at}-${step.title}`} className="relative flex gap-3 pb-5 last:pb-0">
        {index < steps.length - 1 && (
          <span aria-hidden className="bg-rail absolute top-4 bottom-0 left-[5px] w-px" />
        )}
        <span
          aria-hidden
          className={cn('relative mt-1.5 h-3 w-3 shrink-0 rounded-full', STEP_DOT[step.tone])}
        />
        <div className="min-w-0 space-y-1">
          <p className="text-base font-semibold text-green-900">{step.title}</p>
          <p className="text-xs text-green-700">
            {formatDateTime(step.at, locale)} · {step.by}
          </p>
          {step.lines.map((line) => (
            <p key={line} className="text-sm text-green-800">
              {line}
            </p>
          ))}
          {step.quote !== undefined && (
            <p className="bg-quiet rounded-lg px-3 py-2 text-sm whitespace-pre-line text-green-800">
              «{step.quote}»
            </p>
          )}
        </div>
      </li>
    ))}
  </ol>
);

/**
 * The history of one submission, open for the Hof and the Ressort alike: who handed it in, and
 * every status the Ressort set and every comment it wrote, each with the name and the time.
 */
export const EntryTimeline: React.FC<{ entry: HofDashboardEntry; locale: Locale }> = ({
  entry,
  locale,
}) => (
  <section className="space-y-3">
    <h5 className={LABEL_CLASS}>{translate('history', locale)}</h5>
    <Timeline steps={entrySteps(entry, locale)} locale={locale} />
  </section>
);
