'use client';

import type { HofDashboardEntry } from '@/features/hof-dashboard/api/hof-dashboard-data';
import { PRIMARY_BUTTON_CLASS } from '@/features/hof-dashboard/components/dashboard-ui';
import {
  HOF_ENTRY_STATUS_LABELS,
  HOF_REVIEW_STATUSES,
  type HofEntryStatus,
  type HofReviewStatus,
} from '@/features/hof-dashboard/constants';
import { useReviewSubmission } from '@/features/hof-dashboard/hooks/use-review-submission';
import { translate } from '@/features/hof-dashboard/texts';
import type { Locale } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import type React from 'react';
import { useId, useState } from 'react';

/** "Eingereicht" first: no status of the Ressort yet, the way a new submission starts. */
const CHOICES: HofEntryStatus[] = ['submitted', ...HOF_REVIEW_STATUSES];

/**
 * Where a reviewer answers a submission: its status, as the option cards of the site's forms,
 * and the feedback the Hof reads next to it. Saved together, and only once something changed.
 */
export const ReviewPanel: React.FC<{
  entry: HofDashboardEntry;
  hofId: string;
  locale: Locale;
}> = ({ entry, hofId, locale }) => {
  const [status, setStatus] = useState<HofEntryStatus>(entry.reviewStatus ?? 'submitted');
  const [feedback, setFeedback] = useState(entry.feedback ?? '');
  const { review, isPending } = useReviewSubmission(hofId, locale);
  const statusId = useId();
  const feedbackId = useId();
  const changed =
    status !== (entry.reviewStatus ?? 'submitted') || feedback !== (entry.feedback ?? '');

  return (
    <form
      className="space-y-4 rounded-lg border border-gray-200 bg-gray-50 p-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (!changed || isPending) return;
        const reviewStatus: HofReviewStatus | undefined =
          status === 'submitted' ? undefined : status;
        void review(entry.id, reviewStatus, feedback);
      }}
    >
      <p className="text-sm font-semibold text-gray-900">{translate('reviewTitle', locale)}</p>
      <div role="radiogroup" aria-labelledby={statusId}>
        <p id={statusId} className="font-body mb-2 text-sm font-medium text-gray-500">
          {translate('reviewStatus', locale)}
        </p>
        <div className="grid grid-cols-2 gap-2 @3xl:grid-cols-4">
          {CHOICES.map((choice) => (
            <button
              key={choice}
              type="button"
              role="radio"
              aria-checked={status === choice}
              onClick={() => setStatus(choice)}
              className={cn(
                'font-body flex min-h-10 cursor-pointer items-center justify-center rounded-lg border-2 px-3 py-2 text-center text-sm font-medium transition-all duration-200 focus:ring-2 focus:ring-green-600 focus:ring-offset-2 focus:outline-none',
                status === choice
                  ? 'border-green-600 bg-green-50 text-green-700'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50',
              )}
            >
              {HOF_ENTRY_STATUS_LABELS[choice][locale]}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label
          htmlFor={feedbackId}
          className="font-body mb-1 block text-sm font-medium text-gray-500"
        >
          {translate('reviewFeedback', locale)}
        </label>
        <textarea
          id={feedbackId}
          rows={3}
          maxLength={5000}
          value={feedback}
          onChange={(event) => setFeedback(event.target.value)}
          className="focus:ring-conveniat-green font-body min-h-[88px] w-full rounded-md border-0 bg-green-100 px-4 py-2 text-base text-gray-600 shadow-sm ring-1 ring-transparent transition-all duration-200 ring-inset placeholder:text-gray-400 focus:bg-white focus:ring-2 focus:outline-none focus:ring-inset"
        />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          aria-disabled={!changed || isPending}
          className={cn(
            PRIMARY_BUTTON_CLASS,
            'aria-disabled:cursor-not-allowed aria-disabled:opacity-50',
          )}
        >
          {translate(isPending ? 'saving' : 'save', locale)}
        </button>
        <p className="text-xs text-gray-500">{translate('reviewHint', locale)}</p>
      </div>
    </form>
  );
};
