import type { ChainedMiddleware } from '@/middleware/middleware-chain';
import { NextResponse } from 'next/server';

/**
 * Middleware to handle aborting requests that have too many redirects.
 *
 * Useful to prevent infinite redirect loops by tracking the number of redirects
 * and the history of URLs that have been redirected to.
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

      // update url history by appending the current request URL
      const urlHistory = request.headers.get('x-url-history') ?? '';
      response.headers.set(
        'x-url-history',
        `${urlHistory}${urlHistory === '' ? '' : ','}${request.url}`,
      );

      // if the redirect count exceeds 5, we abort the request
      if (newRedirectCount > 5) {
        console.error(
          `Aborting request due to too many redirects: ${request.headers.get('x-request-id')}.
          With the following history: ${response.headers.get('x-url-history')}`,
        );

        return NextResponse.json({ error: 'Too many redirects' }, { status: 500 });
      }
    } else {
      const uniqueRequestId = crypto.randomUUID();
      response.headers.set('x-request-redirect-count', uniqueRequestId);
      response.headers.set('x-request-id', uniqueRequestId);
      response.headers.set('x-url-history', request.url);
    }

    return nextMiddleware(request, event, response);
  };
};
