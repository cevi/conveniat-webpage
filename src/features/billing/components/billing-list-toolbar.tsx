'use client';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { documentControlButtonClasses } from '@/features/payload-cms/payload-cms/components/shared/document-control-button-styles';
import { Button } from '@payloadcms/ui';
import { Download, FilePlus, MoreHorizontal, RefreshCcw, RefreshCw, Send } from 'lucide-react';
import { useRouter } from 'next/navigation';
import React from 'react';

interface ActionResult {
  success: boolean;
  error?: string;
  newCount?: number;
  removedCount?: number;
  reAddedCount?: number;
  changedCount?: number;
  unchangedCount?: number;
  generatedCount?: number;
  skippedCount?: number;
  skippedAlreadyExistingCount?: number;
  sentCount?: number;
  failedCount?: number;
  errors?: string[];
}

interface SyncJobStatus {
  id: string;
  taskSlug: 'syncParticipants' | 'generateBills' | 'sendBills';
  status: 'pending' | 'failed' | 'success';
  summary?: {
    newCount?: number;
    removedCount?: number;
    reAddedCount?: number;
    changedCount?: number;
    unchangedCount?: number;
    generatedCount?: number;
    skippedCount?: number;
    skippedAlreadyExistingCount?: number;
    sentCount?: number;
    failedCount?: number;
    errors?: string[];
  };
  error?: string;
  updatedAt: string;
}

const handleCsvExport = (): void => {
  window.open('/api/confidential/billing/export-csv', '_blank');
};

/**
 * Toolbar component rendered above the bill-participants list table.
 * Provides bulk actions: Sync, Generate, Send, CSV export, and Regenerate all.
 */
export const BillingListToolbar: React.FC = () => {
  const router = useRouter();

  const [loading, setLoading] = React.useState(false);
  const [actionType, setActionType] = React.useState('');
  const [actionResult, setActionResult] = React.useState<ActionResult | undefined>();
  const [confirmOpen, setConfirmOpen] = React.useState(false);

  const [activeJobs, setActiveJobs] = React.useState<{
    sync?: string;
    generate?: string;
    send?: string;
  }>((): { sync?: string; generate?: string; send?: string } => {
    // eslint-disable-next-line unicorn/prefer-global-this
    if (typeof window !== 'undefined') {
      try {
        const stored = globalThis.localStorage.getItem('billing_active_jobs');
        if (stored !== null && stored !== '') {
          const parsed = JSON.parse(stored) as { sync?: string; generate?: string; send?: string };
          if (
            parsed.sync !== undefined ||
            parsed.generate !== undefined ||
            parsed.send !== undefined
          ) {
            return parsed;
          }
        }
      } catch (error) {
        console.error('Failed to parse active jobs from localStorage', error);
      }
    }
    return {};
  });

  // Sync activeJobs to localStorage whenever it changes
  React.useEffect((): void => {
    // eslint-disable-next-line unicorn/prefer-global-this
    if (typeof window !== 'undefined') {
      globalThis.localStorage.setItem('billing_active_jobs', JSON.stringify(activeJobs));
    }
  }, [activeJobs]);

  const [syncStatus, setSyncStatus] = React.useState<SyncJobStatus | undefined>();
  const [generateStatus, setGenerateStatus] = React.useState<SyncJobStatus | undefined>();
  const [sendStatus, setSendStatus] = React.useState<SyncJobStatus | undefined>();

  const fetchStatuses = React.useCallback(async (): Promise<
    | {
        success: boolean;
        sync?: SyncJobStatus;
        generate?: SyncJobStatus;
        send?: SyncJobStatus;
      }
    | undefined
  > => {
    try {
      const response = await fetch('/api/confidential/billing/sync-status');
      const data = (await response.json()) as {
        success: boolean;
        sync?: SyncJobStatus;
        generate?: SyncJobStatus;
        send?: SyncJobStatus;
      };

      if (data.success === true) {
        if (data.sync !== undefined) setSyncStatus(data.sync);
        if (data.generate !== undefined) setGenerateStatus(data.generate);
        if (data.send !== undefined) setSendStatus(data.send);

        // If any of the fetched statuses is pending, make sure they are tracked as active jobs
        const newActiveJobs: { sync?: string; generate?: string; send?: string } = {};
        let hasPending = false;

        if (data.sync?.status === 'pending') {
          newActiveJobs.sync = data.sync.id;
          hasPending = true;
        }
        if (data.generate?.status === 'pending') {
          newActiveJobs.generate = data.generate.id;
          hasPending = true;
        }
        if (data.send?.status === 'pending') {
          newActiveJobs.send = data.send.id;
          hasPending = true;
        }

        if (hasPending === true) {
          setActiveJobs((previous): { sync?: string; generate?: string; send?: string } => {
            return { ...previous, ...newActiveJobs };
          });
        }

        return data;
      }
    } catch (error) {
      console.error('Failed to fetch billing sync statuses:', error);
    }
    return undefined;
  }, []);

  // Poll effect: initial check
  React.useEffect((): (() => void) => {
    let active = true;
    const timer = setTimeout(() => {
      if (active === true) {
        void fetchStatuses();
      }
    }, 0);

    return (): void => {
      active = false;
      clearTimeout(timer);
    };
  }, [fetchStatuses]);

  const pollActiveJobs = React.useCallback(
    async (currentActiveJobs: typeof activeJobs): Promise<void> => {
      const data = await fetchStatuses();
      if (data === undefined) return;

      const updatedActiveJobs = { ...currentActiveJobs };
      let changed = false;

      if (
        currentActiveJobs.sync !== undefined &&
        data.sync !== undefined &&
        data.sync.status !== 'pending'
      ) {
        delete updatedActiveJobs.sync;
        changed = true;
        router.refresh();
      }
      if (
        currentActiveJobs.generate !== undefined &&
        data.generate !== undefined &&
        data.generate.status !== 'pending'
      ) {
        delete updatedActiveJobs.generate;
        changed = true;
        router.refresh();
      }
      if (
        currentActiveJobs.send !== undefined &&
        data.send !== undefined &&
        data.send.status !== 'pending'
      ) {
        delete updatedActiveJobs.send;
        changed = true;
        router.refresh();
      }

      if (changed === true) {
        setActiveJobs(updatedActiveJobs);
      }
    },
    [fetchStatuses, router],
  );

  // Polling interval when jobs are active
  React.useEffect((): (() => void) => {
    const hasActiveJob =
      activeJobs.sync !== undefined ||
      activeJobs.generate !== undefined ||
      activeJobs.send !== undefined;

    if (hasActiveJob === false) return (): void => {};

    const interval = setInterval(() => {
      void pollActiveJobs(activeJobs);
    }, 2000);

    return (): void => {
      clearInterval(interval);
    };
  }, [activeJobs, pollActiveJobs]);

  const executeAction = React.useCallback(async (action: string): Promise<void> => {
    setLoading(true);
    setActionType(action);
    setActionResult(undefined);

    try {
      const response = await fetch(`/api/confidential/billing/${action}`, { method: 'POST' });
      const result = (await response.json()) as ActionResult;
      setActionResult(result);
    } catch (error) {
      setActionResult({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  const startJob = React.useCallback(
    async (action: 'sync' | 'generate' | 'send'): Promise<void> => {
      setLoading(true);
      setActionType(action);
      setActionResult(undefined);

      try {
        const response = await fetch(`/api/confidential/billing/${action}`, { method: 'POST' });
        const result = (await response.json()) as {
          success: boolean;
          jobId?: string;
          error?: string;
        };

        if (result.success === true && result.jobId !== undefined) {
          const jobId = result.jobId;
          setActiveJobs((previous): { sync?: string; generate?: string; send?: string } => {
            return { ...previous, [action]: jobId };
          });

          let taskSlug: 'syncParticipants' | 'generateBills' | 'sendBills' = 'syncParticipants';
          switch (action) {
            case 'sync': {
              taskSlug = 'syncParticipants';
              break;
            }
            case 'generate': {
              taskSlug = 'generateBills';
              break;
            }
            case 'send': {
              taskSlug = 'sendBills';
              break;
            }
          }

          const placeholderStatus: SyncJobStatus = {
            id: jobId,
            taskSlug,
            status: 'pending',
            updatedAt: new Date().toISOString(),
          };

          switch (action) {
            case 'sync': {
              setSyncStatus(placeholderStatus);
              break;
            }
            case 'generate': {
              setGenerateStatus(placeholderStatus);
              break;
            }
            case 'send': {
              setSendStatus(placeholderStatus);
              break;
            }
          }
        } else {
          setActionResult({
            success: false,
            error: result.error ?? 'Trigger failed',
          });
        }
      } catch (error) {
        setActionResult({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const isSyncPending =
    (loading && actionType === 'sync') ||
    activeJobs.sync !== undefined ||
    syncStatus?.status === 'pending';

  const isGeneratePending =
    (loading && actionType === 'generate') ||
    activeJobs.generate !== undefined ||
    generateStatus?.status === 'pending';

  const isSendPending =
    (loading && actionType === 'send') ||
    activeJobs.send !== undefined ||
    sendStatus?.status === 'pending';

  const renderJobCard = (
    title: string,
    icon: React.ReactNode,
    statusObject: SyncJobStatus | undefined,
    pendingMessage: string,
    successRenderer: (summary: NonNullable<SyncJobStatus['summary']>) => React.ReactNode,
  ): React.ReactNode => {
    if (statusObject === undefined) {
      return (
        <div className="rounded-lg border border-dashed border-gray-300 p-4 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
          <div className="mb-2 flex justify-center text-gray-400">{icon}</div>
          <p className="font-semibold">{title}</p>
          <p className="mt-1 text-xs">Keine Aktivität aufgezeichnet</p>
        </div>
      );
    }

    const isPending = statusObject.status === 'pending';
    const isFailed = statusObject.status === 'failed';

    let borderClass = 'border-gray-200 dark:border-gray-800';
    let bgClass = 'bg-white dark:bg-gray-950';

    switch (statusObject.status) {
      case 'pending': {
        borderClass = 'border-amber-300 dark:border-amber-800 animate-pulse';
        bgClass = 'bg-amber-50/50 dark:bg-amber-950/20';
        break;
      }
      case 'failed': {
        borderClass = 'border-red-300 dark:border-red-900';
        bgClass = 'bg-red-50/50 dark:bg-red-950/20';
        break;
      }
      case 'success': {
        borderClass = 'border-green-300 dark:border-green-900';
        bgClass = 'bg-green-50/50 dark:bg-green-950/20';
        break;
      }
    }

    let iconColorClass = 'text-green-600';
    if (isPending === true) {
      iconColorClass = 'text-amber-500';
    } else if (isFailed === true) {
      iconColorClass = 'text-red-500';
    }

    let badgeClass = 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300';
    if (isPending === true) {
      badgeClass = 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300';
    } else if (isFailed === true) {
      badgeClass = 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300';
    }

    let statusText = 'Bereit';
    if (isPending === true) {
      statusText = 'Läuft...';
    } else if (isFailed === true) {
      statusText = 'Fehlgeschlagen';
    }

    const formattedTime = new Date(statusObject.updatedAt).toLocaleString('de-CH', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    return (
      <div
        className={`rounded-lg border p-4 shadow-sm transition-all duration-300 ${borderClass} ${bgClass}`}
      >
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`rounded p-1.5 ${iconColorClass}`}>{icon}</div>
            <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100">{title}</h4>
          </div>
          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${badgeClass}`}>
            {statusText}
          </span>
        </div>

        <div className="space-y-2 text-xs text-gray-600 dark:text-gray-400">
          {isPending === true && (
            <p className="text-amber-700 italic dark:text-amber-400">{pendingMessage}</p>
          )}

          {isFailed === true && (
            <div className="text-red-700 dark:text-red-400">
              <p className="font-semibold">Fehlermeldung:</p>
              <p className="mt-0.5 max-h-24 overflow-y-auto rounded bg-red-100/50 p-2 text-xs break-all dark:bg-red-950/50">
                {statusObject.error ?? 'Unbekannter Fehler'}
              </p>
            </div>
          )}

          {isPending === false && statusObject.summary !== undefined && (
            <div className="text-gray-700 dark:text-gray-300">
              {successRenderer(statusObject.summary)}
            </div>
          )}

          <div className="mt-2 flex items-center justify-between border-t border-gray-100 pt-2 text-[10px] text-gray-400 dark:border-gray-900 dark:text-gray-500">
            <span>ID: {statusObject.id.slice(-8)}</span>
            <span>Stand: {formattedTime}</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="mb-4">
      {/* Action Bar */}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          buttonStyle="transparent"
          className={documentControlButtonClasses.neutral()}
          size="medium"
          disabled={isSyncPending === true || loading === true}
          onClick={(event): void => {
            event.preventDefault();
            void startJob('sync');
          }}
        >
          <RefreshCcw className={`mr-2 h-4 w-4 ${isSyncPending === true ? 'animate-spin' : ''}`} />
          <span className="truncate">Abgleichen mit Cevi.DB</span>
        </Button>
        <Button
          buttonStyle="transparent"
          className={documentControlButtonClasses.neutral()}
          size="medium"
          disabled={isGeneratePending === true || loading === true}
          onClick={(event): void => {
            event.preventDefault();
            void startJob('generate');
          }}
        >
          <FilePlus
            className={`mr-2 h-4 w-4 ${isGeneratePending === true ? 'animate-spin' : ''}`}
          />
          <span className="truncate">Rechnungen Generieren</span>
        </Button>
        <Button
          buttonStyle="transparent"
          className={documentControlButtonClasses.publish()}
          size="medium"
          disabled={isSendPending === true || loading === true}
          onClick={(event): void => {
            event.preventDefault();
            void startJob('send');
          }}
        >
          <Send className={`mr-2 h-4 w-4 ${isSendPending === true ? 'animate-spin' : ''}`} />
          <span className="truncate">Mails versenden</span>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className={`btn btn--size-medium btn--style-transparent btn--color-neutral ${documentControlButtonClasses.neutral()}`}
              style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-48 border-gray-200 bg-white text-gray-900 shadow-lg dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
          >
            <DropdownMenuItem
              onClick={(event): void => {
                event.preventDefault();
                handleCsvExport();
              }}
              className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <Download className="h-4 w-4" />
              <span>Download CSV</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={(event): void => {
                event.preventDefault();
                setConfirmOpen(true);
              }}
              disabled={loading === true && actionType === 'regenerate-all'}
              className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 focus:bg-red-50 focus:text-red-700 dark:text-red-400 dark:hover:bg-red-900/30"
            >
              <RefreshCw
                className={`h-4 w-4 ${
                  loading === true && actionType === 'regenerate-all' ? 'animate-spin' : ''
                }`}
              />
              <span>Alle neu generieren</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Action Result Banner */}
      {actionResult !== undefined && (
        <div
          className={`mt-3 rounded-lg border p-3 text-sm ${
            actionResult.success === true
              ? 'border-green-300 bg-green-50 text-green-900'
              : 'border-red-300 bg-red-50 text-red-900'
          }`}
        >
          {actionResult.success === true ? (
            <div>
              <strong>Erfolgreich!</strong>
              {actionResult.newCount !== undefined && <span> Neu: {actionResult.newCount}</span>}
              {actionResult.removedCount !== undefined && (
                <span> | Entfernt: {actionResult.removedCount}</span>
              )}
              {actionResult.reAddedCount !== undefined && (
                <span> | Erneut: {actionResult.reAddedCount}</span>
              )}
              {actionResult.changedCount !== undefined && (
                <span> | Aktualisiert: {actionResult.changedCount}</span>
              )}
              {actionResult.unchangedCount !== undefined && (
                <span> | Unverändert: {actionResult.unchangedCount}</span>
              )}
              {actionResult.generatedCount !== undefined && (
                <span> Generiert: {actionResult.generatedCount}</span>
              )}
              {actionResult.skippedAlreadyExistingCount !== undefined && (
                <span> | Bereits vorhanden: {actionResult.skippedAlreadyExistingCount}</span>
              )}
              {actionResult.skippedCount !== undefined && (
                <span> | Übersprungen: {actionResult.skippedCount}</span>
              )}
              {actionResult.sentCount !== undefined && (
                <span> Gesendet: {actionResult.sentCount}</span>
              )}
              {actionResult.failedCount !== undefined && (
                <span> | Fehlgeschlagen: {actionResult.failedCount}</span>
              )}
            </div>
          ) : (
            <div>
              <strong>Fehler:</strong> {actionResult.error}
            </div>
          )}
          {(actionResult.errors?.length ?? 0) > 0 && (
            <details className="mt-2">
              <summary className="font-medium">
                Details ({actionResult.errors?.length} Fehler)
              </summary>
              <ul className="mt-1 list-inside list-disc">
                {actionResult.errors?.map((errorMessage, index) => (
                  <li key={index}>{errorMessage}</li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}

      {/* Background Jobs Status Board */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {renderJobCard(
          'Teilnehmer-Abgleich',
          <RefreshCcw className="h-4 w-4" />,
          syncStatus,
          'Synchronisierung läuft im Hintergrund...',
          (summary) => (
            <div className="grid grid-cols-2 gap-x-2 gap-y-1">
              <div>
                Neu:{' '}
                <span className="font-semibold text-gray-900 dark:text-gray-100">
                  {summary.newCount ?? 0}
                </span>
              </div>
              <div>
                Aktualisiert:{' '}
                <span className="font-semibold text-gray-900 dark:text-gray-100">
                  {summary.changedCount ?? 0}
                </span>
              </div>
              <div>
                Entfernt:{' '}
                <span className="font-semibold text-gray-900 dark:text-gray-100">
                  {summary.removedCount ?? 0}
                </span>
              </div>
              <div>
                Erneut:{' '}
                <span className="font-semibold text-gray-900 dark:text-gray-100">
                  {summary.reAddedCount ?? 0}
                </span>
              </div>
              <div className="col-span-2 mt-1 border-t border-gray-100 pt-1 dark:border-gray-900/50">
                Unverändert:{' '}
                <span className="font-semibold text-gray-900 dark:text-gray-100">
                  {summary.unchangedCount ?? 0}
                </span>
              </div>
            </div>
          ),
        )}

        {renderJobCard(
          'Rechnungen Generierung',
          <FilePlus className="h-4 w-4" />,
          generateStatus,
          'QR-Rechnungen werden generiert...',
          (summary) => (
            <div className="space-y-1">
              <div>
                Generiert:{' '}
                <span className="font-semibold text-gray-900 dark:text-gray-100">
                  {summary.generatedCount ?? 0}
                </span>
              </div>
              <div>
                Bereits vorhanden:{' '}
                <span className="font-semibold text-gray-900 dark:text-gray-100">
                  {summary.skippedAlreadyExistingCount ?? 0}
                </span>
              </div>
              <div>
                Übersprungen:{' '}
                <span className="font-semibold text-gray-900 dark:text-gray-100">
                  {summary.skippedCount ?? 0}
                </span>
              </div>
              {summary.errors !== undefined &&
                Array.isArray(summary.errors) &&
                summary.errors.length > 0 && (
                  <details className="mt-2 text-[11px]">
                    <summary className="cursor-pointer font-medium text-red-600 dark:text-red-400">
                      Details ({summary.errors.length} Fehler)
                    </summary>
                    <ul className="mt-1 max-h-24 list-inside list-disc overflow-y-auto rounded bg-red-50/50 p-1.5 dark:bg-red-950/20">
                      {summary.errors.map((jobError, index) => (
                        <li key={index}>{jobError}</li>
                      ))}
                    </ul>
                  </details>
                )}
            </div>
          ),
        )}

        {renderJobCard(
          'Rechnungen Versand',
          <Send className="h-4 w-4" />,
          sendStatus,
          'Rechnungen werden versendet...',
          (summary) => (
            <div className="space-y-1">
              <div>
                Gesendet:{' '}
                <span className="font-semibold text-gray-900 dark:text-gray-100">
                  {summary.sentCount ?? 0}
                </span>
              </div>
              <div>
                Fehlgeschlagen:{' '}
                <span className="font-semibold text-gray-900 dark:text-gray-100">
                  {summary.failedCount ?? 0}
                </span>
              </div>
              {summary.errors !== undefined &&
                Array.isArray(summary.errors) &&
                summary.errors.length > 0 && (
                  <details className="mt-2 text-[11px]">
                    <summary className="cursor-pointer font-medium text-red-600 dark:text-red-400">
                      Details ({summary.errors.length} Fehler)
                    </summary>
                    <ul className="mt-1 max-h-24 list-inside list-disc overflow-y-auto rounded bg-red-50/50 p-1.5 dark:bg-red-950/20">
                      {summary.errors.map((jobError, index) => (
                        <li key={index}>{jobError}</li>
                      ))}
                    </ul>
                  </details>
                )}
            </div>
          ),
        )}
      </div>

      {/* Confirmation Modal for "Alle neu generieren" */}
      {confirmOpen === true && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-gray-900">
            <h3 className="mb-2 text-lg font-bold text-gray-900 dark:text-gray-100">
              Alle Rechnungen neu generieren?
            </h3>
            <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
              Möchten Sie wirklich ALLE Rechnungen neu generieren? Dies überschreibt bestehende PDFs
              und Rechnungsnummern unwiderruflich.
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={(): void => {
                  setConfirmOpen(false);
                }}
                disabled={loading === true}
                className="cursor-pointer rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                Abbrechen
              </button>
              <button
                type="button"
                onClick={(): void => {
                  void executeAction('regenerate-all');
                  setConfirmOpen(false);
                }}
                disabled={loading === true}
                className="cursor-pointer rounded-md bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-50"
              >
                Bestätigen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BillingListToolbar;
