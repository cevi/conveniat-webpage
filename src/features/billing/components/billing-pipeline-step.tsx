'use client';

import { BillingErrorsDialog } from '@/features/billing/components/billing-errors-dialog';
import type { BillingJobView } from '@/features/billing/hooks/use-billing-jobs';
import { useElapsedSeconds } from '@/features/billing/hooks/use-elapsed-seconds';
import { documentControlButtonClasses } from '@/features/payload-cms/payload-cms/components/shared/document-control-button-styles';
import type { Locale, StaticTranslationString } from '@/types/types';
import { Button, Pill } from '@payloadcms/ui';
import { AlertTriangle, Check, Lock, RefreshCw, X } from 'lucide-react';
import type React from 'react';
import { useState } from 'react';

const neverRunLabel: StaticTranslationString = {
  de: 'Ausstehend',
  en: 'Pending',
  fr: 'En attente',
};

const runningLabel: StaticTranslationString = {
  de: 'Läuft',
  en: 'Running',
  fr: 'En cours',
};

const failedLabel: StaticTranslationString = {
  de: 'Fehler',
  en: 'Failed',
  fr: 'Échec',
};

const doneLabel: StaticTranslationString = {
  de: 'Erledigt',
  en: 'Done',
  fr: 'Terminé',
};

const doneWithErrorsLabel: StaticTranslationString = {
  de: 'Mit Fehlern',
  en: 'With errors',
  fr: 'Avec erreurs',
};

const cancelledLabel: StaticTranslationString = {
  de: 'Abgebrochen',
  en: 'Cancelled',
  fr: 'Annulé',
};

const cancelActionLabel: StaticTranslationString = {
  de: 'Abbrechen',
  en: 'Cancel',
  fr: 'Annuler',
};

const cancellingLabel: StaticTranslationString = {
  de: 'Wird abgebrochen...',
  en: 'Cancelling...',
  fr: 'Annulation...',
};

const startingLabel: StaticTranslationString = {
  de: 'Wird gestartet...',
  en: 'Starting...',
  fr: 'Démarrage...',
};

const showErrorsLabel: StaticTranslationString = {
  de: 'Fehler ansehen',
  en: 'View errors',
  fr: 'Voir les erreurs',
};

/** `mm:ss`, which is the resolution that matters for a job measured in minutes. */
const formatElapsed = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${String(minutes)}:${String(remainder).padStart(2, '0')}`;
};

/**
 * "vor 3 Minuten" rather than a timestamp: what an operator asks of a finished run is how
 * fresh it is, not exactly when it happened. The exact time stays available on hover.
 */
const formatRelativeTime = (isoDate: string, locale: Locale): string => {
  const deltaSeconds = Math.round((new Date(isoDate).getTime() - Date.now()) / 1000);
  const formatter = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });

  const thresholds: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ['second', 60],
    ['minute', 60],
    ['hour', 24],
    ['day', 7],
  ];

  let value = deltaSeconds;
  for (const [unit, step] of thresholds) {
    if (Math.abs(value) < step) return formatter.format(value, unit);
    value = Math.round(value / step);
  }
  return formatter.format(value, 'week');
};

const readErrors = (summary: Record<string, unknown> | undefined): string[] => {
  const errors = summary?.['errors'];
  if (!Array.isArray(errors)) return [];
  return errors.map(String);
};

const readCounters = (
  source: Record<string, unknown> | undefined,
  counterLabels: Array<{ key: string; label: string }>,
): Array<{ key: string; label: string; value: number }> => {
  if (source === undefined) return [];
  return counterLabels.map(({ key, label }) => ({
    key,
    label,
    value: typeof source[key] === 'number' ? source[key] : 0,
  }));
};

export interface BillingPipelineStepProperties {
  stepNumber: number;
  title: string;
  /** Passed as a component, not an element, so each site can size it itself. */
  Icon: React.ComponentType<{ className?: string }>;
  actionLabel: string;
  /** Shown instead of `actionLabel` once a run has failed or finished with errors. */
  retryLabel: string;
  /** Rendered when the step has never run — says what it will do. */
  hint: string;
  counterLabels: Array<{ key: string; label: string }>;
  job: BillingJobView | undefined;
  isPending: boolean;
  isStarting: boolean;
  isCancelling: boolean;
  /** True while any job runs — the pipeline steps are not meant to overlap. */
  isBusy: boolean;
  /** Set when an earlier step has not succeeded yet; explains why this one is locked. */
  blockedReason: string | undefined;
  locale: Locale;
  onStart: () => void;
  onCancel: () => void;
}

/**
 * One column of the billing pipeline: its state, its live progress while it runs, the
 * counters its last run produced, and the button that starts or stops it.
 */
export const BillingPipelineStep: React.FC<BillingPipelineStepProperties> = ({
  stepNumber,
  title,
  Icon,
  actionLabel,
  retryLabel,
  hint,
  counterLabels,
  job,
  isPending,
  isStarting,
  isCancelling,
  isBusy,
  blockedReason,
  locale,
  onStart,
  onCancel,
}) => {
  const [isErrorsDialogOpen, setIsErrorsDialogOpen] = useState(false);

  const progress = job?.progress;
  const elapsedSeconds = useElapsedSeconds(isPending ? progress?.startedAt : undefined);

  const wasCancelled = job?.summary?.['cancelled'] === true;
  const hasFailed = job?.status === 'failed';
  const hasRun = job !== undefined;
  const errors = readErrors(job?.summary);

  // A job that returns a summary full of errors still counts as completed to the job
  // queue — the handler did not throw. Reporting that as a green tick is how an aborted
  // sync came to look like a successful one, so errors in the summary downgrade the step.
  const finishedWithErrors = !isPending && hasRun && errors.length > 0;
  const succeeded = hasRun && !isPending && !hasFailed && !wasCancelled && !finishedWithErrors;
  const needsRetry = !isPending && (hasFailed || finishedWithErrors);

  const percentage =
    progress !== undefined && progress.totalItems > 0
      ? Math.round((progress.processedItems / progress.totalItems) * 100)
      : 0;

  const rawCounters = isPending
    ? readCounters(progress?.runningSummary, counterLabels)
    : readCounters(job?.summary, counterLabels);

  // A run that aborted before touching anything reports every counter as zero; next to
  // the reason it failed, that row is noise rather than information.
  const counters =
    finishedWithErrors && rawCounters.every((counter) => counter.value === 0) ? [] : rawCounters;

  // One badge scale across the three steps: neutral while nothing has happened, red for a
  // hard failure, orange when a run got through with errors, green only for a clean run.
  let statusLabel = neverRunLabel[locale];
  let statusPillStyle: React.ComponentProps<typeof Pill>['pillStyle'] = 'light-gray';
  if (isPending) {
    statusLabel = runningLabel[locale];
    statusPillStyle = 'light';
  } else if (hasFailed) {
    statusLabel = failedLabel[locale];
    statusPillStyle = 'error';
  } else if (finishedWithErrors) {
    statusLabel = doneWithErrorsLabel[locale];
    statusPillStyle = 'warning';
  } else if (wasCancelled) {
    statusLabel = cancelledLabel[locale];
    statusPillStyle = 'light-gray';
  } else if (hasRun) {
    statusLabel = doneLabel[locale];
    statusPillStyle = 'success';
  }

  let markerClasses = 'border-(--theme-elevation-150) text-(--theme-elevation-500)';
  if (hasFailed) {
    markerClasses = 'border-(--theme-error-500) text-(--theme-error-500)';
  } else if (finishedWithErrors) {
    markerClasses = 'border-(--theme-warning-500) text-(--theme-warning-500)';
  } else if (succeeded) {
    markerClasses = 'border-(--theme-success-500) text-(--theme-success-500)';
  } else if (isPending) {
    markerClasses = 'border-(--theme-elevation-400) text-(--theme-elevation-800)';
  }

  const isLocked = blockedReason !== undefined && !isPending;

  return (
    <li className="flex min-w-0 flex-col rounded-md border border-(--theme-elevation-150) bg-(--theme-elevation-0) p-4">
      <div className="flex items-center gap-2">
        <span
          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[11px] font-medium ${markerClasses}`}
        >
          {succeeded && <Check className="h-3 w-3" />}
          {(hasFailed || finishedWithErrors) && <AlertTriangle className="h-3 w-3" />}
          {!succeeded && !hasFailed && !finishedWithErrors && stepNumber}
        </span>
        <Icon className="h-3.5 w-3.5 shrink-0 text-(--theme-elevation-450)" />
        <span className="min-w-0 truncate text-sm font-medium text-(--theme-elevation-800)">
          {title}
        </span>
        <Pill className="ml-auto shrink-0" pillStyle={statusPillStyle} size="small">
          {statusLabel}
        </Pill>
      </div>

      {/* The body grows so the three action buttons stay on one line across the row. */}
      <div className="mt-3 min-h-14 grow">
        {isPending && (
          <>
            <div
              aria-label={title}
              aria-valuemax={100}
              aria-valuemin={0}
              aria-valuenow={percentage}
              className="h-1 w-full overflow-hidden rounded-full bg-(--theme-elevation-150)"
              role="progressbar"
            >
              <div
                className="h-full bg-(--theme-elevation-800) transition-[width] duration-500 ease-out"
                style={{ width: `${String(percentage)}%` }}
              />
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-2 text-xs text-(--theme-elevation-500)">
              {progress !== undefined && progress.totalItems > 0 && (
                <span className="font-mono">
                  {progress.processedItems}/{progress.totalItems}
                </span>
              )}
              {elapsedSeconds !== undefined && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono">{formatElapsed(elapsedSeconds)}</span>
                </>
              )}
            </div>
            {progress !== undefined && progress.currentItemName !== '' && (
              <p className="m-0 mt-1 truncate text-xs text-(--theme-elevation-600)">
                {progress.currentItemName}
              </p>
            )}
          </>
        )}

        {!isPending && !hasRun && (
          <p className="m-0 text-xs text-(--theme-elevation-500)">{hint}</p>
        )}

        {!isPending && counters.length > 0 && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-(--theme-elevation-500)">
            {counters.map((counter) => (
              <span key={counter.key}>
                {counter.label}{' '}
                <span className="font-semibold text-(--theme-elevation-800)">{counter.value}</span>
              </span>
            ))}
          </div>
        )}

        {!isPending && hasRun && (
          <p
            className="m-0 mt-1 text-xs text-(--theme-elevation-450)"
            title={new Date(job.updatedAt).toLocaleString(locale)}
          >
            {formatRelativeTime(job.updatedAt, locale)}
          </p>
        )}

        {!isPending && hasRun && (hasFailed || errors.length > 0) && (
          <button
            className="mt-2 flex w-full cursor-pointer items-start gap-2 rounded border border-(--theme-error-250) bg-(--theme-error-50) p-2 text-left text-xs text-(--theme-error-600) hover:bg-(--theme-error-100)"
            onClick={() => setIsErrorsDialogOpen(true)}
            type="button"
          >
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span className="min-w-0">
              <span className="block truncate font-medium">
                {job.error ?? errors[0] ?? failedLabel[locale]}
              </span>
              <span className="underline">
                {showErrorsLabel[locale]}
                {errors.length > 0 && ` (${String(errors.length)})`}
              </span>
            </span>
          </button>
        )}
      </div>

      {/* `title` sits on the wrapper, not the button: a disabled button fires no pointer
          events, so a tooltip on it would never appear. */}
      <span className="mt-3 block" title={blockedReason}>
        {isPending ? (
          <Button
            buttonStyle="transparent"
            className={documentControlButtonClasses.neutral('w-full justify-center')}
            disabled={isCancelling}
            // Payload's `.btn` ships ~24px of block margin, which a compact card
            // cannot absorb.
            margin={false}
            onClick={(event): void => {
              event.preventDefault();
              onCancel();
            }}
            size="medium"
          >
            <X className="mr-2 h-4 w-4" />
            <span className="truncate">
              {isCancelling ? cancellingLabel[locale] : cancelActionLabel[locale]}
            </span>
          </Button>
        ) : (
          <Button
            buttonStyle="transparent"
            className={documentControlButtonClasses.neutral('w-full justify-center')}
            disabled={isBusy || isLocked}
            margin={false}
            onClick={(event): void => {
              event.preventDefault();
              onStart();
            }}
            size="medium"
          >
            {isStarting && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
            {!isStarting && isLocked && <Lock className="mr-2 h-4 w-4" />}
            {!isStarting && !isLocked && <Icon className="mr-2 h-4 w-4" />}
            <span className="truncate">
              {isStarting && startingLabel[locale]}
              {!isStarting && (needsRetry ? retryLabel : actionLabel)}
            </span>
          </Button>
        )}
      </span>

      <BillingErrorsDialog
        errors={errors.length > 0 ? errors : [job?.error ?? '']}
        isOpen={isErrorsDialogOpen}
        locale={locale}
        onClose={() => setIsErrorsDialogOpen(false)}
        title={title}
      />
    </li>
  );
};
