'use client';

import { decodeCsvBytes } from '@/features/billing/services/payment-csv';
import type { PaymentImportSummary } from '@/features/billing/services/payment-import';
import { useListQuery } from '@payloadcms/ui';
import { useCallback, useState } from 'react';

/**
 * Sends a bank CSV to the payment import and keeps what it reported.
 *
 * The file is decoded here rather than on the server because its encoding depends on what
 * last saved it, and only the bytes can tell. The list is reloaded afterwards, because the
 * booked rows now read "Bezahlt".
 */
export const usePaymentImport = (): {
  isImporting: boolean;
  /** Why the file was refused, while the dialog is still open. */
  error: string | undefined;
  /** What the last import booked and what it left for the finance team. */
  result: PaymentImportSummary | undefined;
  importFile: (file: File) => Promise<boolean>;
  clearError: () => void;
  clearResult: () => void;
} => {
  const { query, refineListData } = useListQuery();
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [result, setResult] = useState<PaymentImportSummary | undefined>();

  const importFile = useCallback(
    async (file: File): Promise<boolean> => {
      setIsImporting(true);
      setError(undefined);
      try {
        const csv = decodeCsvBytes(new Uint8Array(await file.arrayBuffer()));
        const response = await fetch('/api/confidential/billing/import-payments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ csv }),
        });
        const body = (await response.json()) as Partial<PaymentImportSummary> & {
          success?: boolean;
          error?: string;
        };
        if (body.success !== true) {
          setError(body.error ?? `HTTP ${String(response.status)}`);
          return false;
        }

        setResult({
          totalCount: body.totalCount ?? 0,
          bookedCount: body.bookedCount ?? 0,
          alreadyBookedCount: body.alreadyBookedCount ?? 0,
          errors: Array.isArray(body.errors) ? body.errors.map(String) : [],
          outcomes: body.outcomes ?? {},
        });
        await refineListData(query);
        return true;
      } catch (importError) {
        setError(importError instanceof Error ? importError.message : String(importError));
        return false;
      } finally {
        setIsImporting(false);
      }
    },
    [query, refineListData],
  );

  return {
    isImporting,
    error,
    result,
    importFile,
    clearError: useCallback(() => setError(undefined), []),
    clearResult: useCallback(() => setResult(undefined), []),
  };
};
