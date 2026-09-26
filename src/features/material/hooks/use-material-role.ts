'use client';

import { materialQueryOptions } from '@/features/material/hooks/use-material';
import type { MaterialQueryErrorLike } from '@/features/material/utils/query-errors';
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
  return roleOf(me.data);
};

const roleOf = (me: { isMaterialTeam: boolean } | undefined): MaterialRole | undefined => {
  if (me === undefined) return undefined;
  return me.isMaterialTeam ? 'team' : 'participant';
};

/**
 * Keeps a screen to one role: the other one is sent to `elsewhere`, the page that serves them,
 * such as a participant who scanned an article label to the catalogue. Answers whether the
 * screen may render, and the error when the role could not be found out at all, for example
 * offline without a cached answer; the server refuses the data anyway.
 */
export const useRoleRoute = (
  role: MaterialRole,
  elsewhere: string,
): { allowed: boolean; error: MaterialQueryErrorLike | undefined } => {
  const me = trpc.material.getMe.useQuery(undefined, materialQueryOptions);
  const current = roleOf(me.data);
  const router = useRouter();
  const mismatch = current !== undefined && current !== role;
  useEffect(() => {
    if (mismatch) router.replace(elsewhere);
  }, [mismatch, router, elsewhere]);
  return {
    allowed: current === role,
    error: current === undefined ? (me.error ?? undefined) : undefined,
  };
};
