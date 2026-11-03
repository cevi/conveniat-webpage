'use client';

import { useSession, type SessionContextValue } from 'next-auth/react';

/**
 * Whether the user is logged in, like `useSession().status`, but without the gap while a known
 * session is refreshed. next-auth reports `loading` for as long as `update()` runs, which is a
 * Cevi.DB round trip when the groups are reloaded, and everything that read it as "logged out"
 * blinked: switches turned off, rows disappeared, the dashboard fell back to its skeleton.
 * `loading` is left for the first load, when there is no session to go on yet.
 */
export const useAuthStatus = (): SessionContextValue['status'] => {
  const { data, status } = useSession();
  return data ? 'authenticated' : status;
};
