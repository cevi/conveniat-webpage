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
  billPdfPath?: string;
  invoiceNumber?: string;
}

/**
 * Custom Payload CMS Cell component for per-row actions in bill-participants.
 * Renders a three-dots dropdown menu with Preview, Download, and Regenerate actions.
 */
export const BillingActionsCell: React.FC<{
  rowData: RowData;
}> = ({ rowData }) => {
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  const hasPdf = Boolean(rowData.billPdfPath);

  const handlePreview = (): void => {
    window.open(
      `/api/billing/preview-pdf?participantId=${encodeURIComponent(rowData.id)}`,
      '_blank',
    );
  };

  const handleDownload = (): void => {
    const link = document.createElement('a');
    link.href = `/api/billing/preview-pdf?participantId=${encodeURIComponent(rowData.id)}&download=true`;
    link.download = `Rechnung-${rowData.invoiceNumber ?? 'Unbekannt'}.pdf`;
    document.body.append(link);
    link.click();
    link.remove();
  };

  const handleSendEmail = async (): Promise<void> => {
    setLoading(true);
    try {
      await fetch('/api/billing/send-single', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participantId: rowData.id }),
      });
      globalThis.location.reload();
    } catch (error) {
      console.error('Failed to send email:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerate = async (): Promise<void> => {
    setLoading(true);
    try {
      await fetch('/api/billing/regenerate-single', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participantId: rowData.id }),
      });
      globalThis.location.reload();
    } catch (error) {
      console.error('Failed to regenerate bill:', error);
    } finally {
      setLoading(false);
      setConfirmOpen(false);
    }
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
              void handleSendEmail();
            }}
            disabled={!hasPdf}
            className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            Email senden
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={(): void => {
              setConfirmOpen(true);
            }}
            className="cursor-pointer text-red-600 hover:bg-red-50 focus:bg-red-50 focus:text-red-700 dark:text-red-400 dark:hover:bg-red-900/30"
          >
            Neu generieren
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Inline Confirmation Modal */}
      {confirmOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-gray-900">
            <h3 className="mb-2 text-lg font-bold text-gray-900 dark:text-gray-100">
              Rechnung neu generieren?
            </h3>
            <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
              Möchten Sie diese Rechnung wirklich neu generieren? Das bestehende PDF und die
              Rechnungsnummer werden unwiderruflich überschrieben.
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
                  void handleRegenerate();
                }}
                disabled={loading}
                className="cursor-pointer rounded-md bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-50"
              >
                {loading ? 'Wird generiert...' : 'Bestätigen'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default BillingActionsCell;
