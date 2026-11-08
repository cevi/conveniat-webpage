'use client';
import { useAuthStatus } from '@/hooks/use-auth-status';
import { useTRPC } from '@/trpc/client';

import { useQuery } from '@tanstack/react-query';

/**
 * Whether the signed-in user is a Leitende/r, who reads the part of a block for Leitende and the
 * story. Asks only once signed in, and false until the answer is known; the answer stays in the
 * persisted cache, so the ways in show offline too.
 *
 * @param enabled - whether anything on the page depends on it
 */
export const useLeaderAccess = (enabled: boolean): boolean => {
  const trpc = useTRPC();
  const signedIn = useAuthStatus() === 'authenticated';
  const { data } = useQuery(
    trpc.schedule.getLeaderAccess.queryOptions(undefined, { enabled: enabled && signedIn }),
  );
  return enabled && signedIn && data === true;
};
