'use client';

import { format, labels } from '@/features/material/components/material-labels';
import { focusRing, MaterialButton } from '@/features/material/components/material-ui';
import {
  useInvalidateMaterial,
  useMaterialLocale,
  type MaterialLoan,
} from '@/features/material/hooks/use-material';
import { bulkEligible, summariseBulk, type BulkResult } from '@/features/material/utils/list-view';
import { trpc } from '@/trpc/client';
import { cn } from '@/utils/tailwindcss-override';
import { Check, PackageOpen, X } from 'lucide-react';
import type React from 'react';
import { useState } from 'react';
import { toast } from 'sonner';

const onDark = 'border-0 bg-white text-gray-900 hover:bg-gray-100 disabled:opacity-40';
const onDarkQuiet = 'border-0 bg-white/10 text-white hover:bg-white/20';

const fail = (error: { message: string }): void => {
  toast.error(error.message);
};

/**
 * What the material team can do with the selected loans at once. It floats above the app's
 * bottom bar while the list scrolls, names how many rows are selected, and says ahead of time
 * how many of them each action applies to, instead of letting the rest fail quietly.
 */
export const LoanBulkBar: React.FC<{
  loans: MaterialLoan[];
  /** rows the filters match; offered as "select all" when the selection is smaller */
  matchingCount: number;
  onSelectAllMatching: () => void;
  /** selected rows that are on another page than the one shown */
  offPageCount: number;
  onClear: () => void;
  /** the rows that went through, to take them out of the selection */
  onFinished: (results: BulkResult[]) => void;
}> = ({ loans, matchingCount, onSelectAllMatching, offPageCount, onClear, onFinished }) => {
  const locale = useMaterialLocale();
  const invalidate = useInvalidateMaterial();
  const confirmList = trpc.material.confirmLoanList.useMutation();
  const issueList = trpc.material.issueLoanList.useMutation();
  const [askingIssue, setAskingIssue] = useState(false);

  const confirmable = bulkEligible('confirm', loans);
  const issuable = bulkEligible('issue', loans);
  const busy = confirmList.isPending || issueList.isPending;

  const report = (results: BulkResult[]): void => {
    const summary = summariseBulk(results);
    if (summary.failed === 0) {
      toast.success(format(labels.bulkDone, locale, { n: summary.done }));
    } else {
      toast.warning(
        format(labels.bulkPartly, locale, { n: summary.done, failed: summary.failed }),
        {
          description: summary.errors.join(' '),
        },
      );
    }
    setAskingIssue(false);
    onFinished(results);
    void invalidate();
  };

  const notes = [
    confirmable.skipped > 0 &&
      format(labels.bulkCanConfirm, locale, { n: confirmable.ids.length, total: loans.length }),
    issuable.skipped > 0 &&
      format(labels.bulkCanIssue, locale, { n: issuable.ids.length, total: loans.length }),
    offPageCount > 0 && labels.selectionKeptHint[locale],
  ].filter((note): note is string => typeof note === 'string');

  return (
    <div
      data-material-thumb-action
      role="region"
      aria-label={labels.bulkActions[locale]}
      className="sticky bottom-[calc(5.75rem+env(safe-area-inset-bottom))] z-20 mx-2 mb-2 rounded-2xl bg-gray-900 p-2 text-white shadow-xl"
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="pl-2 font-semibold tabular-nums" aria-live="polite">
          {format(labels.selectedCount, locale, { n: loans.length })}
        </span>
        {loans.length < matchingCount && (
          <button
            type="button"
            className={cn(
              'min-h-11 cursor-pointer rounded-lg px-2 text-sm font-semibold underline underline-offset-2',
              focusRing,
            )}
            onClick={onSelectAllMatching}
          >
            {format(labels.selectAllMatching, locale, { n: matchingCount })}
          </button>
        )}
        <MaterialButton
          variant="ghost"
          className={cn('ml-auto px-3', onDarkQuiet)}
          aria-label={labels.clearSelection[locale]}
          title={labels.clearSelection[locale]}
          onClick={() => {
            setAskingIssue(false);
            onClear();
          }}
        >
          <X aria-hidden />
          <span className="hidden @[36rem]:inline">{labels.clearSelection[locale]}</span>
        </MaterialButton>
      </div>

      {askingIssue ? (
        <div className="mt-2 flex flex-wrap items-center gap-2 rounded-xl bg-white/10 p-2">
          <p className="min-w-0 flex-1 basis-full px-1 text-sm font-semibold @xl:basis-auto">
            {format(labels.bulkIssueAsk, locale, { n: issuable.ids.length })}
          </p>
          <MaterialButton
            className={cn('flex-1 @xl:flex-none', onDark)}
            loading={issueList.isPending}
            onClick={() =>
              issueList.mutate({ ids: issuable.ids }, { onSuccess: report, onError: fail })
            }
          >
            <PackageOpen aria-hidden />
            {labels.bulkIssueYes[locale]}
          </MaterialButton>
          <MaterialButton
            className={cn('flex-1 @xl:flex-none', onDarkQuiet)}
            disabled={issueList.isPending}
            onClick={() => setAskingIssue(false)}
          >
            {labels.back[locale]}
          </MaterialButton>
        </div>
      ) : (
        <div className="mt-2 grid grid-cols-2 gap-2 @xl:flex">
          <MaterialButton
            className={onDark}
            disabled={confirmable.ids.length === 0 || busy}
            loading={confirmList.isPending}
            onClick={() =>
              confirmList.mutate({ ids: confirmable.ids }, { onSuccess: report, onError: fail })
            }
          >
            <Check aria-hidden />
            {labels.confirm[locale]}
            <span className="tabular-nums">({confirmable.ids.length})</span>
          </MaterialButton>
          <MaterialButton
            className={onDark}
            disabled={issuable.ids.length === 0 || busy}
            onClick={() => setAskingIssue(true)}
          >
            <PackageOpen aria-hidden />
            {labels.handOut[locale]}
            <span className="tabular-nums">({issuable.ids.length})</span>
          </MaterialButton>
        </div>
      )}
      {notes.length > 0 && (
        <ul className="mt-1.5 space-y-0.5 px-2 text-xs text-gray-300">
          {notes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      )}
    </div>
  );
};
