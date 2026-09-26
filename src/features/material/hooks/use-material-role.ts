'use client';

import { materialQueryOptions } from '@/features/material/hooks/use-material';
import { trpc } from '@/trpc/client';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export type MaterialRole = 'team' | 'participant';

/**
 * Whether the reader runs the depot, as the server decides it in `getMe`; `undefined` while
 * that is not known yet. The same answer the server's procedures check, so a screen and its
 * data never disagree.
 */
export const useMaterialRole = (): MaterialRole | undefined => {
  const me = trpc.material.getMe.useQuery(undefined, materialQueryOptions);
  if (me.data === undefined) return undefined;
  return me.data.isMaterialTeam ? 'team' : 'participant';
};

/**
 * Keeps a screen to one role: the other one is sent to `elsewhere`, the page that serves them,
 * such as a participant who scanned an article label to the catalogue. Answers whether the
 * screen may render; the server refuses the data anyway.
 */
export const useRoleRoute = (role: MaterialRole, elsewhere: string): boolean => {
  const current = useMaterialRole();
  const router = useRouter();
  const mismatch = current !== undefined && current !== role;
  useEffect(() => {
    if (mismatch) router.replace(elsewhere);
  }, [mismatch, router, elsewhere]);
  return current === role;
};
