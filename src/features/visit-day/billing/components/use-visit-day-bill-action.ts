'use client';

import type { VisitDayBillAction } from '@/features/visit-day/billing/visit-day-bill-endpoints';
import { useDocumentInfo } from '@payloadcms/ui';
import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';

/**
 * Runs one action of a Besuchstag bill on the server and reloads the view, so its status, its
 * history and its new bill show at once.
 */
export const useVisitDayBillAction = (): {
  isRunning: boolean;
  error: string | undefined;
  run: (action: VisitDayBillAction) => Promise<boolean>;
  clearError: () => void;
} => {
  const { id } = useDocumentInfo();
  const router = useRouter();
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const run = useCallback(
    async (action: VisitDayBillAction): Promise<boolean> => {
      if (id === undefined) return false;
      setIsRunning(true);
      setError(undefined);
      try {
        const response = await fetch(`/api/visit-day-bills/${String(id)}/action`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(action),
        });
        const body = (await response.json()) as { success?: boolean; error?: string };
        if (body.success !== true) {
          setError(body.error ?? `HTTP ${String(response.status)}`);
          return false;
        }
        router.refresh();
        return true;
      } catch (actionError) {
        setError(actionError instanceof Error ? actionError.message : String(actionError));
        return false;
      } finally {
        setIsRunning(false);
      }
    },
    [id, router],
  );

  return { isRunning, error, run, clearError: useCallback(() => setError(undefined), []) };
};
