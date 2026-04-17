import 'server-only';

import { canUserAccessAdminPanel } from '@/features/payload-cms/payload-cms/access-rules/can-access-admin-panel';
import { auth } from '@/utils/auth';
import { isValidNextAuthUser } from '@/utils/auth-helpers';
import { cache } from 'react';

/**
 * Request-memoized check for whether the current user is an authenticated admin.
 *
 * Replaces the global `draftMode()` check that was previously used to gate
 * preview features. Unlike `draftMode()`, this does NOT set the global
 * `__prerender_bypass` cookie and therefore does not bust the Next.js cache
 * for the entire session.
 *
 * Safe to call from any server component — React `cache()` ensures the
 * underlying `auth()` call is deduplicated within a single request.
 */
export const isAdminSession = cache(async (): Promise<boolean> => {
  const session = await auth();
  if (!session) return false;

  const user = session.user;
  if (!isValidNextAuthUser(user)) return false;

  return canUserAccessAdminPanel({ user });
});
