'use client';

import { documentControlButtonClasses } from '@/features/payload-cms/payload-cms/components/shared/document-control-button-styles';
import { Button } from '@payloadcms/ui';
import { Download, FilePlus, RefreshCcw, RefreshCw, Send } from 'lucide-react';
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
  sentCount?: number;
  failedCount?: number;
  errors?: string[];
}

const handleCsvExport = (): void => {
  window.open('/api/confidential/billing/export-csv', '_blank');
};

/**
 * Toolbar component rendered above the bill-participants list table.
 * Provides bulk actions: Sync, Generate, Send, CSV export, and Regenerate all.
 */
export const BillingListToolbar: React.FC = () => {
  const [loading, setLoading] = React.useState(false);
  const [actionType, setActionType] = React.useState('');
  const [actionResult, setActionResult] = React.useState<ActionResult | undefined>();
  const [confirmOpen, setConfirmOpen] = React.useState(false);

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

  return (
    <div className="mb-4">
      {/* Action Bar */}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          buttonStyle="transparent"
          className={documentControlButtonClasses.neutral()}
          size="medium"
          disabled={loading && actionType === 'sync'}
          onClick={(event): void => {
            event.preventDefault();
            void executeAction('sync');
          }}
        >
          <RefreshCcw
            className={`mr-2 h-4 w-4 ${loading && actionType === 'sync' ? 'animate-spin' : ''}`}
          />
          <span className="truncate">Synchronisieren</span>
        </Button>
        <Button
          buttonStyle="transparent"
          className={documentControlButtonClasses.neutral()}
          size="medium"
          disabled={loading && actionType === 'generate'}
          onClick={(event): void => {
            event.preventDefault();
            void executeAction('generate');
          }}
        >
          <FilePlus
            className={`mr-2 h-4 w-4 ${loading && actionType === 'generate' ? 'animate-spin' : ''}`}
          />
          <span className="truncate">Generieren</span>
        </Button>
        <Button
          buttonStyle="transparent"
          className={documentControlButtonClasses.publish()}
          size="medium"
          disabled={loading && actionType === 'send'}
          onClick={(event): void => {
            event.preventDefault();
            void executeAction('send');
          }}
        >
          <Send
            className={`mr-2 h-4 w-4 ${loading && actionType === 'send' ? 'animate-spin' : ''}`}
          />
          <span className="truncate">Senden</span>
        </Button>
        <Button
          buttonStyle="transparent"
          className={documentControlButtonClasses.neutral()}
          size="medium"
          onClick={(event): void => {
            event.preventDefault();
            handleCsvExport();
          }}
        >
          <Download className="mr-2 h-4 w-4" />
          <span className="truncate">CSV</span>
        </Button>
        <Button
          buttonStyle="transparent"
          className={documentControlButtonClasses.unpublish()}
          size="medium"
          disabled={loading && actionType === 'regenerate-all'}
          onClick={(event): void => {
            event.preventDefault();
            setConfirmOpen(true);
          }}
        >
          <RefreshCw
            className={`mr-2 h-4 w-4 ${loading && actionType === 'regenerate-all' ? 'animate-spin' : ''}`}
          />
          <span className="truncate">Alle neu generieren</span>
        </Button>
      </div>

      {/* Action Result Banner */}
      {actionResult !== undefined && (
        <div
          className={`mt-3 rounded-lg border p-3 text-sm ${
            actionResult.success
              ? 'border-green-300 bg-green-50 text-green-900'
              : 'border-red-300 bg-red-50 text-red-900'
          }`}
        >
          {actionResult.success ? (
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

      {/* Confirmation Modal for "Alle neu generieren" */}
      {confirmOpen && (
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
                disabled={loading}
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
                disabled={loading}
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
