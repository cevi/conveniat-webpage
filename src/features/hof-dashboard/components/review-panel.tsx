'use client';
import { textInputClassName } from '@/components/ui/field';
import type { HofDashboardEntry } from '@/features/hof-dashboard/api/hof-dashboard-data';
import { SECONDARY_BUTTON_CLASS } from '@/features/hof-dashboard/components/dashboard-ui';
import {
  HOF_ENTRY_STATUS_LABELS,
  HOF_REVIEW_CHOICES,
  type HofEntryStatus,
} from '@/features/hof-dashboard/constants';
import {
  useAutosaveReview,
  type AutosaveState,
} from '@/features/hof-dashboard/hooks/use-autosave-review';
import { useWarnBeforeLeaving } from '@/features/hof-dashboard/hooks/use-warn-before-leaving';
import { translate, type TextKey } from '@/features/hof-dashboard/texts';
import { notifyFailure } from '@/features/hof-dashboard/utils/notify-failure';
import { useTRPC } from '@/trpc/client';
import type { Locale } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { Radio, RadioGroup } from '@headlessui/react';
import { Check, CloudOff, Send } from 'lucide-react';
import type React from 'react';
import { useId, useState } from 'react';

import { useMutation, useQueryClient } from '@tanstack/react-query';

/**
 * A comment of the Ressort to the Hof, sent with a button rather than saved as it is typed: one
 * comment is one step of the history, never a half-written one. The same comment twice in a
 * row is no new step, so it cannot be sent again.
 */
const CommentComposer: React.FC<{ entry: HofDashboardEntry; hofId: string; locale: Locale }> = ({
  entry,
  hofId,
  locale,
}) => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const mutation = useMutation(trpc.hofDashboard.addSubmissionComment.mutationOptions());
  const [text, setText] = useState('');
  const commentId = useId();
  const comment = text.trim();
  const latest = entry.reviewLog.findLast((change) => change.comment !== undefined)?.comment;
  useWarnBeforeLeaving(comment !== '');

  const send = async (): Promise<void> => {
    try {
      await mutation.mutateAsync({ hofId, submissionId: entry.id, comment });
      setText('');
      await queryClient.invalidateQueries(trpc.hofDashboard.getHofDashboard.queryFilter({ hofId }));
    } catch {
      // the text stays, to send again once there is signal
      notifyFailure(locale, 'commentFailed');
    }
  };

  return (
    <div className="space-y-2">
      <label htmlFor={commentId} className="font-body block text-sm font-medium text-gray-500">
        {translate('commentLabel', locale)}
      </label>
      <textarea
        id={commentId}
        rows={3}
        maxLength={5000}
        value={text}
        onChange={(event) => setText(event.target.value)}
        className={textInputClassName}
      />
      <button
        type="button"
        className={SECONDARY_BUTTON_CLASS}
        disabled={comment === '' || comment === latest || mutation.isPending}
        onClick={() => void send()}
      >
        <Send aria-hidden />
        {translate(mutation.isPending ? 'saving' : 'sendComment', locale)}
      </button>
    </div>
  );
};

/** "Eingereicht" first: no status of the Ressort yet, the way a new submission starts. */
const CHOICES: HofEntryStatus[] = ['submitted', ...HOF_REVIEW_CHOICES];

const AUTOSAVE_LABEL: Record<Exclude<AutosaveState, 'idle'>, TextKey> = {
  saving: 'saving',
  saved: 'saved',
  offline: 'autosaveOffline',
  error: 'autosaveError',
};

/** Where the autosave stands, as a small pill beside the title; nothing before the first edit. */
const AutosavePill: React.FC<{ state: AutosaveState; locale: Locale; onRetry: () => void }> = ({
  state,
  locale,
  onRetry,
}) => {
  if (state === 'idle') return <span aria-live="polite" />;
  const failed = state === 'error' || state === 'offline';
  return (
    <span aria-live="polite" className="flex items-center gap-2">
      <span
        className={cn(
          'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset',
          failed
            ? 'bg-amber-50 text-amber-800 ring-amber-200'
            : 'bg-gray-100 text-gray-600 ring-gray-200',
        )}
      >
        {state === 'saved' && <Check className="h-3.5 w-3.5" aria-hidden />}
        {failed && <CloudOff className="h-3.5 w-3.5" aria-hidden />}
        {translate(AUTOSAVE_LABEL[state], locale)}
      </span>
      {state === 'error' && (
        <button
          type="button"
          onClick={onRetry}
          className="text-conveniat-green min-h-10 cursor-pointer text-xs font-semibold hover:underline"
        >
          {translate('retry', locale)}
        </button>
      )}
    </span>
  );
};

/**
 * Where a reviewer answers a submission: its status, as the option cards of the site's forms,
 * saved at once without a button, and a comment to the Hof, sent with one. Both land in the
 * history above, with the reviewer's name and the time.
 */
export const ReviewPanel: React.FC<{
  entry: HofDashboardEntry;
  hofId: string;
  /** For the version that counts of a form of versions: it can be made the last one. */
  canFinalize: boolean;
  locale: Locale;
}> = ({ entry, hofId, canFinalize, locale }) => {
  const { values, setStatus, setFinal, state, retry } = useAutosaveReview(hofId, entry.id, {
    status: entry.reviewStatus,
    final: entry.final,
  });
  const finalId = useId();
  const statusId = useId();

  return (
    <div className="space-y-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-gray-900">{translate('reviewTitle', locale)}</p>
        <AutosavePill state={state} locale={locale} onRetry={retry} />
      </div>
      <RadioGroup
        value={values.status ?? 'submitted'}
        onChange={(choice: HofEntryStatus) =>
          setStatus(choice === 'submitted' ? undefined : choice)
        }
        aria-labelledby={statusId}
      >
        <p id={statusId} className="font-body mb-2 text-sm font-medium text-gray-500">
          {translate('reviewStatus', locale)}
        </p>
        {/* one stop for the keyboard; the arrow keys move between the choices */}
        <div className="grid grid-cols-2 gap-2 @3xl:grid-cols-4">
          {CHOICES.map((choice) => (
            <Radio
              key={choice}
              value={choice}
              className="font-body flex min-h-10 cursor-pointer items-center justify-center rounded-lg border-2 border-gray-200 bg-white px-3 py-2 text-center text-sm font-medium text-gray-700 transition-all duration-200 hover:border-gray-300 data-checked:border-green-600 data-checked:bg-green-50 data-checked:text-green-700 data-focus:ring-2 data-focus:ring-green-600 data-focus:ring-offset-2 data-focus:outline-none"
            >
              {HOF_ENTRY_STATUS_LABELS[choice][locale]}
            </Radio>
          ))}
        </div>
      </RadioGroup>
      {canFinalize && (
        <div className="flex items-start gap-3">
          <input
            id={finalId}
            type="checkbox"
            checked={values.final}
            onChange={(event) => setFinal(event.target.checked)}
            className="text-conveniat-green focus:ring-conveniat-green mt-[3px] h-4 w-4 rounded border-0 bg-green-100 shadow-sm ring-1 ring-transparent ring-inset focus:ring-2 focus:ring-offset-0 focus:outline-none"
          />
          <label htmlFor={finalId} className="font-body text-sm text-gray-700">
            <span className="font-medium text-gray-900">{translate('finalLabel', locale)}</span>
            <span className="block text-xs text-gray-500">{translate('finalHint', locale)}</span>
          </label>
        </div>
      )}
      <CommentComposer entry={entry} hofId={hofId} locale={locale} />
      <p className="text-xs text-gray-500">{translate('reviewHint', locale)}</p>
    </div>
  );
};
