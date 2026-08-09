import { BlockedUserScreen } from '@/features/user-blocking/components/blocked-user-screen';
import { isUserBlocked } from '@/lib/user-blocking/is-user-blocked';
import type { Locale } from '@/types/types';
import { getCachedSession } from '@/utils/auth';
import type { ReactNode } from 'react';
import React from 'react';

/**
 * Renders the blocked notice instead of the app whenever the logged-in user has been
 * blocked by an administrator.
 *
 * The status is resolved from the database on every render instead of being read from
 * the (long-lived) session token, so blocking a user takes effect on their very next
 * navigation without waiting for the JWT to expire.
 */
export const BlockedUserGate: React.FC<{
  locale: Locale;
  children: ReactNode;
}> = async ({ locale, children }) => {
  const session = await getCachedSession();
  const userId = session?.user.uuid;

  if (await isUserBlocked(userId)) {
    return <BlockedUserScreen locale={locale} />;
  }

  return <>{children}</>;
};
