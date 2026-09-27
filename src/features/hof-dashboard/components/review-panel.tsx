'use client';

import type { HofDashboardEntry } from '@/features/hof-dashboard/api/hof-dashboard-data';
import {
  HOF_ENTRY_STATUS_LABELS,
  HOF_REVIEW_CHOICES,
  type HofEntryStatus,
} from '@/features/hof-dashboard/constants';
import {
  useAutosaveReview,
  type AutosaveState,
} from '@/features/hof-dashboard/hooks/use-autosave-review';
import { formatDateTime, translate, type TextKey } from '@/features/hof-dashboard/texts';
import AccordionItem from '@/features/payload-cms/components/accordion/accordion-item';
import type { Locale } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { Radio, RadioGroup } from '@headlessui/react';
import { Check, CloudOff } from 'lucide-react';
import type React from 'react';
import { useId, useState } from 'react';

/** Every change of status and feedback, newest first, folded away until asked for. */
const ReviewHistory: React.FC<{ entry: HofDashboardEntry; locale: Locale }> = ({
  entry,
  locale,
}) => {
  const [open, setOpen] = useState(false);
  const historyId = useId();
  return (
    <AccordionItem
      titleElement={
        <span className="text-sm font-semibold text-gray-700">
          {translate('reviewHistory', locale, { n: entry.reviewLog.length })}
        </span>
      }
      showChevron
      accordionId={historyId}
      isExpanded={open}
      onToggle={() => setOpen((shown) => !shown)}
      isNested
    >
      {open && (
        <ol className="space-y-3">
          {entry.reviewLog.map((change, index) => (
            <li key={`${change.at}-${index}`} className="text-sm">
              <p className="text-xs text-gray-500">
                {formatDateTime(change.at, locale)} ·{' '}
                {change.by === '' ? translate('reviewerUnknown', locale) : change.by}
              </p>
              <p className="font-semibold text-gray-900">
                {HOF_ENTRY_STATUS_LABELS[change.status][locale]}
                {change.final && ` · ${translate('finalShort', locale)}`}
              </p>
              {change.feedback !== '' && (
                <p className="whitespace-pre-line text-gray-700">{change.feedback}</p>
              )}
            </li>
          ))}
        </ol>
      )}
    </AccordionItem>
  );
};

/** "Eingereicht" first: no status of the Ressort yet, the way a new submission starts. */
const CHOICES: HofEntryStatus[] = ['submitted', ...HOF_REVIEW_CHOICES];

const AUTOSAVE_LABEL: Record<Exclude<AutosaveState, 'idle'>, TextKey> = {
  typing: 'autosaveTyping',
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
 * and the feedback the Hof reads next to it. Saved as it is given, without a button: a status
 * at once, the feedback once typing pauses.
 */
export const ReviewPanel: React.FC<{
  entry: HofDashboardEntry;
  hofId: string;
  /** For the version that counts of a form of versions: it can be made the last one. */
  canFinalize: boolean;
  locale: Locale;
}> = ({ entry, hofId, canFinalize, locale }) => {
  const { values, setStatus, setFeedback, setFinal, state, retry } = useAutosaveReview(
    hofId,
    entry.id,
    { status: entry.reviewStatus, feedback: entry.feedback ?? '', final: entry.final },
  );
  const finalId = useId();
  const statusId = useId();
  const feedbackId = useId();

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
          value={values.feedback}
          onChange={(event) => setFeedback(event.target.value)}
          className="focus:ring-conveniat-green font-body min-h-[88px] w-full rounded-md border-0 bg-green-100 px-4 py-2 text-base text-gray-600 shadow-sm ring-1 ring-transparent transition-all duration-200 ring-inset placeholder:text-gray-400 focus:bg-white focus:ring-2 focus:outline-none focus:ring-inset"
        />
        <p className="mt-1 text-xs text-gray-500">{translate('reviewHint', locale)}</p>
      </div>
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
      {entry.reviewLog.length > 0 && <ReviewHistory entry={entry} locale={locale} />}
    </div>
  );
};
