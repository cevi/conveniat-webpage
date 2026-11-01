'use client';

import type {
  HofDashboardDocument,
  HofDashboardEntry,
  HofDashboardForm,
} from '@/features/hof-dashboard/api/hof-dashboard-data';
import {
  AreaIcon,
  LABEL_CLASS,
  PRIMARY_BUTTON_CLASS,
  ProgressLine,
  SECONDARY_BUTTON_CLASS,
  SectionHeading,
  StatusPill,
} from '@/features/hof-dashboard/components/dashboard-ui';
import { DocumentLinks } from '@/features/hof-dashboard/components/document-links';
import { EntryAnswers } from '@/features/hof-dashboard/components/entry-answers';
import { ReviewPanel } from '@/features/hof-dashboard/components/review-panel';
import {
  HOF_DASHBOARD_AREA_LABELS,
  HOF_ENTRY_STATUS_LABELS,
  type HofEntryStatus,
} from '@/features/hof-dashboard/constants';
import { useWarnBeforeLeaving } from '@/features/hof-dashboard/hooks/use-warn-before-leaving';
import { useWithdrawSubmission } from '@/features/hof-dashboard/hooks/use-withdraw-submission';
import { formatDate, translate, type TextKey } from '@/features/hof-dashboard/texts';
import { entryHeading } from '@/features/hof-dashboard/utils/entry-heading';
import type { SubmissionProgress } from '@/features/hof-dashboard/utils/submission-progress';
import AccordionItem from '@/features/payload-cms/components/accordion/accordion-item';
import { FormBlock } from '@/features/payload-cms/components/form';
import { trpc } from '@/trpc/client';
import type { Locale } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { ShoppingCart, Trash2, Upload } from 'lucide-react';
import type React from 'react';
import { useCallback, useId, useMemo, useState } from 'react';
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
  // stable, so the focus moves once when the question appears and not on every render
  const focusOnMount = useCallback((button: HTMLButtonElement | null) => button?.focus(), []);
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
          ref={focusOnMount}
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
  /** Whether a reviewer can mark it final: the version that counts of a form of versions. */
  canFinalize?: boolean;
  locale: Locale;
  onWithdraw: (id: string) => Promise<void>;
}> = ({
  entry,
  heading,
  showStatus = true,
  reviewFor,
  canFinalize = false,
  locale,
  onWithdraw,
}) => (
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
        {entry.feedbackBy !== undefined && (
          <p className="mt-1 text-xs opacity-80">
            {translate('feedbackBy', locale, {
              name: entry.feedbackBy.name,
              date: formatDate(entry.feedbackBy.at, locale),
            })}
          </p>
        )}
      </div>
    )}
    <EntryAnswers answers={entry.answers} locale={locale} />
    {reviewFor !== undefined && (
      <ReviewPanel entry={entry} hofId={reviewFor} canFinalize={canFinalize} locale={locale} />
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

/** What the button's neighbour says about handing in again; nothing for a form of entries. */
const actionHint = (form: HofDashboardForm): TextKey | undefined => {
  if (form.mode === 'entries') return undefined;
  return form.area === 'material' ? 'orderHint' : 'versionsHint';
};

/** What the Hof handed in so far: the newest version with the earlier ones folded away below. */
const Submissions: React.FC<{
  form: HofDashboardForm;
  hofId: string;
  isReviewer: boolean;
  locale: Locale;
}> = ({ form, hofId, isReviewer, locale }) => {
  const [showEarlier, setShowEarlier] = useState(false);
  const withdraw = useWithdrawSubmission(hofId, locale);
  const earlierId = useId();
  const [current, ...earlier] = form.entries;

  if (current === undefined) {
    return (
      <div className="border-line rounded-xl border border-dashed p-5">
        <p className="text-base font-semibold text-green-900">{translate('nothingYet', locale)}</p>
        {!isReviewer && (
          <p className="mt-1 text-sm text-green-700">{translate('nothingYetHint', locale)}</p>
        )}
      </div>
    );
  }

  if (form.mode === 'entries') {
    return (
      <div className="divide-line border-line divide-y border-y">
        {form.entries.map((entry, index) => (
          <div key={entry.id} className="py-4">
            <EntryBlock
              entry={entry}
              heading={entryHeading(form, index, locale)}
              locale={locale}
              reviewFor={isReviewer ? hofId : undefined}
              onWithdraw={withdraw}
            />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <EntryBlock
        entry={current}
        heading={entryHeading(form, 0, locale)}
        showStatus={false}
        reviewFor={isReviewer ? hofId : undefined}
        canFinalize
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
            <div className="divide-line divide-y">
              {earlier.map((entry, index) => (
                <div key={entry.id} className="py-4 first:pt-0 last:pb-0">
                  <EntryBlock
                    entry={entry}
                    heading={entryHeading(form, index + 1, locale)}
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
    </div>
  );
};

/**
 * One form the Hof hands in, as the detail beside an area's list: where it stands, what to
 * hand in, the button that opens the form in place with the Hof filled in, the area's
 * documents, and what the Hof handed in with the Ressort's feedback. An opened form takes the
 * full width. Kept mounted while another form is shown, so what was typed survives a look at
 * it; `hidden` takes it out of view.
 */
export const FormDetail: React.FC<{
  form: HofDashboardForm;
  progress: SubmissionProgress;
  hofId: string;
  /** A reviewer answers what the Hof handed in, and hands in nothing for it. */
  isReviewer: boolean;
  /** The documents of the form's area. */
  documents: HofDashboardDocument[];
  hidden: boolean;
  locale: Locale;
}> = ({ form, progress, hofId, isReviewer, documents, hidden, locale }) => {
  const [open, setOpen] = useState(false);
  const utils = trpc.useUtils();
  const titleId = useId();
  useWarnBeforeLeaving(open);
  const presetValues = useMemo(() => ({ [form.hofField]: hofId }), [form.hofField, hofId]);

  const revisionAsked = progress.gap === 'revision';
  const mayHandIn = !isReviewer && !form.closed && !form.finalized;
  const hint = actionHint(form);

  return (
    <article
      data-form={form.id}
      tabIndex={-1}
      hidden={hidden}
      aria-labelledby={titleId}
      className="border-line @container scroll-mt-24 space-y-6 rounded-[14px] border bg-white p-5 outline-none focus-visible:ring-2 focus-visible:ring-green-600 @xl:p-8"
    >
      <header className="space-y-2">
        <p className={cn(LABEL_CLASS, 'flex items-center gap-2')}>
          <AreaIcon area={form.area} />
          {HOF_DASHBOARD_AREA_LABELS[form.area][locale]}
        </p>
        <h3
          id={titleId}
          className="font-heading text-heading text-2xl font-extrabold text-balance @xl:text-3xl"
        >
          {form.title}
        </h3>
        <ProgressLine progress={progress} locale={locale} />
      </header>

      {form.description !== undefined && form.description !== '' && (
        <div className="bg-quiet rounded-xl px-5 py-4">
          <p className="text-base font-semibold text-green-900">
            {translate(isReviewer ? 'whatTheHofHandsIn' : 'whatYouHandIn', locale)}
          </p>
          <p className="mt-1 text-base text-pretty whitespace-pre-line text-green-800">
            {form.description}
          </p>
        </div>
      )}

      {form.closed && form.deadline !== undefined && (
        <p className="bg-quiet rounded-xl px-5 py-4 text-sm text-green-800">
          {translate('formClosed', locale, { date: formatDate(form.deadline, locale) })}
        </p>
      )}

      {form.finalized && !isReviewer && (
        <p className="bg-quiet rounded-xl px-5 py-4 text-sm text-green-800">
          {translate('finalized', locale)}
        </p>
      )}

      {mayHandIn && !open && (
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <button
            type="button"
            // once something is handed in, a new version is no longer the main thing to do,
            // unless the Ressort asked for it
            className={
              revisionAsked || form.entries.length === 0
                ? PRIMARY_BUTTON_CLASS
                : SECONDARY_BUTTON_CLASS
            }
            onClick={() => setOpen(true)}
          >
            {form.area === 'material' ? <ShoppingCart aria-hidden /> : <Upload aria-hidden />}
            {translate(actionLabel(form), locale)}
          </button>
          {hint !== undefined && (
            <p className="max-w-md text-sm text-pretty text-green-700">{translate(hint, locale)}</p>
          )}
        </div>
      )}

      {mayHandIn && open && (
        <div className="bg-page border-line space-y-2 rounded-xl border p-4 @xl:p-6">
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

      {/* a reviewer's answers need the width; for the Hof the documents sit beside its own */}
      <div
        className={cn(
          'grid gap-8',
          !isReviewer &&
            documents.length > 0 &&
            '@min-[600px]:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]',
        )}
      >
        <section className="min-w-0 space-y-3">
          <SectionHeading>
            {translate(isReviewer ? 'hofSubmissions' : 'yourSubmissions', locale)}
          </SectionHeading>
          <Submissions form={form} hofId={hofId} isReviewer={isReviewer} locale={locale} />
        </section>
        {documents.length > 0 && (
          <section className="min-w-0 space-y-1 @min-[600px]:order-first">
            <SectionHeading>{translate('formDocuments', locale)}</SectionHeading>
            <DocumentLinks documents={documents} locale={locale} />
          </section>
        )}
      </div>
    </article>
  );
};
