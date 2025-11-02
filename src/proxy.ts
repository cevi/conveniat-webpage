import { middlewareChain } from '@/middleware/middleware-chain';
import { withAbortOnInfiniteRedirects } from '@/middleware/with-abort-on-infinite-redirects';
import { withAppFeatureMiddleware } from '@/middleware/with-app-feature-middleware';
import { withAuthenticationRedirect } from '@/middleware/with-authentication-redirect';
import { withI18nMiddleware } from '@/middleware/with-i18n-middleware';
import { withPreviewMiddleware } from '@/middleware/with-preview-middleware';

/**
 * Middlewares are applied in a chain.
 *
 * The order of the middlewares is important! Each middleware
 * either returns a response or calls the next middleware in the chain.
 *
 */
export const proxy = middlewareChain([
  withI18nMiddleware,
  withAbortOnInfiniteRedirects,
  withAppFeatureMiddleware,
  withPreviewMiddleware,
  withAuthenticationRedirect,
]);

// we apply the middleware to all routes
export const config = {
  // exclude _next routes
  matcher: ['/((?!_next).*)'],
};
