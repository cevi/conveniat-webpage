import { middlewareChain } from '@/middleware/middleware-chain';
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
export const middleware = middlewareChain([
  withAppFeatureMiddleware,
  withPreviewMiddleware,
  withAuthenticationRedirect,
  withI18nMiddleware, // must be the last middleware in the chain
]);

// we apply the middleware to all routes
export const config = {
  matcher: ['/((?!_next).*)'], // exclude _next routes
};
