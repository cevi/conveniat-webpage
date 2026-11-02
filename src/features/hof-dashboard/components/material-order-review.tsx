'use client';

import { textInputClassName } from '@/components/ui/field';
import type {
  MaterialOrderForm,
  MaterialOrderItem,
  MaterialOrderOfHof,
  MaterialOrderVersion,
} from '@/features/hof-dashboard/api/material-orders';
import {
  LABEL_CLASS,
  Panel,
  PRIMARY_BUTTON_CLASS,
  QUIET_BUTTON_CLASS,
  SECONDARY_BUTTON_CLASS,
  SectionHeading,
  StatusPill,
} from '@/features/hof-dashboard/components/dashboard-ui';
import {
  HOF_ENTRY_STATUS_LABELS,
  type HofEntryStatus,
  type HofReviewChoice,
} from '@/features/hof-dashboard/constants';
import {
  formatDate,
  formatDateTime,
  formatNumber,
  translate,
  type TextKey,
} from '@/features/hof-dashboard/texts';
import { notifyFailure } from '@/features/hof-dashboard/utils/notify-failure';
import { trpc } from '@/trpc/client';
import type { Locale } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { ChevronLeft, Lock, RotateCcw, Undo2 } from 'lucide-react';
import type React from 'react';
import { useId, useState } from 'react';
import { toast } from 'sonner';

/** One line of the order: what the Hof ordered now, and before. */
interface OrderLine {
  item: MaterialOrderItem;
  quantity: number;
  previous: number | undefined;
}

/** The lines of the newest version and those it dropped, in the form's order. */
const orderLines = (
  form: MaterialOrderForm,
  current: Record<string, number>,
  previous: Record<string, number> | undefined,
): OrderLine[] =>
  form.items.flatMap((item): OrderLine[] => {
    const quantity = current[item.id] ?? 0;
    const before = previous === undefined ? undefined : (previous[item.id] ?? 0);
    return quantity === 0 && (before ?? 0) === 0 ? [] : [{ item, quantity, previous: before }];
  });

/** What changed from one version to the next, one line per change. */
const changesOf = (
  form: MaterialOrderForm,
  version: MaterialOrderVersion,
  previous: MaterialOrderVersion | undefined,
  locale: Locale,
): string[] => {
  if (previous === undefined) {
    return [translate('positionsOrdered', locale, { n: Object.keys(version.quantities).length })];
  }
  const changes = orderLines(form, version.quantities, previous.quantities)
    .filter((line) => line.quantity !== line.previous)
    .map(
      (line) =>
        `${line.item.name}: ${formatNumber(line.previous ?? 0, locale)} → ${formatNumber(line.quantity, locale)}`,
    );
  const remarks = (entry: MaterialOrderVersion): string =>
    JSON.stringify(entry.remarks.map((remark) => remark.text));
  if (remarks(version) !== remarks(previous)) changes.push(translate('remarksChanged', locale));
  return changes;
};

/** One step of the order's history: a version handed in, or an answer of the Ressort. */
interface HistoryStep {
  at: string;
  title: string;
  by: string;
  lines: string[];
  quote: string | undefined;
  tone: 'version' | 'revision' | 'accepted' | 'review';
}

const historyOf = (
  form: MaterialOrderForm,
  versions: readonly MaterialOrderVersion[],
  locale: Locale,
): HistoryStep[] => {
  const oldestFirst = versions.toReversed();
  const steps = oldestFirst.flatMap((version, index): HistoryStep[] => [
    {
      at: version.submittedAt,
      title: translate('versionHandedIn', locale, { n: index + 1 }),
      by: translate('hof', locale),
      lines: changesOf(form, version, oldestFirst[index - 1], locale),
      quote: undefined,
      tone: 'version',
    },
    ...version.reviewLog.map((change): HistoryStep => ({
      at: change.at,
      title: `${HOF_ENTRY_STATUS_LABELS[change.status][locale]}${change.final ? ` · ${translate('finalShort', locale)}` : ''}`,
      by: change.by === '' ? translate('reviewerUnknown', locale) : change.by,
      lines: [],
      quote: change.feedback === '' ? undefined : change.feedback,
      tone: REVIEW_TONE[change.status],
    })),
  ]);
  return steps.toSorted((a, b) => b.at.localeCompare(a.at));
};

const REVIEW_TONE: Record<HofEntryStatus, HistoryStep['tone']> = {
  submitted: 'review',
  inReview: 'review',
  revisionRequired: 'revision',
  accepted: 'accepted',
};

const STEP_DOT: Record<HistoryStep['tone'], string> = {
  version: 'bg-gray-300',
  review: 'bg-gray-500',
  revision: 'bg-amber-600',
  accepted: 'bg-conveniat-green',
};

/** The change of a line as a signed number, or that it is new. */
const changeLabel = (line: OrderLine, locale: Locale): string | undefined => {
  if (line.previous === undefined || line.previous === line.quantity) return undefined;
  if (line.previous === 0) return translate('newLine', locale);
  const difference = line.quantity - line.previous;
  return `${difference > 0 ? '+' : '−'}${formatNumber(Math.abs(difference), locale)}`;
};

/** What the answer bar says: what the Ressort answered last, or what it can do. */
const answerHint = (version: MaterialOrderVersion, confirmed: boolean): TextKey => {
  if (confirmed) return 'orderConfirmed';
  return version.status === 'revisionRequired' ? 'orderRejected' : 'reviewOrderHint';
};

/** The Ressort's answer on the newest version: send it back with a reason, or confirm it. */
const ReviewActions: React.FC<{
  hofId: string;
  version: MaterialOrderVersion;
  locale: Locale;
}> = ({ hofId, version, locale }) => {
  const utils = trpc.useUtils();
  const mutation = trpc.hofDashboard.updateSubmissionReview.useMutation({ networkMode: 'always' });
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState(version.feedback);
  const reasonId = useId();
  const confirmed = version.status === 'accepted' && version.final;

  const answer = async (
    status: HofReviewChoice | undefined,
    feedback: string,
    final: boolean,
  ): Promise<void> => {
    try {
      await mutation.mutateAsync({ hofId, submissionId: version.id, status, feedback, final });
      toast.success(translate('saved', locale));
      setRejecting(false);
    } catch {
      notifyFailure(locale, 'reviewFailed');
    }
    await Promise.all([
      utils.hofDashboard.getMaterialOrderList.invalidate(),
      utils.hofDashboard.getHofOverview.invalidate(),
      utils.hofDashboard.getHofDashboard.invalidate({ hofId }),
    ]);
  };

  return (
    <Panel className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="max-w-xl text-base text-pretty text-green-800">
          {translate(answerHint(version, confirmed), locale)}
        </p>
        <div className="flex flex-wrap gap-2">
          {confirmed ? (
            // the way back: the order is open again, and the Hof can hand in a new version
            <button
              type="button"
              className={SECONDARY_BUTTON_CLASS}
              disabled={mutation.isPending}
              onClick={() => void answer(undefined, version.feedback, false)}
            >
              <RotateCcw aria-hidden />
              {translate('reopen', locale)}
            </button>
          ) : (
            <>
              <button
                type="button"
                aria-expanded={rejecting}
                className={cn(
                  SECONDARY_BUTTON_CLASS,
                  'border-amber-300 text-amber-800 hover:bg-amber-50',
                )}
                disabled={mutation.isPending}
                onClick={() => setRejecting((open) => !open)}
              >
                <Undo2 aria-hidden />
                {translate('reject', locale)}
              </button>
              <button
                type="button"
                className={PRIMARY_BUTTON_CLASS}
                disabled={mutation.isPending}
                onClick={() => void answer('accepted', version.feedback, true)}
              >
                <Lock aria-hidden />
                {translate('confirmOrder', locale)}
              </button>
            </>
          )}
        </div>
      </div>
      {rejecting && !confirmed && (
        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            void answer('revisionRequired', reason.trim(), false);
          }}
        >
          <label htmlFor={reasonId} className="block text-sm font-semibold text-green-900">
            {translate('rejectReason', locale)}
          </label>
          <textarea
            id={reasonId}
            rows={3}
            required
            maxLength={5000}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            className={textInputClassName}
          />
          <div className="flex flex-wrap gap-2">
            <button type="submit" className={PRIMARY_BUTTON_CLASS} disabled={mutation.isPending}>
              {translate('reject', locale)}
            </button>
            <button
              type="button"
              className={SECONDARY_BUTTON_CLASS}
              onClick={() => setRejecting(false)}
            >
              {translate('cancel', locale)}
            </button>
          </div>
        </form>
      )}
    </Panel>
  );
};

/**
 * One Hof's material order, for the Ressort: what it ordered now and how that changed from the
 * version before, its remarks, the history of versions and answers, and the answer itself.
 * Every other answer, such as feedback alone, is given on the Hof's dashboard.
 */
export const MaterialOrderReview: React.FC<{
  form: MaterialOrderForm;
  hof: MaterialOrderOfHof;
  onBack: () => void;
  onOpenInDashboard: () => void;
  locale: Locale;
}> = ({ form, hof, onBack, onOpenInDashboard, locale }) => {
  const [current, previous] = hof.versions;
  const lines = orderLines(
    form,
    hof.quantities,
    form.mode === 'versions' ? previous?.quantities : undefined,
  );
  const sections: { section: string | undefined; lines: OrderLine[] }[] = [];
  for (const line of lines) {
    const last = sections.at(-1);
    if (last !== undefined && last.section === line.item.section) last.lines.push(line);
    else sections.push({ section: line.item.section, lines: [line] });
  }
  const history = historyOf(form, hof.versions, locale);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <button type="button" className={cn(QUIET_BUTTON_CLASS, '-ml-3')} onClick={onBack}>
          <ChevronLeft aria-hidden />
          {translate('allMaterialOrders', locale)}
        </button>
        <p className={LABEL_CLASS}>{form.title}</p>
        <h3 className="font-heading text-heading text-2xl font-extrabold text-balance @xl:text-3xl">
          {hof.hofName}
        </h3>
        {current !== undefined && (
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-green-700">
            <StatusPill tone={current.status === 'revisionRequired' ? 'attention' : 'neutral'}>
              {HOF_ENTRY_STATUS_LABELS[current.status][locale]}
            </StatusPill>
            <span>
              {translate('versionOn', locale, {
                n: hof.versions.length,
                date: formatDate(current.submittedAt, locale),
              })}
              {form.deadline !== undefined &&
                ` · ${translate('dueOn', locale, { date: formatDate(form.deadline, locale) })}`}
            </span>
            <button
              type="button"
              className="text-conveniat-green min-h-11 cursor-pointer font-semibold underline underline-offset-2"
              onClick={onOpenInDashboard}
            >
              {translate('openInDashboard', locale)}
            </button>
          </p>
        )}
      </div>

      {current === undefined ? (
        <Panel>
          <p className="text-base text-green-700">
            {translate('noOrderYet', locale, { hof: hof.hofName })}
          </p>
        </Panel>
      ) : (
        <>
          <ReviewActions key={current.id} hofId={hof.hofId} version={current} locale={locale} />
          <div className="grid items-start gap-6 @4xl:grid-cols-[minmax(0,1fr)_minmax(16rem,22rem)]">
            <Panel className="overflow-hidden p-0 @xl:p-0">
              <table className="w-full text-base">
                <thead className="bg-page">
                  <tr className={LABEL_CLASS}>
                    <th scope="col" className="px-5 py-3 text-left font-bold @xl:px-6">
                      {translate('material', locale)}
                    </th>
                    <th scope="col" className="px-3 py-3 text-right font-bold">
                      {translate('hofOrdered', locale)}
                    </th>
                    <th scope="col" className="px-5 py-3 text-left font-bold @xl:px-6">
                      {translate('change', locale)}
                    </th>
                  </tr>
                </thead>
                {sections.map(({ section, lines: ofSection }, index) => (
                  <tbody key={section ?? `section-${index}`} className="divide-line divide-y">
                    {section !== undefined && (
                      <tr>
                        <th
                          scope="colgroup"
                          colSpan={3}
                          className={cn(
                            LABEL_CLASS,
                            'border-line border-t px-5 pt-5 pb-2 text-left @xl:px-6',
                          )}
                        >
                          {section}
                        </th>
                      </tr>
                    )}
                    {ofSection.map((line) => {
                      const change = changeLabel(line, locale);
                      return (
                        <tr key={line.item.id}>
                          <th
                            scope="row"
                            className="px-5 py-3 text-left font-normal text-green-900 @xl:px-6"
                          >
                            {line.item.name}
                          </th>
                          <td
                            className={cn(
                              'px-3 py-3 text-right font-semibold tabular-nums',
                              line.quantity === 0 ? 'text-gray-400 line-through' : 'text-green-900',
                            )}
                          >
                            {formatNumber(line.quantity, locale)}
                          </td>
                          <td className="px-5 py-3 text-sm text-amber-800 tabular-nums @xl:px-6">
                            {change}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                ))}
              </table>
            </Panel>

            <div className="space-y-6">
              {current.remarks.length > 0 && (
                <Panel className="space-y-3">
                  <SectionHeading className="text-xl">
                    {translate('remarksOfHof', locale)}
                  </SectionHeading>
                  <dl className="space-y-3">
                    {current.remarks.map((remark) => (
                      <div key={remark.label}>
                        <dt className="text-sm text-green-700">{remark.label}</dt>
                        <dd className="text-base whitespace-pre-line text-green-900">
                          {remark.text}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </Panel>
              )}
              <Panel className="space-y-4">
                <div className="flex items-baseline justify-between gap-2">
                  <SectionHeading className="text-xl">
                    {translate('history', locale)}
                  </SectionHeading>
                  <span className="text-sm text-green-700">
                    {translate('entriesCount', locale, { n: history.length })}
                  </span>
                </div>
                <ol>
                  {history.map((step, index) => (
                    <li
                      key={`${step.at}-${step.title}`}
                      className="relative flex gap-3 pb-5 last:pb-0"
                    >
                      {index < history.length - 1 && (
                        <span
                          aria-hidden
                          className="bg-rail absolute top-4 bottom-0 left-[5px] w-px"
                        />
                      )}
                      <span
                        aria-hidden
                        className={cn(
                          'relative mt-1.5 h-3 w-3 shrink-0 rounded-full',
                          STEP_DOT[step.tone],
                        )}
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
              </Panel>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
