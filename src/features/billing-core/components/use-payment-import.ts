'use client';

import type { BankImportSummary } from '@/features/billing-core/bank-import';
import { decodeCsvBytes } from '@/features/billing-core/payment-csv';
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
  result: BankImportSummary | undefined;
  importFile: (file: File) => Promise<boolean>;
  clearError: () => void;
  clearResult: () => void;
} => {
  const { query, refineListData } = useListQuery();
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [result, setResult] = useState<BankImportSummary | undefined>();

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
        const body = (await response.json()) as Partial<BankImportSummary> & {
          success?: boolean;
          error?: string;
        };
        if (body.success !== true) {
          setError(body.error ?? `HTTP ${String(response.status)}`);
          return false;
        }

        setResult({
          sides: (Array.isArray(body.sides) ? body.sides : []).map((side) => ({
            key: side.key,
            label: side.label,
            summary: {
              totalCount: side.summary.totalCount,
              bookedCount: side.summary.bookedCount,
              alreadyBookedCount: side.summary.alreadyBookedCount,
              errors: Array.isArray(side.summary.errors) ? side.summary.errors.map(String) : [],
              outcomes: side.summary.outcomes,
            },
          })),
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
