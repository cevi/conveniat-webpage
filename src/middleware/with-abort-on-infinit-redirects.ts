import type { ChainedMiddleware } from '@/middleware/middleware-chain';
import { NextResponse } from 'next/server';

/**
 * Middleware to handle aborting requests that have too many redirects.
 *
 * @param nextMiddleware
 */
export const withAbortOnInfinitRedirects = (
  nextMiddleware: ChainedMiddleware,
): ChainedMiddleware => {
  return (request, event, response) => {
    // initialize response if not already set
    response ??= NextResponse.next();

    // set unique request ID for debugging
    if (request.headers.has('x-request-id')) {
      // increment the redirect count if it exists
      const redirectCount = request.headers.get('x-request-redirect-count') ?? undefined;
      const newRedirectCount =
        redirectCount == undefined ? 1 : Number.parseInt(redirectCount, 10) + 1;
      response.headers.set('x-request-redirect-count', newRedirectCount.toString());
      request.headers.set('x-request-redirect-count', newRedirectCount.toString());

      // if the redirect count exceeds 5, we abort the request
      if (newRedirectCount > 5) {
        console.error(
          `Aborting request due to too many redirects: ${request.headers.get('x-request-id')}. URL: ${request.url} Method: ${request.method} Redirect Count: ${newRedirectCount}`,
        );

        return NextResponse.json({ error: 'Too many redirects' }, { status: 500 });
      }
    } else {
      const uniqueRequestId = crypto.randomUUID();
      response.headers.set('x-request-redirect-count', String(0));
      response.headers.set('x-request-id', uniqueRequestId);
      request.headers.set('x-request-redirect-count', String(0));
      request.headers.set('x-request-id', uniqueRequestId);
    }

    return nextMiddleware(request, event, response);
  };
};
