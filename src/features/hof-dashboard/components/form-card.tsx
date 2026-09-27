'use client';

import type {
  HofDashboardEntry,
  HofDashboardForm,
} from '@/features/hof-dashboard/api/hof-dashboard-data';
import {
  PRIMARY_BUTTON_CLASS,
  ProgressLine,
  SECONDARY_BUTTON_CLASS,
  SectionHeading,
  StatusPill,
} from '@/features/hof-dashboard/components/dashboard-ui';
import { EntryAnswers } from '@/features/hof-dashboard/components/entry-answers';
import { ReviewPanel } from '@/features/hof-dashboard/components/review-panel';
import { HOF_ENTRY_STATUS_LABELS, type HofEntryStatus } from '@/features/hof-dashboard/constants';
import { useWarnBeforeLeaving } from '@/features/hof-dashboard/hooks/use-warn-before-leaving';
import { useWithdrawSubmission } from '@/features/hof-dashboard/hooks/use-withdraw-submission';
import { formatDate, translate, type TextKey } from '@/features/hof-dashboard/texts';
import type { SubmissionProgress } from '@/features/hof-dashboard/utils/submission-progress';
import AccordionItem from '@/features/payload-cms/components/accordion/accordion-item';
import { FormBlock } from '@/features/payload-cms/components/form';
import { trpc } from '@/trpc/client';
import type { Locale } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { Trash2 } from 'lucide-react';
import type React from 'react';
import { useId, useMemo, useState } from 'react';
import { toast } from 'sonner';

const ENTRY_TONE: Record<HofEntryStatus, 'done' | 'neutral' | 'attention'> = {
  submitted: 'neutral',
  inReview: 'neutral',
  revisionRequired: 'attention',
  accepted: 'done',
};

/** Takes a submission back after a second, inline question: no dialog over the page. */
const WithdrawAction: React.FC<{ locale: Locale; onWithdraw: () => Promise<void> }> = ({
  locale,
  onWithdraw,
}) => {
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  if (!asking) {
    return (
      <button
        type="button"
        className="inline-flex min-h-10 cursor-pointer items-center gap-1.5 rounded-lg px-2 text-sm font-semibold text-gray-500 transition hover:bg-gray-100 hover:text-gray-700"
        onClick={() => setAsking(true)}
      >
        <Trash2 className="h-4 w-4" aria-hidden />
        {translate('withdraw', locale)}
      </button>
    );
  }
  return (
    <div
      role="group"
      className="flex flex-wrap items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-3"
    >
      <p className="text-sm font-medium text-red-900">{translate('withdrawQuestion', locale)}</p>
      <div className="flex gap-2">
        <button
          type="button"
          aria-disabled={busy}
          className="bg-cevi-red inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-lg px-4 text-sm font-bold text-white transition hover:opacity-90 aria-disabled:opacity-50"
          onClick={() => {
            if (busy) return;
            setBusy(true);
            void onWithdraw().finally(() => {
              setBusy(false);
              setAsking(false);
            });
          }}
        >
          <Trash2 className="h-4 w-4" aria-hidden />
          {translate('withdrawConfirm', locale)}
        </button>
        <button
          type="button"
          className={SECONDARY_BUTTON_CLASS}
          onClick={() => setAsking(false)}
          // the button that asked is gone, so the focus lands on the safe answer
          ref={(button) => button?.focus()}
        >
          {translate('cancel', locale)}
        </button>
      </div>
    </div>
  );
};

/** One submission: where it stands, what the Ressort said and what it answered. */
const EntryBlock: React.FC<{
  entry: HofDashboardEntry;
  heading: string;
  /** Off for the version that counts: the card's own status already says where it stands. */
  showStatus?: boolean;
  /** Set for a reviewer, who answers the submission here instead. */
  reviewFor?: string | undefined;
  locale: Locale;
  onWithdraw: (id: string) => Promise<void>;
}> = ({ entry, heading, showStatus = true, reviewFor, locale, onWithdraw }) => (
  <div className="space-y-4">
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <h4 className="text-sm font-bold text-gray-900">{heading}</h4>
      {showStatus && (
        <StatusPill tone={ENTRY_TONE[entry.status]}>
          {HOF_ENTRY_STATUS_LABELS[entry.status][locale]}
        </StatusPill>
      )}
      <span className="text-xs text-gray-500">
        {translate('submittedOn', locale, { date: formatDate(entry.submittedAt, locale) })}
      </span>
    </div>
    {entry.feedback !== undefined && entry.feedback !== '' && (
      // amber while it asks for something; otherwise only a record
      <div
        className={cn(
          'rounded-lg border px-4 py-3 text-sm',
          entry.status === 'revisionRequired'
            ? 'border-amber-200 bg-amber-50 text-amber-900'
            : 'border-gray-200 bg-gray-50 text-gray-700',
        )}
      >
        <p className="font-semibold">
          {translate(entry.status === 'revisionRequired' ? 'feedback' : 'lastFeedback', locale)}
        </p>
        <p className="whitespace-pre-line">{entry.feedback}</p>
      </div>
    )}
    <EntryAnswers answers={entry.answers} locale={locale} />
    {reviewFor !== undefined && (
      // starts over from what is stored once it changes, e.g. saved by another reviewer
      <ReviewPanel
        key={`${entry.reviewStatus ?? ''}:${entry.feedback ?? ''}`}
        entry={entry}
        hofId={reviewFor}
        locale={locale}
      />
    )}
    {/* taking it back is the Hof's; a reviewer answers it above instead */}
    {entry.withdrawable && reviewFor === undefined && (
      <WithdrawAction locale={locale} onWithdraw={() => onWithdraw(entry.id)} />
    )}
  </div>
);

/** The label of the button that opens the form, after what there is already. */
const actionLabel = (form: HofDashboardForm): TextKey => {
  const first = form.entries.length === 0;
  if (form.area === 'material') return first ? 'placeOrder' : 'changeOrder';
  if (first) return 'handIn';
  return form.mode === 'versions' ? 'handInNewVersion' : 'handInAnother';
};

/**
 * One form the Hof hands in: where it stands, what it handed in and what the Ressort said, and
 * the form itself, opened in place with the Hof filled in. Of a form of versions the newest is
 * shown and the earlier ones fold away below it.
 */
export const FormCard: React.FC<{
  form: HofDashboardForm;
  progress: SubmissionProgress;
  hofId: string;
  /** A reviewer answers what the Hof handed in, and hands in nothing for it. */
  isReviewer: boolean;
  locale: Locale;
}> = ({ form, progress, hofId, isReviewer, locale }) => {
  const [open, setOpen] = useState(false);
  const [showEarlier, setShowEarlier] = useState(false);
  const utils = trpc.useUtils();
  const withdraw = useWithdrawSubmission(hofId, locale);
  const titleId = useId();
  const earlierId = useId();
  useWarnBeforeLeaving(open);
  const presetValues = useMemo(() => ({ [form.hofField]: hofId }), [form.hofField, hofId]);

  const [current, ...earlier] = form.entries;
  const versionHeading = (index: number): string =>
    translate('version', locale, { n: form.entries.length - index });
  const revisionAsked = progress.gap === 'revision';

  return (
    <article
      data-form={form.id}
      tabIndex={-1}
      aria-labelledby={titleId}
      className="scroll-mt-24 space-y-5 rounded-xl border border-gray-100 bg-white p-5 shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-green-600 @xl:p-6"
    >
      <header className="space-y-2">
        <SectionHeading area={form.area}>
          <span id={titleId}>{form.title}</span>
        </SectionHeading>
        <ProgressLine progress={progress} locale={locale} />
        {form.description !== undefined && form.description !== '' && (
          <p className="text-sm whitespace-pre-line text-gray-600">{form.description}</p>
        )}
      </header>

      {form.entries.length === 0 && !open && (
        <p className="text-sm text-gray-500">{translate('noEntries', locale)}</p>
      )}

      {form.mode === 'versions' && current !== undefined && (
        <>
          <EntryBlock
            entry={current}
            heading={versionHeading(0)}
            showStatus={false}
            reviewFor={isReviewer ? hofId : undefined}
            locale={locale}
            onWithdraw={withdraw}
          />
          {earlier.length > 0 && (
            <AccordionItem
              titleElement={
                <span className="text-sm font-semibold text-gray-700">
                  {translate('earlierVersions', locale, { n: earlier.length })}
                </span>
              }
              showChevron
              accordionId={earlierId}
              isExpanded={showEarlier}
              onToggle={() => setShowEarlier((shown) => !shown)}
              isNested
            >
              {showEarlier && (
                <div className="divide-y divide-gray-100">
                  {earlier.map((entry, index) => (
                    <div key={entry.id} className="py-4 first:pt-0 last:pb-0">
                      <EntryBlock
                        entry={entry}
                        heading={versionHeading(index + 1)}
                        locale={locale}
                        reviewFor={isReviewer ? hofId : undefined}
                        onWithdraw={withdraw}
                      />
                    </div>
                  ))}
                </div>
              )}
            </AccordionItem>
          )}
        </>
      )}

      {form.mode === 'entries' && form.entries.length > 0 && (
        <div className="divide-y divide-gray-100 border-y border-gray-100">
          {form.entries.map((entry) => (
            <div key={entry.id} className="py-4">
              <EntryBlock
                entry={entry}
                heading={entry.title ?? translate('entryUntitled', locale)}
                locale={locale}
                reviewFor={isReviewer ? hofId : undefined}
                onWithdraw={withdraw}
              />
            </div>
          ))}
        </div>
      )}

      {form.closed && form.deadline !== undefined && (
        <p className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
          {translate('formClosed', locale, { date: formatDate(form.deadline, locale) })}
        </p>
      )}

      {!isReviewer && !form.closed && !open && (
        <button
          type="button"
          // when the Ressort asked for a revision, handing it in is the card's main action
          className={
            revisionAsked || current === undefined ? PRIMARY_BUTTON_CLASS : SECONDARY_BUTTON_CLASS
          }
          onClick={() => setOpen(true)}
        >
          {translate(actionLabel(form), locale)}
        </button>
      )}

      {!isReviewer && !form.closed && open && (
        <div className="space-y-2 rounded-xl border border-gray-100 bg-gray-50 p-4 @xl:p-6">
          <FormBlock
            form={form.form}
            withBorder={false}
            presetValues={presetValues}
            initialValues={form.initialValues}
            onSubmitted={() => {
              setOpen(false);
              toast.success(translate('handedIn', locale));
              void utils.hofDashboard.getHofDashboard.invalidate({ hofId });
            }}
          />
          <button type="button" className={SECONDARY_BUTTON_CLASS} onClick={() => setOpen(false)}>
            {translate('cancel', locale)}
          </button>
        </div>
      )}
    </article>
  );
};
