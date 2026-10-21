import { authOptions } from '@/features/next-auth/utils/next-auth-config';
import NextAuth from 'next-auth';
import { cookies } from 'next/headers';
import { cache } from 'react';

const nextAuth = NextAuth(authOptions);

export const { handlers, signOut } = nextAuth;

/** The session cookie in one piece or as one of its chunks, with or without `__Secure-`. */
const SESSION_TOKEN_COOKIE = /session-token(\.\d+)?$/;

const hasSessionTokenCookie = async (): Promise<boolean> => {
  const cookieStore = await cookies();
  return cookieStore.getAll().some(({ name }) => SESSION_TOKEN_COOKIE.test(name));
};

/**
 * NextAuth's `auth()`, except that a request without a session cookie is answered with `null`
 * without asking Auth.js.
 *
 * Auth.js answers a server-side session check like any request to its endpoint, and mints a CSRF
 * token with `crypto.getRandomValues()` when the request carries no CSRF cookie. A Server Component
 * cannot set that cookie, so the token is thrown away, and with `cacheComponents` and
 * `partialPrefetching` the random read aborts the render's runtime stage with "encountered the
 * unstable value `crypto.getRandomValues()`". The main menu asks on every page whether the
 * visitor is an editor, and cookie-less requests, mostly bots on `/[...not-found]`, logged about
 * 600 of these a week in production. Without a session cookie the answer is `null` anyway.
 *
 * The middleware form, `auth(request, event)` in the proxy, goes to Auth.js unchanged: it can set
 * the CSRF cookie, and it does.
 */
export const auth = ((...arguments_: unknown[]) => {
  if (arguments_.length > 0) {
    return (nextAuth.auth as (...forwarded: unknown[]) => unknown)(...arguments_);
  }
  // eslint-disable-next-line unicorn/no-null -- `null` is what Auth.js answers for no session
  return hasSessionTokenCookie().then((hasSession) => (hasSession ? nextAuth.auth() : null));
}) as typeof nextAuth.auth;

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
