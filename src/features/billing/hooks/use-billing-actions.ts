'use client';

import React from 'react';

/** The per-registration actions that ask for confirmation before they run. */
export type BillingAction = 'regenerate' | 'send' | 'remove' | 'reminder' | 'sync';

/** What both the list row and the edit view know about the registration. */
export interface BillingActionsParticipant {
  id: string;
  billPdfs?: unknown[] | null | undefined;
  invoiceNumber?: string | null | undefined;
  status?: string | null | undefined;
}

const ACTION_REQUESTS: Record<BillingAction, { path: string; failureMessage: string }> = {
  send: {
    path: '/api/confidential/billing/send-single',
    failureMessage: 'Die Rechnung konnte nicht versendet werden.',
  },
  regenerate: {
    path: '/api/confidential/billing/regenerate-single',
    failureMessage: 'Die Rechnung konnte nicht neu generiert werden.',
  },
  sync: {
    path: '/api/confidential/billing/sync-single',
    failureMessage: 'Die Anmeldung konnte nicht abgeglichen werden.',
  },
  reminder: {
    path: '/api/confidential/billing/send-pflichtangaben-reminder',
    failureMessage: 'Die Erinnerung konnte nicht versendet werden.',
  },
  remove: {
    path: '/api/confidential/billing/remove-participant',
    failureMessage: 'Die Anmeldung konnte nicht storniert werden.',
  },
};

export interface BillingActions {
  hasPdf: boolean;
  canSendBill: boolean;
  canSendReminder: boolean;
  preview: () => void;
  download: () => void;
  /** Opens the confirmation for an action. */
  request: (action: BillingAction) => void;
  /** The action waiting for confirmation, if any. */
  pending: BillingAction | undefined;
  loading: boolean;
  error: string | undefined;
  removeReason: string;
  setRemoveReason: (reason: string) => void;
  cancel: () => void;
  confirm: () => Promise<void>;
}

/**
 * State and requests behind the billing actions of one registration, shared by the list row
 * menu and the actions panel of the edit view so both offer the same actions under the same
 * conditions.
 */
export const useBillingActions = (participant: BillingActionsParticipant): BillingActions => {
  const [pending, setPending] = React.useState<BillingAction | undefined>();
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | undefined>();
  const [removeReason, setRemoveReason] = React.useState('');

  const hasPdf = Array.isArray(participant.billPdfs) && participant.billPdfs.length > 0;
  // A paid or cancelled registration has no open bill to send.
  const canSendBill = hasPdf && participant.status !== 'paid' && participant.status !== 'removed';
  // Only a registration the sync parked as incomplete has anything to remind about.
  const canSendReminder = participant.status === 'pflichtangaben_missing';

  const pdfUrl = `/api/confidential/billing/preview-pdf?participantId=${encodeURIComponent(participant.id)}`;

  const preview = (): void => {
    window.open(pdfUrl, '_blank');
  };

  const download = (): void => {
    const link = document.createElement('a');
    link.href = `${pdfUrl}&download=true`;
    link.download = `Rechnung-${participant.invoiceNumber ?? 'Unbekannt'}.pdf`;
    document.body.append(link);
    link.click();
    link.remove();
  };

  const request = (action: BillingAction): void => {
    if (action === 'remove') setRemoveReason('');
    setError(undefined);
    setPending(action);
  };

  const cancel = (): void => {
    setPending(undefined);
    setError(undefined);
  };

  /**
   * Posts the pending action and reloads only if it actually worked.
   *
   * These used to `await fetch(...)` and then reload unconditionally, which made a 401 or a
   * 500 look exactly like success — the row came back unchanged and the operator was left
   * believing the mail had gone out. A rejected promise is not the failure mode that matters
   * here; a non-2xx response is.
   */
  const confirm = async (): Promise<void> => {
    if (pending === undefined) return;
    const { path, failureMessage } = ACTION_REQUESTS[pending];
    const extraBody = pending === 'remove' ? { reason: removeReason.trim() } : {};

    setLoading(true);
    setError(undefined);
    try {
      const response = await fetch(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participantId: participant.id, ...extraBody }),
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

      setPending(undefined);
      // A full reload, because the edit view's form state does not pick up a server-side
      // write from `router.refresh()`.
      globalThis.location.reload();
    } catch (error_) {
      setError(error_ instanceof Error ? error_.message : failureMessage);
    } finally {
      setLoading(false);
    }
  };

  return {
    hasPdf,
    canSendBill,
    canSendReminder,
    preview,
    download,
    request,
    pending,
    loading,
    error,
    removeReason,
    setRemoveReason,
    cancel,
    confirm,
  };
};
