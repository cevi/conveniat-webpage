'use client';

import { useCallback, useEffect, useState } from 'react';

export interface VisitDayBillSummary {
  total: number;
  open: number;
  openAmount: number;
  paid: number;
  paidAmount: number;
  cancelled: number;
  mailFailed: number;
  refundDue: number;
}

/** The counts above the Besuchstag bills, read once and again after an action. */
export const useVisitDayBillSummary = (): {
  summary: VisitDayBillSummary | undefined;
  reload: () => Promise<void>;
} => {
  const [summary, setSummary] = useState<VisitDayBillSummary | undefined>();
  const reload = useCallback(async (): Promise<void> => {
    try {
      const response = await fetch('/api/visit-day-bills/summary');
      if (response.ok) setSummary((await response.json()) as VisitDayBillSummary);
    } catch {
      // the counts are a convenience; the list below is what is true
    }
  }, []);
  useEffect(() => {
    let current = true;
    fetch('/api/visit-day-bills/summary')
      .then(async (response) =>
        response.ok ? ((await response.json()) as VisitDayBillSummary) : undefined,
      )
      .then((loaded) => {
        if (current && loaded !== undefined) setSummary(loaded);
      })
      .catch(() => {
        // the counts are a convenience; the list below is what is true
      });
    return (): void => {
      current = false;
    };
  }, []);
  return { summary, reload };
};
