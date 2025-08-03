import type { ChainedMiddleware } from '@/middleware/middleware-chain';
import { NextResponse } from 'next/server';

const routesWithAuth = [
  '/app/chat',
  '/app/department-helper-portal',
  '/app/helper-portal',
  '/app/schedule',
];

/**
 * Middleware which redirect the user to the /login page if the user is not authenticated.
 * This is NOT a security measure, but a convenience for the user.
 *
 * This middleware is applied to all routes except the ones defined in `i18nExcludedRoutes`.
 *
 * If the user visits the /login page and is already authenticated,
 * they will be redirected to the /dashboard page.
 *
 *
 * @param nextMiddleware
 */
export const withAuthenticationRedirect = (
  nextMiddleware: ChainedMiddleware,
): ChainedMiddleware => {
  return (request, event, response) => {
    const { pathname } = request.nextUrl;

    // --- 1. Determine Authentication Status ---
    // This is an example. You need to replace this with your actual authentication check.
    // This could involve checking a cookie, a JWT, a session, etc.
    const isAuthenticated = request.cookies.has('authjs.session-token');

    // --- 2. Handle redirection for authenticated users on /login page ---
    if (pathname === '/login' && isAuthenticated) {
      const url = request.nextUrl.clone();
      const redirectTo = url.searchParams.get('redirect-back-to');

      if (redirectTo == undefined) {
        // If redirect-back-to does not exist, fallback to dashboard
        url.pathname = '/app/dashboard';
        return NextResponse.redirect(url);
      } else {
        // If redirect-back-to exists, try to redirect there
        try {
          // Construct a new URL object from the redirectTo string to ensure it's a valid URL
          // Use request.nextUrl.origin to ensure the redirect URL is absolute
          const redirectUrl = new URL(redirectTo, request.nextUrl.origin);
          return NextResponse.redirect(redirectUrl);
        } catch (error) {
          // If redirectTo is not a valid URL (e.g., malformed),
          // log an error and fall back to dashboard
          console.error('Invalid redirect-back-to URL:', redirectTo, error);
          url.pathname = '/app/dashboard';
          return NextResponse.redirect(url);
        }
      }
    }

    // --- 3. Handle redirection for unauthenticated users ONLY if visiting a page with auth ---
    const requiresAuth = routesWithAuth.some((route) => pathname.startsWith(route));

    if (!isAuthenticated && requiresAuth) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      // Add the current path as a query parameter for redirection after login
      url.searchParams.set('redirect-back-to', request.nextUrl.pathname + request.nextUrl.search);
      return NextResponse.redirect(url);
    }

    // If no redirection is needed, continue to the next middleware
    return nextMiddleware(request, event, response);
  };
};
