'use client';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ConfirmationModal } from '@/features/payload-cms/payload-cms/components/shared/confirmation-modal';
import { resolveAdminLocale } from '@/features/payload-cms/payload-cms/components/shared/resolve-admin-locale';
import type { StaticTranslationString } from '@/types/types';
import { useLocale } from '@payloadcms/ui';
import React from 'react';

const regenerateTitle: StaticTranslationString = {
  de: 'Rechnung neu generieren?',
  en: 'Regenerate the bill?',
  fr: 'Régénérer la facture ?',
};

const regenerateMessage: StaticTranslationString = {
  de: 'Möchten Sie diese Rechnung wirklich neu generieren? Das bestehende PDF und die Rechnungsnummer werden unwiderruflich überschrieben.',
  en: 'Do you really want to regenerate this bill? The existing PDF and invoice number are irreversibly overwritten.',
  fr: 'Voulez-vous vraiment régénérer cette facture ? Le PDF et le numéro de facture existants seront écrasés définitivement.',
};

const regenerateConfirm: StaticTranslationString = {
  de: 'Neu generieren',
  en: 'Regenerate',
  fr: 'Régénérer',
};

const regeneratingLabel: StaticTranslationString = {
  de: 'Wird generiert...',
  en: 'Regenerating...',
  fr: 'Régénération...',
};

const sendTitle: StaticTranslationString = {
  de: 'Rechnung versenden?',
  en: 'Send the bill?',
  fr: 'Envoyer la facture ?',
};

const sendMessage: StaticTranslationString = {
  de: 'Die Rechnung wird als E-Mail an die für die Rechnung hinterlegte Adresse dieser Person versendet. Das lässt sich nicht rückgängig machen.',
  en: 'The bill is emailed to the invoice address on file for this person. This cannot be undone.',
  fr: "La facture sera envoyée par e-mail à l'adresse de facturation enregistrée. Cette action est irréversible.",
};

const sendConfirm: StaticTranslationString = {
  de: 'Versenden',
  en: 'Send',
  fr: 'Envoyer',
};

const sendingLabel: StaticTranslationString = {
  de: 'Wird versendet...',
  en: 'Sending...',
  fr: 'Envoi...',
};

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
  const { code } = useLocale();
  const locale = resolveAdminLocale(code);
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

  const isSend = confirmAction === 'send';
  const copy = {
    title: (isSend ? sendTitle : regenerateTitle)[locale],
    message: (isSend ? sendMessage : regenerateMessage)[locale],
    confirmLabel: (isSend ? sendConfirm : regenerateConfirm)[locale],
    submittingText: (isSend ? sendingLabel : regeneratingLabel)[locale],
  };

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

      {/*
        Rendered through the shared modal, which portals to `document.body`. An overlay
        written inline here cannot win on z-index at any value: Payload's table sets
        `isolation: isolate` on `.table` and `position: relative; z-index: 1` on every
        `th`/`td`, so the overlay was confined to its own cell's stacking context and any
        cell later in the document painted straight over it.
      */}
      <ConfirmationModal
        isOpen={confirmAction !== undefined}
        onClose={(): void => {
          setConfirmAction(undefined);
          setError(undefined);
        }}
        onConfirm={async (): Promise<void> => {
          await (isSend ? handleSendEmail() : handleRegenerate());
        }}
        title={copy.title}
        // The shared modal renders the body with `whitespace-pre-line`, so a failure is
        // appended as its own paragraph rather than needing a second slot.
        message={error === undefined ? copy.message : `${copy.message}\n\n⚠ ${error}`}
        confirmLabel={copy.confirmLabel}
        submittingText={copy.submittingText}
        isSubmitting={loading}
        locale={locale}
        confirmVariant="danger"
      />
    </>
  );
};

export default BillingActionsCell;
