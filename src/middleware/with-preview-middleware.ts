import type { ChainedMiddleware } from '@/middleware/middleware-chain';
import { NextResponse } from 'next/server';

/**
 * Middleware to handle the preview cookie
 * @param nextMiddleware
 */
export const withPreviewMiddleware = (nextMiddleware: ChainedMiddleware): ChainedMiddleware => {
  return (request, event, response) => {
    // initialize response if not already set
    response ??= NextResponse.next();
    if (request.nextUrl.pathname.startsWith('/admin') && !request.cookies.has('preview')) {
      response.cookies.set('preview', 'true');
    }

    return nextMiddleware(request, event, response);
  };
};
