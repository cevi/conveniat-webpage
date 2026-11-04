'use client';

import type { BankImport } from '@/features/payload-cms/payload-types';
import { useCallback, useEffect, useState } from 'react';

/** Where the bank imports stand, for the line above the payments. */
export type BankImportState =
  | { status: 'loading' }
  | { status: 'failed' }
  | { status: 'none' }
  | {
      status: 'loaded';
      /** the import done last */
      last: BankImport;
      /**
       * The import whose bank data reach furthest. Not always the last one: an older file can
       * be imported after a newer one, and the bank data reach as far as the newest of them.
       */
      newestData: BankImport;
    };

const latest = async (sort: string): Promise<BankImport | undefined> => {
  const response = await fetch(`/api/bank-imports?sort=${sort}&limit=1&depth=0`);
  if (!response.ok) throw new Error(`HTTP ${String(response.status)}`);
  const body = (await response.json()) as { docs: BankImport[] };
  return body.docs[0];
};

/** Loads the last bank import and the newest bank data, again after `reload`. */
export const useLastBankImport = (): { state: BankImportState; reload: () => void } => {
  const [state, setState] = useState<BankImportState>({ status: 'loading' });
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([latest('-createdAt'), latest('-bankExportedAt')])
      .then(([last, newestData]): BankImportState =>
        last === undefined || newestData === undefined
          ? { status: 'none' }
          : { status: 'loaded', last, newestData },
      )
      .catch((): BankImportState => ({ status: 'failed' }))
      .then((next) => {
        if (!cancelled) setState(next);
      });
    return (): void => {
      cancelled = true;
    };
  }, [version]);

  return { state, reload: useCallback(() => setVersion((previous) => previous + 1), []) };
};
