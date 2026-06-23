import { authOptions } from '@/features/next-auth/utils/next-auth-config';
import NextAuth from 'next-auth';
import { cache } from 'react';

const nextAuth = NextAuth(authOptions);

export const { handlers, auth, signOut } = nextAuth;

/**
 * Request-scoped cached wrapper around NextAuth's `auth()` function.
 *
 * This function uses React's `cache()` to deduplicate session lookups within the lifecycle
 * of a single incoming request (Server Components, Route Handlers). Outside of a request lifecycle
 * (such as in tests or cron tasks), React's `cache` acts as a pass-through without global caching.
 */
export const getCachedSession = cache(async () => {
  return await auth();
});
