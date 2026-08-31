'use client';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import React from 'react';

interface RowData {
  id: string;
  billPdfs?: (string | { id: string })[];
  invoiceNumber?: string;
}

/**
 * Custom Payload CMS Cell component for per-row actions in bill-participants.
 * Renders a three-dots dropdown menu with Preview, Download, and Regenerate actions.
 */
export const BillingActionsCell: React.FC<{
  rowData: RowData;
}> = ({ rowData }) => {
  const [confirmAction, setConfirmAction] = React.useState<'regenerate' | 'send' | undefined>();
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | undefined>();

  const hasPdf = Array.isArray(rowData.billPdfs) && rowData.billPdfs.length > 0;

  const handlePreview = (): void => {
    window.open(
      `/api/confidential/billing/preview-pdf?participantId=${encodeURIComponent(rowData.id)}`,
      '_blank',
    );
  };

  const handleDownload = (): void => {
    const link = document.createElement('a');
    link.href = `/api/confidential/billing/preview-pdf?participantId=${encodeURIComponent(rowData.id)}&download=true`;
    link.download = `Rechnung-${rowData.invoiceNumber ?? 'Unbekannt'}.pdf`;
    document.body.append(link);
    link.click();
    link.remove();
  };

  /**
   * Posts one of the per-row billing actions and reloads only if it actually worked.
   *
   * Both of these used to `await fetch(...)` and then reload unconditionally, which made a
   * 401 or a 500 look exactly like success — the row came back unchanged and the operator
   * was left believing the mail had gone out. A rejected promise is not the failure mode
   * that matters here; a non-2xx response is.
   */
  const runAction = async (path: string, failureMessage: string): Promise<void> => {
    setLoading(true);
    setError(undefined);
    try {
      const response = await fetch(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participantId: rowData.id }),
      });
      const result = (await response.json().catch(() => ({}))) as {
        success?: boolean;
        error?: string;
        errors?: string[];
      };

      if (!response.ok || result.success !== true) {
        setError(result.error ?? result.errors?.[0] ?? failureMessage);
        return;
      }
      // The run reports per-participant problems in `errors` while still answering 200.
      if (result.errors !== undefined && result.errors.length > 0) {
        setError(result.errors[0] ?? failureMessage);
        return;
      }

      setConfirmAction(undefined);
      globalThis.location.reload();
    } catch (error_) {
      setError(error_ instanceof Error ? error_.message : failureMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleSendEmail = async (): Promise<void> => {
    await runAction(
      '/api/confidential/billing/send-single',
      'Die Rechnung konnte nicht versendet werden.',
    );
  };

  const busyLabel = confirmAction === 'send' ? 'Wird versendet...' : 'Wird generiert...';

  const handleRegenerate = async (): Promise<void> => {
    await runAction(
      '/api/confidential/billing/regenerate-single',
      'Die Rechnung konnte nicht neu generiert werden.',
    );
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="cursor-pointer border-none bg-transparent p-1 text-gray-500 hover:text-gray-700"
            title="Aktionen"
          >
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
              <path
                fillRule="evenodd"
                d="M12 5.25a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm0 8.25a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm0 8.25a1.5 1.5 0 110-3 1.5 1.5 0 010 3z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="w-48 border-gray-200 bg-white text-gray-900 shadow-lg dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
        >
          <DropdownMenuItem
            onClick={handlePreview}
            disabled={!hasPdf}
            className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            Vorschau
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={handleDownload}
            disabled={!hasPdf}
            className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            Download
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={(): void => {
              setConfirmAction('send');
            }}
            disabled={!hasPdf}
            className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            Email senden
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={(): void => {
              setConfirmAction('regenerate');
            }}
            className="cursor-pointer text-red-600 hover:bg-red-50 focus:bg-red-50 focus:text-red-700 dark:text-red-400 dark:hover:bg-red-900/30"
          >
            Neu generieren
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {confirmAction !== undefined && (
        <div className="fixed inset-0 z-9999 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-gray-900">
            <h3 className="mb-2 text-lg font-bold text-gray-900 dark:text-gray-100">
              {confirmAction === 'send' ? 'Rechnung versenden?' : 'Rechnung neu generieren?'}
            </h3>
            <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
              {confirmAction === 'send'
                ? 'Die Rechnung wird als E-Mail an die für die Rechnung hinterlegte Adresse ' +
                  'dieser Person versendet. Das lässt sich nicht rückgängig machen.'
                : 'Möchten Sie diese Rechnung wirklich neu generieren? Das bestehende PDF und die ' +
                  'Rechnungsnummer werden unwiderruflich überschrieben.'}
            </p>
            {error !== undefined && (
              <p className="mb-4 rounded border border-red-200 bg-red-50 p-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-200">
                {error}
              </p>
            )}
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={(): void => {
                  setConfirmAction(undefined);
                  setError(undefined);
                }}
                disabled={loading}
                className="cursor-pointer rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                Abbrechen
              </button>
              <button
                type="button"
                onClick={(): void => {
                  void (confirmAction === 'send' ? handleSendEmail() : handleRegenerate());
                }}
                disabled={loading}
                className="cursor-pointer rounded-md bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-50"
              >
                {loading ? busyLabel : 'Bestätigen'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default BillingActionsCell;
