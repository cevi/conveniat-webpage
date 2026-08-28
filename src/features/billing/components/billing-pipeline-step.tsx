'use client';

import type { BillingJobView } from '@/features/billing/hooks/use-billing-jobs';
import { useElapsedSeconds } from '@/features/billing/hooks/use-elapsed-seconds';
import type { Locale, StaticTranslationString } from '@/types/types';
import { Banner, Button, Pill } from '@payloadcms/ui';
import { AlertTriangle, Check, RefreshCw, X } from 'lucide-react';
import type React from 'react';

const neverRunLabel: StaticTranslationString = {
  de: 'Noch nie ausgeführt',
  en: 'Never run',
  fr: 'Jamais exécuté',
};

const runningLabel: StaticTranslationString = {
  de: 'Läuft',
  en: 'Running',
  fr: 'En cours',
};

const failedLabel: StaticTranslationString = {
  de: 'Fehlgeschlagen',
  en: 'Failed',
  fr: 'Échoué',
};

const doneLabel: StaticTranslationString = {
  de: 'Abgeschlossen',
  en: 'Done',
  fr: 'Terminé',
};

const doneWithErrorsLabel: StaticTranslationString = {
  de: 'Mit Fehlern beendet',
  en: 'Finished with errors',
  fr: 'Terminé avec des erreurs',
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

const errorDetailsLabel: StaticTranslationString = {
  de: 'Fehler anzeigen',
  en: 'Show errors',
  fr: 'Afficher les erreurs',
};

/** `mm:ss`, which is the resolution that matters for a job measured in minutes. */
const formatElapsed = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${String(minutes)}:${String(remainder).padStart(2, '0')}`;
};

/**
 * "vor 3 Minuten" rather than a timestamp: the question an operator is asking of a
 * finished run is how fresh it is, not when exactly it happened. The exact time stays
 * available on hover.
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
  icon: React.ReactNode;
  actionLabel: string;
  /** Rendered under the title when the step has never run — says what it will do. */
  hint: string;
  counterLabels: Array<{ key: string; label: string }>;
  job: BillingJobView | undefined;
  isPending: boolean;
  isStarting: boolean;
  isCancelling: boolean;
  /** True while any other job runs — the pipeline steps are not meant to overlap. */
  isBlocked: boolean;
  isLast: boolean;
  locale: Locale;
  onStart: () => void;
  onCancel: () => void;
}

/**
 * One step of the billing pipeline: its state, its live progress while it runs, the
 * counters its last run produced, and the button that starts or stops it.
 */
export const BillingPipelineStep: React.FC<BillingPipelineStepProperties> = ({
  stepNumber,
  title,
  icon,
  actionLabel,
  hint,
  counterLabels,
  job,
  isPending,
  isStarting,
  isCancelling,
  isBlocked,
  isLast,
  locale,
  onStart,
  onCancel,
}) => {
  const progress = job?.progress;
  const elapsedSeconds = useElapsedSeconds(isPending ? progress?.startedAt : undefined);

  const wasCancelled = job?.summary?.['cancelled'] === true;
  const hasFailed = job?.status === 'failed';
  const hasRun = job !== undefined;

  const percentage =
    progress !== undefined && progress.totalItems > 0
      ? Math.round((progress.processedItems / progress.totalItems) * 100)
      : 0;

  const errors = readErrors(job?.summary);

  // A job that returns a summary full of errors still counts as completed to the job
  // queue — the handler did not throw. Reporting that as a green tick is how an aborted
  // sync came to look like a successful one, so errors in the summary downgrade the step.
  const finishedWithErrors = !isPending && hasRun && errors.length > 0;
  const succeeded = hasRun && !isPending && !hasFailed && !wasCancelled && !finishedWithErrors;

  const rawCounters = isPending
    ? readCounters(progress?.runningSummary, counterLabels)
    : readCounters(job?.summary, counterLabels);

  // A run that aborted before touching anything reports every counter as zero; next to
  // the reason it failed, that row is noise rather than information.
  const counters =
    finishedWithErrors && rawCounters.every((counter) => counter.value === 0) ? [] : rawCounters;

  // Payload's own pill palette, so the step states read like every other status in the
  // admin panel rather than like a second design system bolted on top.
  let statusLabel = neverRunLabel[locale];
  let statusPillStyle: React.ComponentProps<typeof Pill>['pillStyle'] = 'light-gray';
  if (isPending) {
    statusLabel = runningLabel[locale];
    statusPillStyle = 'warning';
  } else if (hasFailed) {
    statusLabel = failedLabel[locale];
    statusPillStyle = 'error';
  } else if (wasCancelled) {
    statusLabel = cancelledLabel[locale];
    statusPillStyle = 'light-gray';
  } else if (finishedWithErrors) {
    statusLabel = doneWithErrorsLabel[locale];
    statusPillStyle = 'warning';
  } else if (hasRun) {
    statusLabel = doneLabel[locale];
    statusPillStyle = 'success';
  }

  let markerClasses = 'border-(--theme-elevation-150) text-(--theme-elevation-500)';
  if (isPending || finishedWithErrors) {
    markerClasses = 'border-(--theme-elevation-250) text-(--theme-elevation-800)';
  } else if (hasFailed) {
    markerClasses = 'border-(--theme-error-500) text-(--theme-error-500)';
  } else if (succeeded) {
    markerClasses = 'border-(--theme-success-500) text-(--theme-success-500)';
  }

  return (
    <li className="relative grid grid-cols-[1.75rem_1fr] gap-x-3 pb-5 last:pb-0">
      {/* Step marker and the connector that makes the three steps read as a sequence. */}
      <div className="flex flex-col items-center">
        <span
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-medium ${markerClasses}`}
        >
          {succeeded && <Check className="h-3.5 w-3.5" />}
          {finishedWithErrors && <AlertTriangle className="h-3.5 w-3.5" />}
          {!succeeded && !finishedWithErrors && stepNumber}
        </span>
        {!isLast && <span className="mt-1 w-px flex-1 bg-(--theme-elevation-150)" />}
      </div>

      <div className="min-w-0">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <span className="text-(--theme-elevation-450)">{icon}</span>
            <span className="field-label mb-0 truncate">{title}</span>
            <Pill pillStyle={statusPillStyle} size="small">
              {statusLabel}
            </Pill>
          </div>

          {isPending ? (
            <Button
              buttonStyle="secondary"
              size="small"
              disabled={isCancelling}
              icon={<X className="h-3.5 w-3.5" />}
              iconPosition="left"
              onClick={onCancel}
            >
              {isCancelling ? cancellingLabel[locale] : cancelActionLabel[locale]}
            </Button>
          ) : (
            <Button
              buttonStyle="secondary"
              size="small"
              disabled={isBlocked}
              icon={
                isStarting ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <span>{icon}</span>
                )
              }
              iconPosition="left"
              onClick={onStart}
            >
              {isStarting ? startingLabel[locale] : actionLabel}
            </Button>
          )}
        </div>

        {isPending && (
          <div className="mt-2">
            <div
              className="h-1 w-full overflow-hidden rounded-full bg-(--theme-elevation-150)"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={percentage}
              aria-label={title}
            >
              <div
                className="h-full bg-(--theme-elevation-800) transition-[width] duration-500 ease-out"
                style={{ width: `${String(percentage)}%` }}
              />
            </div>
            <div className="field-description mt-1.5 flex flex-wrap items-center gap-x-2">
              {progress !== undefined && progress.totalItems > 0 && (
                <span>
                  {progress.processedItems}/{progress.totalItems}
                </span>
              )}
              {progress !== undefined && progress.currentItemName !== '' && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="min-w-0 truncate">{progress.currentItemName}</span>
                </>
              )}
              {elapsedSeconds !== undefined && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>{formatElapsed(elapsedSeconds)}</span>
                </>
              )}
            </div>
          </div>
        )}

        {!hasRun && !isPending && <div className="field-description mt-1">{hint}</div>}

        {counters.length > 0 && (
          <div className="field-description mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5">
            {counters.map((counter) => (
              <span key={counter.key}>
                {counter.label}{' '}
                <span className="font-semibold text-(--theme-elevation-800)">{counter.value}</span>
              </span>
            ))}
          </div>
        )}

        {!isPending && job !== undefined && (
          <div
            className="field-description mt-1"
            title={new Date(job.updatedAt).toLocaleString(locale)}
          >
            {formatRelativeTime(job.updatedAt, locale)}
          </div>
        )}

        {hasFailed && (
          <Banner className="mt-2" type="error">
            {job.error ?? failedLabel[locale]}
          </Banner>
        )}

        {errors.length > 0 && (
          <details className="mt-2">
            <summary className="field-description cursor-pointer text-(--theme-error-500)">
              {errorDetailsLabel[locale]} ({errors.length})
            </summary>
            <ul className="field-description mt-1 max-h-28 list-inside list-disc overflow-y-auto rounded border border-(--theme-elevation-100) p-2">
              {errors.map((message, index) => (
                <li key={index}>{message}</li>
              ))}
            </ul>
          </details>
        )}
      </div>
    </li>
  );
};
